import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';

const uid = (req: Request) => (req as any).userId;

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatar: true, bio: true, languagesSpoken: true, isSuperhost: true, hostResponseRate: true, hostResponseTime: true, hostCancellationRate: true, createdAt: true, role: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const profile = await prisma.profile.findUnique({ where: { userId } });
    res.json({ ...user, profile });
  } catch (e) { next(e); }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, bio, languagesSpoken, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: uid(req) },
      data: { ...(name && { name }), ...(bio && { bio }), ...(languagesSpoken && { languagesSpoken }), ...(phone && { phone }) },
      select: { id: true, name: true, email: true, avatar: true, bio: true, languagesSpoken: true, phone: true },
    });
    res.json(user);
  } catch (e) { next(e); }
};

export const switchMode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { preferredRole } = req.body;
    if (!['GUEST', 'HOST'].includes(preferredRole)) return res.status(400).json({ error: 'Invalid role' });
    const user = await prisma.user.update({
      where: { id: uid(req) },
      data: { preferredRole },
      select: { id: true, role: true, preferredRole: true, name: true },
    });
    res.json({ message: `Switched to ${preferredRole} mode`, user });
  } catch (e) { next(e); }
};

export const updateNotificationPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({
      where: { id: uid(req) },
      data: { notificationPreferences: req.body },
      select: { id: true, notificationPreferences: true },
    });
    res.json(user);
  } catch (e) { next(e); }
};

export const getPaymentMethods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paymentMethods = await prisma.paymentMethod_.findMany({
      where: { userId: uid(req) },
      select: { id: true, methodType: true, last4Digits: true, expiryMonth: true, expiryYear: true, isDefault: true, createdAt: true },
    });
    res.json(paymentMethods);
  } catch (e) { next(e); }
};

export const addPaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { methodType, stripeTokenId, last4Digits, expiryMonth, expiryYear, isDefault } = req.body;
    if (!stripeTokenId) return res.status(400).json({ error: 'Stripe token required' });

    const userId = uid(req);
    if (isDefault) await prisma.paymentMethod_.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });

    const paymentMethod = await prisma.paymentMethod_.create({
      data: { userId, methodType, stripeTokenId, last4Digits, expiryMonth, expiryYear, isDefault: isDefault || false },
    });
    res.status(201).json(paymentMethod);
  } catch (e) { next(e); }
};

export const deletePaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentMethodId } = req.params;
    const pm = await prisma.paymentMethod_.findUnique({ where: { id: paymentMethodId } });
    if (!pm || pm.userId !== uid(req)) return res.status(404).json({ error: 'Payment method not found' });
    await prisma.paymentMethod_.delete({ where: { id: paymentMethodId } });
    res.json({ message: 'Payment method deleted' });
  } catch (e) { next(e); }
};

export const getUserReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { type = 'all' } = req.query;

    const where =
      type === 'guest' ? { guestId: userId, isGuestReview: true } :
      type === 'host'  ? { hostId: userId, isGuestReview: false } :
      { OR: [{ guestId: userId, isGuestReview: true }, { hostId: userId, isGuestReview: false }] };

    const reviews = await prisma.review.findMany({
      where: { ...where, isPublished: true },
      include: {
        guest: { select: { id: true, name: true, avatar: true } },
        host: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });
    res.json(reviews);
  } catch (e) { next(e); }
};

export const getUserBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type = 'guest' } = req.query;
    const where = type === 'host' ? { hostId: uid(req) } : { guestId: uid(req) };
    const bookings = await prisma.booking.findMany({
      where,
      include: { listing: { select: { id: true, title: true, address: true, basePricePerNight: true, photos: { take: 1 } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bookings);
  } catch (e) { next(e); }
};
