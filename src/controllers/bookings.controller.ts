import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { createBookingSchema } from '../validators/bookings.validator.js';
import { sendEmail } from '../config/email.js';
import { bookingConfirmationEmail, bookingCancellationEmail } from '../templates/emails.js';

export const getAllBookings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        guest: { select: { name: true, avatar: true } },
        listing: { select: { title: true } },
      },
    });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id as string },
      include: {
        guest: { select: { name: true, avatar: true, email: true } },
        listing: { include: { host: { select: { name: true } } } },
      },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createBookingSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    const authReq = req as AuthRequest;

    if (!authReq.userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const checkInDate = new Date(result.data.checkIn);
    const checkOutDate = new Date(result.data.checkOut);

    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
      return res.status(400).json({ error: 'Invalid checkIn or checkOut date' });
    }

    if (checkInDate >= checkOutDate) {
      return res.status(400).json({ error: 'checkIn must be before checkOut' });
    }

    if (checkInDate <= new Date()) {
      return res.status(400).json({ error: 'checkIn must be in the future' });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: result.data.listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const guestId = authReq.userId;
    const totalPrice = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)) * listing.pricePerNight;

    const booking = await prisma.$transaction(async (tx) => {
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          listingId: result.data.listingId,
          status: 'CONFIRMED',
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
      });

      if (conflictingBooking) {
        throw new Error('BOOKING_CONFLICT');
      }

      return tx.booking.create({
        data: {
          listingId: result.data.listingId,
          guestId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          totalPrice,
          status: 'PENDING',
        },
      });
    });

    res.status(201).json(booking);

    try {
      const guest = await prisma.user.findUnique({ where: { id: authReq.userId }, select: { name: true, email: true } });
      if (guest) {
        const fmt = (d: Date) => d.toDateString();
        await sendEmail(
          guest.email,
          'Booking Confirmed!',
          bookingConfirmationEmail(guest.name, listing.title, listing.location, fmt(checkInDate), fmt(checkOutDate), totalPrice)
        );
      }
    } catch (emailError) {
      console.error('Booking confirmation email failed:', emailError);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'BOOKING_CONFLICT') {
      return res.status(409).json({ error: 'Booking conflicts with an existing confirmed booking' });
    }

    next(error);
  }
};

export const deleteBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;

    if (!authReq.userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, guestId: true, status: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.guestId !== authReq.userId && authReq.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only cancel your own bookings' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    const fullBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        guest: { select: { name: true, email: true } },
        listing: { select: { title: true } },
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Booking cancelled' });

    try {
      if (fullBooking?.guest && fullBooking.listing) {
        const fmt = (d: Date) => d.toDateString();
        await sendEmail(
          fullBooking.guest.email,
          'Booking Cancelled',
          bookingCancellationEmail(fullBooking.guest.name, fullBooking.listing.title, fmt(fullBooking.checkIn), fmt(fullBooking.checkOut))
        );
      }
    } catch (emailError) {
      console.error('Booking cancellation email failed:', emailError);
    }
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status))
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });

    const booking = await prisma.booking.update({
      where: { id: req.params.id as string },
      data: { status },
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
};
