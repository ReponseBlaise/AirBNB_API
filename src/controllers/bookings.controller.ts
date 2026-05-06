import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendBookingConfirmation } from '../utils/emailService';

const BOOKING_REQUEST_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * @route   POST /api/v1/bookings/instant-book
 * @desc    Instantly book a listing (if enabled)
 * @access  Private (Guest)
 */
export const instantBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guestId = (req as any).userId;
    const { listingId, checkInDate, checkOutDate, numberOfGuests } = req.body;

    if (!listingId || !checkInDate || !checkOutDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get listing
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { host: true },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (!listing.instantBook) {
      return res.status(400).json({ error: 'Listing does not allow instant booking' });
    }

    // Check availability
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const numberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const unavailable = await prisma.listingAvailability.findMany({
      where: {
        listingId,
        date: {
          gte: checkIn,
          lt: checkOut,
        },
        isAvailable: false,
      },
    });

    if (unavailable.length > 0) {
      return res.status(400).json({ error: 'Dates are not available' });
    }

    // Calculate pricing
    const nightlyRate = listing.basePricePerNight;
    const cleaningFee = listing.cleaningFee || 0;
    const subtotal = nightlyRate * numberOfNights;
    const serviceFeeGuest = subtotal * (listing.serviceFeeGuest || 0.15);
    const tax = (subtotal + serviceFeeGuest) * 0.1; // 10% tax (example)
    const totalCostGuest = subtotal + cleaningFee + serviceFeeGuest + tax;

    const hostPayout = subtotal - subtotal * (listing.serviceFeeHost || 0.03);

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        listingId,
        guestId,
        hostId: listing.hostId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: numberOfGuests || 1,
        numberOfNights,
        status: 'CONFIRMED',
        instantBook: true,
        nightlyRate,
        cleaningFee,
        serviceFeeGuest,
        tax,
        subtotalBeforeFees: subtotal,
        totalCostGuest,
        totalPayoutHost: hostPayout,
        payoutDate: new Date(checkIn.getTime() + 24 * 60 * 60 * 1000), // 24h after check-in
        cancellationPolicy: listing.cancellationPolicy,
        paymentStatus: 'AUTHORIZED',
      },
    });

    // Block calendar
    await Promise.all(
      Array.from({ length: numberOfNights }, (_, i) => {
        const date = new Date(checkIn);
        date.setDate(date.getDate() + i);
        return prisma.listingAvailability.upsert({
          where: { listingId_date: { listingId, date } },
          create: { listingId, date, isAvailable: false, blockReason: 'booking' },
          update: { isAvailable: false, blockReason: 'booking' },
        });
      })
    );

    // Send confirmation email
    try {
      await sendBookingConfirmation(
        (await prisma.user.findUnique({ where: { id: guestId }, select: { email: true } }))?.email || '',
        booking.id,
        (await prisma.user.findUnique({ where: { id: guestId }, select: { name: true } }))?.name || 'Guest'
      );
    } catch (error) {
      console.error('Email send error:', error);
    }

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/bookings/request
 * @desc    Request to book a listing (requires host approval)
 * @access  Private (Guest)
 */
export const requestBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guestId = (req as any).userId;
    const { listingId, checkInDate, checkOutDate, numberOfGuests, message } = req.body;

    // Get listing
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check availability
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const numberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate pricing
    const nightlyRate = listing.basePricePerNight;
    const cleaningFee = listing.cleaningFee || 0;
    const subtotal = nightlyRate * numberOfNights;
    const serviceFeeGuest = subtotal * (listing.serviceFeeGuest || 0.15);
    const tax = (subtotal + serviceFeeGuest) * 0.1;
    const totalCostGuest = subtotal + cleaningFee + serviceFeeGuest + tax;

    const hostPayout = subtotal - subtotal * (listing.serviceFeeHost || 0.03);

    // Create booking request
    const booking = await prisma.booking.create({
      data: {
        listingId,
        guestId,
        hostId: listing.hostId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: numberOfGuests || 1,
        numberOfNights,
        status: 'PENDING_APPROVAL',
        instantBook: false,
        nightlyRate,
        cleaningFee,
        serviceFeeGuest,
        tax,
        subtotalBeforeFees: subtotal,
        totalCostGuest,
        totalPayoutHost: hostPayout,
        cancellationPolicy: listing.cancellationPolicy,
        paymentStatus: 'PENDING',
      },
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/bookings/:bookingId/approve
 * @desc    Host approves a booking request
 * @access  Private (Host)
 */
export const approveBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hostId = (req as any).userId;
    const { bookingId } = req.params;

    // Verify ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: true, guest: true },
    });

    if (!booking || booking.hostId !== hostId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (booking.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Booking cannot be approved in current status' });
    }

    // Update booking
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', paymentStatus: 'AUTHORIZED' },
    });

    // Block calendar
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    await Promise.all(
      Array.from({ length: booking.numberOfNights }, (_, i) => {
        const date = new Date(checkIn);
        date.setDate(date.getDate() + i);
        return prisma.listingAvailability.upsert({
          where: { listingId_date: { listingId: booking.listingId, date } },
          create: { listingId: booking.listingId, date, isAvailable: false, blockReason: 'booking' },
          update: { isAvailable: false, blockReason: 'booking' },
        });
      })
    );

    res.json({ message: 'Booking approved', booking: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/bookings/:bookingId/decline
 * @desc    Host declines a booking request
 * @access  Private (Host)
 */
export const declineBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hostId = (req as any).userId;
    const { bookingId } = req.params;
    const { reason } = req.body;

    // Verify ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.hostId !== hostId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'host',
        cancellationReason: reason,
      },
    });

    res.json({ message: 'Booking declined', booking: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/bookings/:bookingId/cancel
 * @desc    Cancel a booking (by guest or host)
 * @access  Private
 */
export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify authorization
    if (booking.guestId !== userId && booking.hostId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Calculate refund based on cancellation policy
    let refundAmount = 0;
    const now = new Date();
    const daysUntilCheckIn = Math.ceil((booking.checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    switch (booking.cancellationPolicy) {
      case 'FLEXIBLE':
        if (daysUntilCheckIn >= 1) refundAmount = booking.totalCostGuest;
        break;
      case 'MODERATE':
        if (daysUntilCheckIn >= 7) refundAmount = booking.totalCostGuest;
        else if (daysUntilCheckIn >= 1) refundAmount = booking.totalCostGuest * 0.5;
        break;
      case 'STRICT':
        if (daysUntilCheckIn >= 14) refundAmount = booking.totalCostGuest;
        else if (daysUntilCheckIn >= 3) refundAmount = booking.totalCostGuest * 0.5;
        break;
      case 'NON_REFUNDABLE':
        refundAmount = 0;
        break;
      default:
        refundAmount = booking.totalCostGuest;
    }

    // Update booking
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: booking.guestId === userId ? 'guest' : 'host',
        cancellationReason: reason,
        refundAmount,
      },
    });

    // Unblock calendar
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    await Promise.all(
      Array.from({ length: booking.numberOfNights }, (_, i) => {
        const date = new Date(checkIn);
        date.setDate(date.getDate() + i);
        return prisma.listingAvailability.upsert({
          where: { listingId_date: { listingId: booking.listingId, date } },
          create: { listingId: booking.listingId, date, isAvailable: true },
          update: { isAvailable: true, blockReason: null },
        });
      })
    );

    res.json({ message: 'Booking cancelled', refundAmount, booking: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/bookings/:bookingId
 * @desc    Get booking details
 * @access  Private
 */
export const getBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: { select: { id: true, name: true, avatar: true, email: true } },
        host: { select: { id: true, name: true, avatar: true } },
        listing: { select: { id: true, title: true, address: true } },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify authorization
    if (booking.guestId !== userId && booking.hostId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/bookings
 * @desc    Get user's bookings (as guest or host)
 * @access  Private
 */
export const getBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { type = 'guest', status } = req.query;

    let where: any = {};

    if (type === 'host') {
      where.hostId = userId;
    } else {
      where.guestId = userId;
    }

    if (status) {
      where.status = status;
    }

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
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/bookings/:bookingId/check-in
 * @desc    Mark booking as checked in
 * @access  Private
 */
export const checkIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || (booking.guestId !== userId && booking.hostId !== userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
        paymentStatus: 'CAPTURED',
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/bookings/:bookingId/check-out
 * @desc    Mark booking as checked out
 * @access  Private
 */
export const checkOut = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || (booking.guestId !== userId && booking.hostId !== userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CHECKED_OUT',
        checkedOutAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
