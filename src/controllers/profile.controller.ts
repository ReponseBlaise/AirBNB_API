import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import { createProfileSchema, updateProfileSchema } from '../validators/profile.validator.js';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: Number(req.params.id) },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

export const createProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.id);

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({ where: { userId } });
    if (existingProfile) return res.status(409).json({ error: 'Profile already exists for this user' });

    const result = createProfileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    const createData: Prisma.ProfileUncheckedCreateInput = {
      userId,
      ...(result.data.bio !== undefined ? { bio: result.data.bio } : {}),
      ...(result.data.website !== undefined ? { website: result.data.website } : {}),
      ...(result.data.country !== undefined ? { country: result.data.country } : {}),
    };

    const profile = await prisma.profile.create({
      data: createData,
    });
    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.id);

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if profile exists
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    const updateData: Prisma.ProfileUpdateInput = {
      ...(result.data.bio !== undefined ? { bio: result.data.bio } : {}),
      ...(result.data.website !== undefined ? { website: result.data.website } : {}),
      ...(result.data.country !== undefined ? { country: result.data.country } : {}),
    };

    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: updateData,
    });
    res.json(updatedProfile);
  } catch (error) {
    next(error);
  }
};
