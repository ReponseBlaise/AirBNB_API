import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import { createUserSchema, updateUserSchema } from '../validators/users.validator.js';
import { stripSensitiveUserFields } from '../utils/userSanitizer.js';

export const getAllUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      include: { _count: { select: { listings: true } } },
    });
    res.json(users.map(stripSensitiveUserFields));
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        listings: {
          include: { _count: { select: { bookings: true } } },
        },
        bookings: {
          include: {
            listing: { select: { title: true, location: true } },
          },
        },
        profile: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(stripSensitiveUserFields(user));
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    const createData: Prisma.UserCreateInput = {
      name: result.data.name,
      email: result.data.email,
      username: result.data.username,
      phone: result.data.phone,
      password: await bcrypt.hash(result.data.password, 10),
      role: result.data.role,
      ...(result.data.avatar !== undefined ? { avatar: result.data.avatar } : {}),
    };

    const user = await prisma.user.create({
      data: createData,
    });
    res.status(201).json(stripSensitiveUserFields(user));
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    const updateData: Prisma.UserUpdateInput = {
      ...(result.data.name !== undefined ? { name: result.data.name } : {}),
      ...(result.data.email !== undefined ? { email: result.data.email } : {}),
      ...(result.data.username !== undefined ? { username: result.data.username } : {}),
      ...(result.data.phone !== undefined ? { phone: result.data.phone } : {}),
      ...(result.data.password !== undefined ? { password: await bcrypt.hash(result.data.password, 10) } : {}),
      ...(result.data.avatar !== undefined ? { avatar: result.data.avatar } : {}),
      ...(result.data.role !== undefined ? { role: result.data.role } : {}),
    };

    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: updateData,
    });
    res.json(stripSensitiveUserFields(user));
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

export const getUserListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { hostId: Number(req.params.id) },
      include: { _count: { select: { bookings: true } } },
    });
    res.json(listings);
  } catch (error) {
    next(error);
  }
};

export const getUserBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { guestId: Number(req.params.id) },
      include: {
        listing: { select: { title: true, location: true } },
      },
    });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};
