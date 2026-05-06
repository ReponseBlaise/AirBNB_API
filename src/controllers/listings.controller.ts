import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * @route   GET /api/v1/listings
 * @desc    Get all listings with filters and search
 * @access  Public
 */
export const getListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location, type, minPrice, maxPrice, amenities, minRating, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.max(1, Math.min(parseInt(limit as string), 100)); // Max 100 per page

    const where: any = { status: 'ACTIVE' };

    if (location) {
      where.OR = [
        { title: { contains: location as string, mode: 'insensitive' } },
        { address: { contains: location as string, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.listingType = type;
    }

    if (minPrice || maxPrice) {
      where.basePricePerNight = {};
      if (minPrice) where.basePricePerNight.gte = parseFloat(minPrice as string);
      if (maxPrice) where.basePricePerNight.lte = parseFloat(maxPrice as string);
    }

    if (minRating) {
      where.averageRating = { gte: parseFloat(minRating as string) };
    }

    const listings = await prisma.listing.findMany({
      where,
      include: {
        host: { select: { id: true, name: true, avatar: true, isSuperhost: true } },
        photos: { take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    const total = await prisma.listing.count({ where });

    res.json({
      data: listings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/listings/:listingId
 * @desc    Get listing details
 * @access  Public
 */
export const getListingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
            isSuperhost: true,
            hostResponseRate: true,
            hostCancellationRate: true,
            createdAt: true,
          },
        },
        photos: true,
        availability: { orderBy: { date: 'asc' }, take: 365 },
        reviews: {
          where: { isPublished: true },
          take: 10,
          orderBy: { publishedAt: 'desc' },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(listing);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/listings
 * @desc    Create a new listing
 * @access  Private (Host only)
 */
export const createListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const {
      title,
      description,
      address,
      latitude,
      longitude,
      listingType,
      bedrooms,
      beds,
      bathrooms,
      maxGuests,
      amenities,
      houseRules,
      basePricePerNight,
      weekendPrice,
      cleaningFee,
      instantBook,
      minNightStay,
      maxNightStay,
      cancellationPolicy,
    } = req.body;

    // Validation
    if (!title || !address || !basePricePerNight) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const listing = await prisma.listing.create({
      data: {
        hostId: userId,
        title,
        description,
        address,
        latitude,
        longitude,
        listingType,
        bedrooms,
        beds,
        bathrooms,
        maxGuests,
        amenities: amenities || [],
        houseRules: houseRules || [],
        basePricePerNight,
        weekendPrice,
        cleaningFee: cleaningFee || 0,
        instantBook: instantBook || false,
        minNightStay: minNightStay || 1,
        maxNightStay,
        cancellationPolicy: cancellationPolicy || 'MODERATE',
        status: 'DRAFT',
      },
    });

    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/listings/:listingId
 * @desc    Update listing details
 * @access  Private (Host only)
 */
export const updateListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { listingId } = req.params;
    const updateData = req.body;

    // Verify ownership
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.hostId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this listing' });
    }

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/listings/:listingId/photos
 * @desc    Upload photos to a listing (Cloudinary)
 * @access  Private (Host only)
 */
export const uploadPhotos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { listingId } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Verify ownership
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.hostId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const photos: any[] = [];

    for (const file of req.files) {
      try {
        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `listings/${listingId}`,
              resource_type: 'auto',
              quality: 'auto',
              fetch_format: 'auto',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          uploadStream.end((file as any).buffer);
        });

        // Create photo record in DB
        const photo = await prisma.listingPhoto.create({
          data: {
            listingId,
            url: (result as any).secure_url,
            publicId: (result as any).public_id,
            displayOrder: photos.length,
          },
        });

        photos.push(photo);
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
      }
    }

    res.status(201).json({ photos, message: `${photos.length} photos uploaded` });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/listings/:listingId/photos/:photoId
 * @desc    Delete a photo
 * @access  Private (Host only)
 */
export const deletePhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { listingId, photoId } = req.params;

    // Verify ownership
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.hostId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const photo = await prisma.listingPhoto.findUnique({ where: { id: photoId } });
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(photo.publicId);
    } catch (error) {
      console.error('Cloudinary delete error:', error);
    }

    // Delete from DB
    await prisma.listingPhoto.delete({ where: { id: photoId } });

    res.json({ message: 'Photo deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/listings/:listingId/publish
 * @desc    Publish a listing (make it discoverable)
 * @access  Private (Host only)
 */
export const publishListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { listingId } = req.params;

    // Verify ownership
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.hostId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check required fields
    if (!listing.title || !listing.basePricePerNight || !listing.bedrooms) {
      return res.status(400).json({ error: 'Missing required listing details' });
    }

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
    });

    res.json({ message: 'Listing published', listing: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/listings/:listingId/availability
 * @desc    Set availability for date range
 * @access  Private (Host only)
 */
export const setAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { listingId } = req.params;
    const { startDate, endDate, isAvailable, minNightStay, maxNightStay } = req.body;

    // Verify ownership
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.hostId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    // Upsert availability records
    const updated = await Promise.all(
      dates.map((date) =>
        prisma.listingAvailability.upsert({
          where: { listingId_date: { listingId, date: date } },
          create: {
            listingId,
            date,
            isAvailable,
            minNightStay,
            maxNightStay,
          },
          update: {
            isAvailable,
            minNightStay,
            maxNightStay,
          },
        })
      )
    );

    res.json({ message: `Updated ${updated.length} availability records`, count: updated.length });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/listings/:listingId/availability
 * @desc    Get availability calendar for next 365 days
 * @access  Public
 */
export const getAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;

    const availability = await prisma.listingAvailability.findMany({
      where: {
        listingId,
        date: {
          gte: new Date(),
          lte: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { date: 'asc' },
    });

    res.json(availability);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/listings/host/:hostId
 * @desc    Get all listings for a host
 * @access  Public
 */
export const getHostListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hostId } = req.params;

    const listings = await prisma.listing.findMany({
      where: { hostId, status: 'ACTIVE' },
      include: {
        photos: { take: 1 },
        _count: { select: { reviews: true, bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(listings);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/listings/:listingId
 * @desc    Soft delete a listing (archive)
 * @access  Private (Host only)
 */
export const deleteListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { listingId } = req.params;

    // Verify ownership
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.hostId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.listing.update({
      where: { id: listingId },
      data: { status: 'ARCHIVED' },
    });

    res.json({ message: 'Listing archived' });
  } catch (error) {
    next(error);
  }
};
