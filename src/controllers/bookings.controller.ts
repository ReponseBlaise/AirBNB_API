import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { sendBookingConfirmation } from '../utils/emailService.js';

const uid = (req: Request) => (req as any).userId;
const nights = (checkIn: Date, checkOut: Date) => Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);

const calcPricing = (listing: any, numberOfNights: number) => {
  const nightlyRate = listing.basePricePerNight;
  const cleaningFee = listing.cleaningFee || 0;
  const subtotal = nightlyRate * numberOfNights;
  const serviceFeeGuest = subtotal * (listing.serviceFeeGuest || 0.15);
  const tax = (subtotal + serviceFeeGuest) * 0.1;
  return { nightlyRate, cleaningFee, subtotal, serviceFeeGuest, tax, totalCostGuest: subtotal + cleaningFee + serviceFeeGuest + tax, hostPayout: subtotal - subtotal * (listing.serviceFeeHost || 0.03) };
};

const blockCalendar = (listingId: string, checkIn: Date, numberOfNights: number, available: boolean) =>
  Promise.all(Array.from({ length: numberOfNights }, (_, i) => {
    const date = new Date(checkIn);
    date.setDate(date.getDate() + i);
    return prisma.listingAvailability.upsert({
      where: { listingId_date: { listingId, date } },
      create: { listingId, date, isAvailable: available, ...(available ? {} : { blockReason: 'booking' }) },
      update: { isAvailable: available, blockReason: available ? null : 'booking' },
    });
  }));

export const instantBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guestId = uid(req);
    const { listingId, checkInDate, checkOutDate, numberOfGuests } = req.body;
    if (!listingId || !checkInDate || !checkOutDate) return res.status(400).json({ error: 'Missing required fields' });

    const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: { host: true } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (!listing.instantBook) return res.status(400).json({ error: 'Listing does not allow instant booking' });

    const checkIn = new Date(checkInDate), checkOut = new Date(checkOutDate);
    const numberOfNights = nights(checkIn, checkOut);

    const unavailable = await prisma.listingAvailability.findMany({ where: { listingId, date: { gte: checkIn, lt: checkOut }, isAvailable: false } });
    if (unavailable.length > 0) return res.status(400).json({ error: 'Dates are not available' });

    const { nightlyRate, cleaningFee, subtotal, serviceFeeGuest, tax, totalCostGuest, hostPayout } = calcPricing(listing, numberOfNights);

    const booking = await prisma.booking.create({
      data: {
        listingId, guestId, hostId: listing.hostId, checkInDate: checkIn, checkOutDate: checkOut,
        numberOfGuests: numberOfGuests || 1, numberOfNights, status: 'CONFIRMED', instantBook: true,
        nightlyRate, cleaningFee, serviceFeeGuest, tax, subtotalBeforeFees: subtotal, totalCostGuest,
        totalPayoutHost: hostPayout, payoutDate: new Date(checkIn.getTime() + 86400000),
        cancellationPolicy: listing.cancellationPolicy, paymentStatus: 'AUTHORIZED',
      },
    });

    await blockCalendar(listingId, checkIn, numberOfNights, false);

    const guest = await prisma.user.findUnique({ where: { id: guestId }, select: { email: true, name: true } });
    sendBookingConfirmation(guest?.email || '', booking.id, guest?.name || 'Guest').catch(e => console.error('Email error:', e));

    res.status(201).json(booking);
  } catch (e) { next(e); }
};

export const requestBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guestId = uid(req);
    const { listingId, checkInDate, checkOutDate, numberOfGuests } = req.body;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const checkIn = new Date(checkInDate), checkOut = new Date(checkOutDate);
    const numberOfNights = nights(checkIn, checkOut);
    const { nightlyRate, cleaningFee, subtotal, serviceFeeGuest, tax, totalCostGuest, hostPayout } = calcPricing(listing, numberOfNights);

    const booking = await prisma.booking.create({
      data: {
        listingId, guestId, hostId: listing.hostId, checkInDate: checkIn, checkOutDate: checkOut,
        numberOfGuests: numberOfGuests || 1, numberOfNights, status: 'PENDING_APPROVAL', instantBook: false,
        nightlyRate, cleaningFee, serviceFeeGuest, tax, subtotalBeforeFees: subtotal, totalCostGuest,
        totalPayoutHost: hostPayout, cancellationPolicy: listing.cancellationPolicy, paymentStatus: 'PENDING',
      },
    });
    res.status(201).json(booking);
  } catch (e) { next(e); }
};

export const approveBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { listing: true, guest: true } });
    if (!booking || booking.hostId !== uid(req)) return res.status(403).json({ error: 'Not authorized' });
    if (booking.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'Booking cannot be approved in current status' });

    const updated = await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CONFIRMED', paymentStatus: 'AUTHORIZED' } });
    await blockCalendar(booking.listingId, new Date(booking.checkInDate), booking.numberOfNights, false);
    res.json({ message: 'Booking approved', booking: updated });
  } catch (e) { next(e); }
};

export const declineBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.hostId !== uid(req)) return res.status(403).json({ error: 'Not authorized' });

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: 'host', cancellationReason: req.body.reason },
    });
    res.json({ message: 'Booking declined', booking: updated });
  } catch (e) { next(e); }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    const { bookingId } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { listing: true } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.guestId !== userId && booking.hostId !== userId) return res.status(403).json({ error: 'Not authorized' });

    const daysUntilCheckIn = Math.ceil((booking.checkInDate.getTime() - Date.now()) / 86400000);
    let refundAmount = 0;
    switch (booking.cancellationPolicy) {
      case 'FLEXIBLE':    if (daysUntilCheckIn >= 1) refundAmount = booking.totalCostGuest; break;
      case 'MODERATE':    refundAmount = daysUntilCheckIn >= 7 ? booking.totalCostGuest : daysUntilCheckIn >= 1 ? booking.totalCostGuest * 0.5 : 0; break;
      case 'STRICT':      refundAmount = daysUntilCheckIn >= 14 ? booking.totalCostGuest : daysUntilCheckIn >= 3 ? booking.totalCostGuest * 0.5 : 0; break;
      case 'NON_REFUNDABLE': refundAmount = 0; break;
      default:            refundAmount = booking.totalCostGuest;
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: booking.guestId === userId ? 'guest' : 'host', cancellationReason: req.body.reason, refundAmount },
    });
    await blockCalendar(booking.listingId, new Date(booking.checkInDate), booking.numberOfNights, true);
    res.json({ message: 'Booking cancelled', refundAmount, booking: updated });
  } catch (e) { next(e); }
};

export const getBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: {
        guest: { select: { id: true, name: true, avatar: true, email: true } },
        host: { select: { id: true, name: true, avatar: true } },
        listing: { select: { id: true, title: true, address: true } },
      },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.guestId !== userId && booking.hostId !== userId) return res.status(403).json({ error: 'Not authorized' });
    res.json(booking);
  } catch (e) { next(e); }
};

export const getBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    const { type = 'guest', status } = req.query;
    const where: any = { [type === 'host' ? 'hostId' : 'guestId']: userId, ...(status && { status }) };
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        listing: { select: { id: true, title: true, address: true } },
        guest: { select: { id: true, name: true, avatar: true } },
        host: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bookings);
  } catch (e) { next(e); }
};

export const checkIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
    if (!booking || (booking.guestId !== userId && booking.hostId !== userId)) return res.status(403).json({ error: 'Not authorized' });
    res.json(await prisma.booking.update({ where: { id: req.params.bookingId }, data: { status: 'CHECKED_IN', checkedInAt: new Date(), paymentStatus: 'CAPTURED' } }));
  } catch (e) { next(e); }
};

export const checkOut = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
    if (!booking || (booking.guestId !== userId && booking.hostId !== userId)) return res.status(403).json({ error: 'Not authorized' });
    res.json(await prisma.booking.update({ where: { id: req.params.bookingId }, data: { status: 'CHECKED_OUT', checkedOutAt: new Date() } }));
  } catch (e) { next(e); }
};
