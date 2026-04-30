import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { Prisma, ListingType } from '@prisma/client';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { createListingSchema, updateListingSchema } from '../validators/listings.validator.js';

export const getAllListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location, type, maxPrice, page, limit, sortBy, order } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 10);

    const where: Prisma.ListingWhereInput = {};
    if (location) where.location = { contains: location as string, mode: 'insensitive' };
    if (type && Object.values(ListingType).includes(type as ListingType)) where.type = type as ListingType;
    if (maxPrice) where.pricePerNight = { lte: parseFloat(maxPrice as string) };

    const validSortFields = ['pricePerNight', 'createdAt', 'rating'];
    const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const listings = await prisma.listing.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { [sortField]: sortOrder },
      select: {
        id: true,
        title: true,
        location: true,
        pricePerNight: true,
        type: true,
        rating: true,
        host: { select: { name: true, avatar: true } },
        _count: { select: { bookings: true } },
      },
    });
    res.json(listings);
  } catch (error) {
    next(error);
  }
};

export const getListingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id as string },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            phone: true,
            role: true,
            avatar: true,
            createdAt: true,
          },
        },
        bookings: {
          include: {
            guest: {
              select: { name: true, avatar: true },
            },
          },
        },
      },
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (error) {
    next(error);
  }
};

export const createListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createListingSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    const authReq = req as AuthRequest;

    if (!authReq.userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const listing = await prisma.listing.create({
      data: {
        ...result.data,
        hostId: authReq.userId,
      },
    });
    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};

export const updateListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = updateListingSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    const authReq = req as AuthRequest;
    if (!authReq.userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, hostId: true },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.hostId !== authReq.userId && authReq.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only edit your own listings' });
    }

    const updateData: Prisma.ListingUpdateInput = {
      ...(result.data.title !== undefined ? { title: result.data.title } : {}),
      ...(result.data.description !== undefined ? { description: result.data.description } : {}),
      ...(result.data.location !== undefined ? { location: result.data.location } : {}),
      ...(result.data.pricePerNight !== undefined ? { pricePerNight: result.data.pricePerNight } : {}),
      ...(result.data.guests !== undefined ? { guests: result.data.guests } : {}),
      ...(result.data.type !== undefined ? { type: result.data.type } : {}),
      ...(result.data.amenities !== undefined ? { amenities: result.data.amenities } : {}),
    };

    const updatedListing = await prisma.listing.update({
      where: { id: req.params.id as string },
      data: updateData,
    });
    res.json(updatedListing);
  } catch (error) {
    next(error);
  }
};

export const deleteListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;

    if (!authReq.userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, hostId: true },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.hostId !== authReq.userId && authReq.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only delete your own listings' });
    }

    await prisma.listing.delete({ where: { id: listing.id } });
    res.json({ message: 'Listing deleted' });
  } catch (error) {
    next(error);
  }
};

export const getListingStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await prisma.$queryRaw`
      SELECT
        location,
        COUNT(*)::int AS total,
        ROUND(AVG("pricePerNight")::numeric, 2) AS avg_price,
        MIN("pricePerNight") AS min_price,
        MAX("pricePerNight") AS max_price
      FROM "Listing"
      GROUP BY location
      ORDER BY total DESC
    `;

    res.json(stats);
  } catch (error) {
    next(error);
  }
};
