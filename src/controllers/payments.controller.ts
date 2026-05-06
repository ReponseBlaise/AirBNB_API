import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';

const uid = (req: Request) => (req as any).userId;
const mockStripeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const stripeDetails = (id: string | null, amount: number) => ({ id, status: 'succeeded', amount: Math.floor(amount * 100), currency: 'usd' });

export const authorizePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId, amount, paymentMethodId } = req.body;
    if (!bookingId || !amount) return res.status(400).json({ error: 'Missing required fields' });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const existing = await prisma.payment.findFirst({ where: { bookingId } });
    if (existing) return res.status(400).json({ error: 'Payment already exists for this booking' });

    const stripePaymentIntentId = mockStripeId('pi');
    const payment = await prisma.payment.create({
      data: { bookingId, amount, currency: 'USD', status: 'AUTHORIZED', stripePaymentIntentId, paymentMethod: paymentMethodId || 'default', authorizedAt: new Date() },
    });
    await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: 'AUTHORIZED' } });
    res.status(201).json({ payment, stripeDetails: stripeDetails(stripePaymentIntentId, amount) });
  } catch (e) { next(e); }
};

export const capturePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.paymentId }, include: { booking: true } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'AUTHORIZED') return res.status(400).json({ error: 'Payment is not in AUTHORIZED state' });

    const updated = await prisma.payment.update({ where: { id: req.params.paymentId }, data: { status: 'CAPTURED', capturedAt: new Date() } });
    await prisma.booking.update({ where: { id: payment.bookingId }, data: { paymentStatus: 'CAPTURED' } });
    res.json({ payment: updated, stripeDetails: stripeDetails(payment.stripePaymentIntentId, payment.amount) });
  } catch (e) { next(e); }
};

export const refundPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, reason } = req.body;
    const payment = await prisma.payment.findUnique({ where: { id: req.params.paymentId }, include: { booking: true } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'CAPTURED') return res.status(400).json({ error: 'Only CAPTURED payments can be refunded' });

    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) return res.status(400).json({ error: 'Refund amount exceeds payment amount' });

    const existing = await prisma.payment.findFirst({ where: { bookingId: payment.bookingId, status: 'REFUNDED' } });
    if (existing) return res.status(400).json({ error: 'Refund already processed for this booking' });

    const refundId = mockStripeId('re');
    const refund = await prisma.payment.create({
      data: { bookingId: payment.bookingId, amount: refundAmount, currency: payment.currency, status: 'REFUNDED', stripePaymentIntentId: refundId, paymentMethod: payment.paymentMethod, refundedAt: new Date(), refundReason: reason },
    });
    await prisma.booking.update({ where: { id: payment.bookingId }, data: { paymentStatus: 'REFUNDED' } });
    res.status(201).json({ refund, stripeDetails: stripeDetails(refundId, refundAmount) });
  } catch (e) { next(e); }
};

export const getPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.paymentId },
      include: { booking: { select: { id: true, guestId: true, hostId: true, listingId: true, status: true } } },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (e) { next(e); }
};

export const getBookingPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await prisma.payment.findMany({ where: { bookingId: req.params.bookingId }, orderBy: { createdAt: 'desc' } }));
  } catch (e) { next(e); }
};

export const getUserPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    const { type = 'guest' } = req.query;
    const bookings = await prisma.booking.findMany({ where: { [type === 'host' ? 'hostId' : 'guestId']: userId }, select: { id: true } });
    if (!bookings.length) return res.json([]);

    const payments = await prisma.payment.findMany({
      where: { bookingId: { in: bookings.map(b => b.id) } },
      include: { booking: { select: { id: true, checkInDate: true, checkOutDate: true, listing: { select: { title: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments);
  } catch (e) { next(e); }
};
