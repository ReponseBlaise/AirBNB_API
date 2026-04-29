import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { cache } from '../config/cache.js';
import { z } from 'zod';

// Validation schema for creating a review
const createReviewSchema = z.object({
  userId: z.number().int().positive('Invalid user ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().min(1, 'Comment is required').max(1000, 'Comment must be less than 1000 characters'),
});

/**
 * POST /listings/:id/reviews
 * Add a review to a listing
 */
export const createReview = async (req: Request, res: Response) => {
  try {
    const listingId = parseInt(req.params.id);
    const validation = createReviewSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { userId, rating, comment } = validation.data;

    // Check listing exists
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        userId,
        listingId,
        rating,
        comment,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Clear cache for this listing's reviews
    cache.clear(`reviews:listing:${listingId}`);
    // Clear listings stats cache
    cache.clear('listings:stats');

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

/**
 * GET /listings/:id/reviews
 * Get all reviews for a listing (paginated, cached)
 */
export const getListingReviews = async (req: Request, res: Response) => {
  try {
    const listingId = parseInt(req.params.id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    // Check cache first
    const cacheKey = `reviews:listing:${listingId}:page:${page}:limit:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Check listing exists
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Fetch reviews and count in parallel
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { listingId },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where: { listingId } }),
    ]);

    const response = {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache for 30 seconds
    cache.set(cacheKey, response, 30);

    res.json(response);
  } catch (error) {
    console.error('Get listing reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

/**
 * DELETE /reviews/:id
 * Delete a review
 */
export const deleteReview = async (req: Request, res: Response) => {
  try {
    const reviewId = parseInt(req.params.id);

    // Find review and get listing ID for cache invalidation
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Delete review
    await prisma.review.delete({ where: { id: reviewId } });

    // Clear cache for this listing's reviews
    cache.clearPattern(`reviews:listing:${review.listingId}:*`);
    // Clear listings stats cache
    cache.clear('listings:stats');

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};
