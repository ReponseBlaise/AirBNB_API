import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;

const getBookingIdFromParams = (req: Request): string | undefined =>
  (req.params['bookingId'] ?? req.params['id']) as string | undefined;

const calculateNights = (checkIn: Date, checkOut: Date) =>
  Math.ceil((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY);

export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { listingId, checkIn, checkOut } = req.body;

    if (!listingId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'listingId, checkIn and checkOut are required' });
    }

    const listing = await prisma.listing.findUnique({ where: { id: String(listingId) } });
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const checkInDate = new Date(String(checkIn));
    const checkOutDate = new Date(String(checkOut));
    const nights = calculateNights(checkInDate, checkOutDate);

    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || nights <= 0) {
      return res.status(400).json({ error: 'Invalid check-in/check-out dates' });
    }

    // Determine guestId: use authenticated user if present, otherwise use guest info
    let guestId = req.userId

    if (!guestId) {
      const { guestName, guestEmail, guestPhone } = req.body
      if (!guestEmail || !guestName) {
        return res.status(400).json({ error: 'Guest name and email are required for guest bookings' })
      }

      // Try to find existing user by email
      let user = await prisma.user.findUnique({ where: { email: String(guestEmail) } })
      if (!user) {
        // create a new guest user with generated username and random password
        const emailLocal = (String(guestEmail).split('@')[0] ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
        const randomSuffix = Math.random().toString(36).slice(2, 8)
        const username = `${emailLocal || 'guest'}_${randomSuffix}`
        const rawPassword = Math.random().toString(36).slice(2, 10)
        const hashed = await bcrypt.hash(rawPassword, 10)
        user = await prisma.user.create({
          data: {
            name: String(guestName),
            email: String(guestEmail),
            username,
            phone: guestPhone ? String(guestPhone) : '',
            password: hashed,
            role: 'GUEST',
          },
        })
      }

      guestId = user.id
    }

    const booking = await prisma.booking.create({
      data: {
        listingId: listing.id,
        guestId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        totalPrice: listing.pricePerNight * nights,
        status: 'PENDING',
      },
      include: {
        listing: true,
        guest: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json(booking);
  } catch (error) {
    return next(error);
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = String(req.query['role'] || 'guest');
    const where =
      role === 'host'
        ? { listing: { hostId: req.userId } }
        : { guestId: req.userId };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        listing: true,
        guest: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(bookings);
  } catch (error) {
    return next(error);
  }
};

export const getBookingById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bookingId = getBookingIdFromParams(req);
    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: true,
        guest: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const listing = await prisma.listing.findUnique({ where: { id: booking.listingId }, select: { hostId: true } });
    const isAllowed =
      booking.guestId === req.userId ||
      listing?.hostId === req.userId ||
      req.role === 'ADMIN';

    if (!isAllowed) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    return res.json(booking);
  } catch (error) {
    return next(error);
  }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bookingId = getBookingIdFromParams(req);
    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    const { status } = req.body;
    if (!validStatuses.includes(String(status) as (typeof validStatuses)[number])) {
      return res.status(400).json({ error: 'Invalid booking status' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const listing = await prisma.listing.findUnique({ where: { id: booking.listingId }, select: { hostId: true } });
    const isAllowed =
      booking.guestId === req.userId ||
      listing?.hostId === req.userId ||
      req.role === 'ADMIN';

    if (!isAllowed) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: String(status) as (typeof validStatuses)[number] },
    });

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

export const deleteBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bookingId = getBookingIdFromParams(req);
    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const listing = await prisma.listing.findUnique({ where: { id: booking.listingId }, select: { hostId: true } });
    const isAllowed =
      booking.guestId === req.userId ||
      listing?.hostId === req.userId ||
      req.role === 'ADMIN';

    if (!isAllowed) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' },
      include: {
        listing: true,
        guest: { select: { id: true, name: true, email: true } },
      },
    });

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

export const getBooking = getBookingById;
export const getBookings = getMyBookings;
export const instantBook = createBooking;
export const requestBooking = createBooking;
export const cancelBooking = deleteBooking;

export const approveBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  req.body = { ...req.body, status: 'CONFIRMED' };
  return updateBookingStatus(req, res, next);
};

export const declineBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  req.body = { ...req.body, status: 'CANCELLED' };
  return updateBookingStatus(req, res, next);
};

export const checkIn = async (req: AuthRequest, res: Response, next: NextFunction) => {
  req.body = { ...req.body, status: 'CONFIRMED' };
  return updateBookingStatus(req, res, next);
};

export const checkOut = async (req: AuthRequest, res: Response, next: NextFunction) => {
  req.body = { ...req.body, status: 'CONFIRMED' };
  return updateBookingStatus(req, res, next);
};
