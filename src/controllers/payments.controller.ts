import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

/**
 * @route   POST /api/v1/payments/authorize
 * @desc    Create a payment authorization hold (called after booking confirmation)
 * @access  Private
 */
export const authorizePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId, amount, paymentMethodId } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findFirst({
      where: { bookingId },
    });

    if (existingPayment) {
      return res.status(400).json({ error: 'Payment already exists for this booking' });
    }

    // Mock Stripe payment intent creation
    const stripePaymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount,
        currency: 'USD',
        status: 'AUTHORIZED',
        stripePaymentIntentId,
        paymentMethod: paymentMethodId || 'default',
        authorizedAt: new Date(),
      },
    });

    // Update booking payment status
    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: 'AUTHORIZED' },
    });

    res.status(201).json({
      payment,
      stripeDetails: {
        id: stripePaymentIntentId,
        status: 'succeeded',
        amount: Math.floor(amount * 100), // Convert to cents
        currency: 'usd',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/payments/:paymentId/capture
 * @desc    Capture a previously authorized payment (called on check-in)
 * @access  Private
 */
export const capturePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'AUTHORIZED') {
      return res.status(400).json({ error: 'Payment is not in AUTHORIZED state' });
    }

    // Mock Stripe capture
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CAPTURED',
        capturedAt: new Date(),
      },
    });

    // Update booking payment status
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { paymentStatus: 'CAPTURED' },
    });

    res.json({
      payment: updated,
      stripeDetails: {
        id: payment.stripePaymentIntentId,
        status: 'succeeded',
        amount: Math.floor(payment.amount * 100),
        currency: 'usd',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/payments/:paymentId/refund
 * @desc    Refund a captured payment (called on cancellation or dispute resolution)
 * @access  Private
 */
export const refundPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'CAPTURED') {
      return res.status(400).json({ error: 'Only CAPTURED payments can be refunded' });
    }

    const refundAmount = amount || payment.amount;

    if (refundAmount > payment.amount) {
      return res.status(400).json({ error: 'Refund amount exceeds payment amount' });
    }

    // Check for existing refund
    const existingRefund = await prisma.payment.findFirst({
      where: {
        bookingId: payment.bookingId,
        status: 'REFUNDED',
      },
    });

    if (existingRefund) {
      return res.status(400).json({ error: 'Refund already processed for this booking' });
    }

    // Mock Stripe refund
    const refundId = `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const refund = await prisma.payment.create({
      data: {
        bookingId: payment.bookingId,
        amount: refundAmount,
        currency: payment.currency,
        status: 'REFUNDED',
        stripePaymentIntentId: refundId,
        paymentMethod: payment.paymentMethod,
        refundedAt: new Date(),
        refundReason: reason,
      },
    });

    // Update booking payment status
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { paymentStatus: 'REFUNDED' },
    });

    res.status(201).json({
      refund,
      stripeDetails: {
        id: refundId,
        status: 'succeeded',
        amount: Math.floor(refundAmount * 100),
        currency: 'usd',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/payments/:paymentId
 * @desc    Get payment details
 * @access  Private
 */
export const getPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          select: {
            id: true,
            guestId: true,
            hostId: true,
            listingId: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/payments/booking/:bookingId
 * @desc    Get all payments for a booking
 * @access  Private
 */
export const getBookingPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;

    const payments = await prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/payments
 * @desc    Get user's payment transactions (guest payments or host payouts)
 * @access  Private
 */
export const getUserPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { type = 'guest' } = req.query; // guest or host

    let bookingIds: string[] = [];

    if (type === 'host') {
      // Get all bookings where user is host
      const hostBookings = await prisma.booking.findMany({
        where: { hostId: userId },
        select: { id: true },
      });
      bookingIds = hostBookings.map(b => b.id);
    } else {
      // Get all bookings where user is guest
      const guestBookings = await prisma.booking.findMany({
        where: { guestId: userId },
        select: { id: true },
      });
      bookingIds = guestBookings.map(b => b.id);
    }

    if (bookingIds.length === 0) {
      return res.json([]);
    }

    const payments = await prisma.payment.findMany({
      where: {
        bookingId: { in: bookingIds },
      },
      include: {
        booking: {
          select: {
            id: true,
            checkInDate: true,
            checkOutDate: true,
            listing: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments);
  } catch (error) {
    next(error);
  }
};
