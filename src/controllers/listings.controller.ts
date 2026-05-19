import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

const listingTypes = ['APARTMENT', 'HOUSE', 'VILLA', 'CABIN'] as const;

export const getListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location, type, minPrice, maxPrice, hostId } = req.query;

    const where: any = {};

    // status filter: accept status query param (pending, active, rejected)
    // default to only ACTIVE listings for public calls when no status param provided
    if (req.query.status) {
      const s = String(req.query.status).toUpperCase()
      if (['PENDING', 'ACTIVE', 'REJECTED'].includes(s)) {
        where.status = s
      }
    } else {
      // when no explicit status query param, return only ACTIVE listings
      where.status = 'ACTIVE'
    }

    if (location) {
      where.location = { contains: String(location), mode: 'insensitive' };
    }

    if (type && listingTypes.includes(String(type) as (typeof listingTypes)[number])) {
      where.type = String(type);
    }

    if (minPrice || maxPrice) {
      where.pricePerNight = {};
      if (minPrice) where.pricePerNight.gte = Number(minPrice);
      if (maxPrice) where.pricePerNight.lte = Number(maxPrice);
    }

    if (hostId) {
      where.hostId = String(hostId);
    }

    const listings = await prisma.listing.findMany({
      where,
      include: {
        host: { select: { id: true, name: true, email: true, avatar: true } },
        photos: true,
        reviews: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(listings);
  } catch (error) {
    next(error);
  }
};

export const getListingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params['listingId'] },
      include: {
        host: { select: { id: true, name: true, email: true, avatar: true } },
        photos: true,
        reviews: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    return res.json(listing);
  } catch (error) {
    return next(error);
  }
};

export const createListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description = '', pricePerNight, guest, location, type, amenities = [] } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title || !pricePerNight || !guest || !location || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!listingTypes.includes(String(type) as (typeof listingTypes)[number])) {
      return res.status(400).json({ error: 'Invalid listing type' });
    }

    const listing = await prisma.listing.create({
      data: {
        title: String(title),
        description: String(description),
        pricePerNight: Number(pricePerNight),
        guest: Number(guest),
        location: String(location),
        type: String(type) as (typeof listingTypes)[number],
        amenities: Array.isArray(amenities) ? amenities.map(String) : [],
        hostId: req.userId,
        // default new listings to PENDING for moderation
        status: 'PENDING',
      },
    });

    return res.status(201).json(listing);
  } catch (error) {
    return next(error);
  }
};

export const updateListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listingId = req.params['listingId'];
    const existing = await prisma.listing.findUnique({ where: { id: listingId } });

    if (!existing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (!req.userId || (existing.hostId !== req.userId && req.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, pricePerNight, guest, location, type, amenities } = req.body;

    if (type && !listingTypes.includes(String(type) as (typeof listingTypes)[number])) {
      return res.status(400).json({ error: 'Invalid listing type' });
    }

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: {
        ...(title !== undefined && { title: String(title) }),
        ...(description !== undefined && { description: String(description) }),
        ...(pricePerNight !== undefined && { pricePerNight: Number(pricePerNight) }),
        ...(guest !== undefined && { guest: Number(guest) }),
        ...(location !== undefined && { location: String(location) }),
        ...(type !== undefined && { type: String(type) as (typeof listingTypes)[number] }),
        ...(amenities !== undefined && {
          amenities: Array.isArray(amenities) ? amenities.map(String) : existing.amenities,
        }),
      },
    });

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

export const deleteListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listingId = req.params['listingId'];
    const existing = await prisma.listing.findUnique({ where: { id: listingId } });

    if (!existing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (!req.userId || (existing.hostId !== req.userId && req.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.listing.delete({ where: { id: listingId } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const setListingStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listingId = req.params['listingId']

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // only admins can change moderation status
    if (req.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const { status } = req.body
    if (!status) {
      return res.status(400).json({ error: 'status is required' })
    }

    const s = String(status).toUpperCase()
    let newStatus: 'PENDING' | 'ACTIVE' | 'REJECTED'

    if (s === 'APPROVED' || s === 'ACTIVE') newStatus = 'ACTIVE'
    else if (s === 'REJECTED') newStatus = 'REJECTED'
    else if (s === 'PENDING') newStatus = 'PENDING'
    else return res.status(400).json({ error: 'Invalid status' })

    const existing = await prisma.listing.findUnique({ where: { id: listingId } })
    if (!existing) return res.status(404).json({ error: 'Listing not found' })

    const updated = await prisma.listing.update({ where: { id: listingId }, data: { status: newStatus } })

    return res.json(updated)
  } catch (error) {
    return next(error)
  }
}

export const uploadPhotos = async (_req: Request, res: Response) => res.status(501).json({ error: 'Photo upload is not modeled in the current schema' });
export const deletePhoto = async (_req: Request, res: Response) => res.status(501).json({ error: 'Photo deletion is not modeled in the current schema' });
export const publishListing = async (_req: Request, res: Response) => res.status(501).json({ error: 'Listing publishing is not modeled in the current schema' });
export const setAvailability = async (_req: Request, res: Response) => res.status(501).json({ error: 'Availability management is not modeled in the current schema' });
export const getAvailability = async (_req: Request, res: Response) => res.status(501).json({ error: 'Availability management is not modeled in the current schema' });
export const getHostListings = getListings;
