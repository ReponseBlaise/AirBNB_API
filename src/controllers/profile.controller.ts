import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma.js';

const uid = (req: Request) => (req as any).userId as string | undefined;

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
        listings: true,
        bookings: true,
        reviews: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, username, phone, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(username !== undefined && { username }),
        ...(phone !== undefined && { phone }),
        ...(avatar !== undefined && { avatar }),
      },
      select: { id: true, name: true, email: true, username: true, phone: true, role: true, avatar: true, createdAt: true },
    });

    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

export const switchMode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { preferredRole } = req.body;
    if (!['GUEST', 'HOST'].includes(String(preferredRole))) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: String(preferredRole) as 'GUEST' | 'HOST' },
      select: { id: true, name: true, role: true },
    });

    return res.json({ message: `Switched to ${preferredRole} mode`, user });
  } catch (error) {
    return next(error);
  }
};

export const updateNotificationPreferences = async (_req: Request, res: Response) => {
  return res.status(501).json({ error: 'Notification preferences are not modeled in the current schema' });
};

export const getPaymentMethods = async (_req: Request, res: Response) => {
  return res.json([]);
};

export const addPaymentMethod = async (_req: Request, res: Response) => {
  return res.status(501).json({ error: 'Payment methods are not modeled in the current schema' });
};

export const deletePaymentMethod = async (_req: Request, res: Response) => {
  return res.status(501).json({ error: 'Payment methods are not modeled in the current schema' });
};

export const getUserReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const reviews = await prisma.review.findMany({
      where: { userId },
      include: { user: { select: { id: true, name: true, avatar: true } }, listing: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(reviews);
  } catch (error) {
    return next(error);
  }
};

export const getUserBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const bookings = await prisma.booking.findMany({
      where: { guestId: userId },
      include: { listing: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(bookings);
  } catch (error) {
    return next(error);
  }
};
