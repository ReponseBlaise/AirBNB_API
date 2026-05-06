import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { createUserSchema, updateUserSchema } from '../validators/users.validator.js';
import { stripSensitiveUserFields } from '../utils/userSanitizer.js';
import { sendEmail } from '../config/email.js';
import { welcomeEmail } from '../templates/emails.js';
import { cache } from '../config/cache.js';

const STATS_KEY = 'users:stats';
const invalidateStats = () => cache.clear(STATS_KEY);

export const getAllUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({ include: { _count: { select: { listings: true } } } });
    res.json(users.map(stripSensitiveUserFields));
  } catch (e) { next(e); }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        listings: { include: { _count: { select: { bookings: true } } } },
        bookings: { include: { listing: { select: { title: true, location: true } } } },
        profile: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(stripSensitiveUserFields(user));
  } catch (e) { next(e); }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ errors: result.error.issues });

    const { name, email, username, phone, password, role, avatar } = result.data;
    const user = await prisma.user.create({
      data: { name, email, username, phone, password: await bcrypt.hash(password, 10), role, ...(avatar && { avatar }) },
    });

    res.status(201).json(stripSensitiveUserFields(user));
    invalidateStats();
    sendEmail(user.email, 'Welcome to Airbnb!', welcomeEmail(user.name, user.role)).catch(e => console.error('Welcome email failed:', e));
  } catch (e) { next(e); }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateUserSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ errors: result.error.issues });

    const { name, email, username, phone, password, avatar, role } = result.data;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }), ...(email && { email }), ...(username && { username }),
        ...(phone && { phone }), ...(avatar && { avatar }), ...(role && { role }),
        ...(password && { password: await bcrypt.hash(password, 10) }),
      },
    });

    if (role) invalidateStats();
    res.json(stripSensitiveUserFields(user));
  } catch (e) { next(e); }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    invalidateStats();
    res.json({ message: 'User deleted' });
  } catch (e) { next(e); }
};

export const getUserListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { hostId: req.params.id },
      include: { _count: { select: { bookings: true } } },
    });
    res.json(listings);
  } catch (e) { next(e); }
};

export const getUserBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { guestId: req.params.id },
      include: { listing: { select: { title: true, location: true } } },
    });
    res.json(bookings);
  } catch (e) { next(e); }
};

export const getUsersStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cached = cache.get(STATS_KEY);
    if (cached) return res.json(cached);

    const [totalUsers, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
    ]);

    const stats = { totalUsers, byRole: byRole.map(g => ({ role: g.role, count: g._count.id })) };
    cache.set(STATS_KEY, stats, 300);
    res.json(stats);
  } catch (e) { next(e); }
};
