import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

/**
 * @route   POST /api/v1/reviews/submit
 * @desc    Submit a review for a listing and/or host
 * @access  Private
 */
export const submitReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewerId = (req as any).userId;
    const { bookingId, rating, comment, categories } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Get booking to determine review type
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true, host: true, listing: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify 14-day window from check-out
    const checkOutDate = new Date(booking.checkOutDate);
    const now = new Date();
    const daysSinceCheckOut = Math.floor((now.getTime() - checkOutDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceCheckOut > 14) {
      return res.status(400).json({ error: 'Review period has expired (14 days after checkout)' });
    }

    if (daysSinceCheckOut < 0) {
      return res.status(400).json({ error: 'Cannot review before checkout' });
    }

    // Check if reviewer is guest or host
    const isGuest = booking.guestId === reviewerId;
    const isHost = booking.hostId === reviewerId;

    if (!isGuest && !isHost) {
      return res.status(403).json({ error: 'Not authorized to review this booking' });
    }

    // Check for existing review
    const existingReview = await prisma.review.findFirst({
      where: {
        bookingId,
        authorId: reviewerId,
      },
    });

    if (existingReview) {
      return res.status(400).json({ error: 'Review already submitted for this booking' });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId,
        authorId: reviewerId,
        isGuestReview: isGuest,
        targetId: isGuest ? booking.hostId : booking.guestId,
        rating,
        comment,
        categories: categories || {},
        publishedAt: daysSinceCheckOut >= 14 ? new Date() : null, // Auto-publish if 14 days elapsed
        isPublished: daysSinceCheckOut >= 14,
      },
    });

    // Check if both parties have reviewed - if so, publish both
    const counterReview = await prisma.review.findFirst({
      where: {
        bookingId,
        isGuestReview: !isGuest,
      },
    });

    if (counterReview && !counterReview.isPublished) {
      // Both have reviewed - publish both
      const now = new Date();
      await Promise.all([
        prisma.review.update({
          where: { id: review.id },
          data: { isPublished: true, publishedAt: now },
        }),
        prisma.review.update({
          where: { id: counterReview.id },
          data: { isPublished: true, publishedAt: now },
        }),
      ]);
    }

    res.status(201).json({
      review,
      message: review.isPublished
        ? 'Review published'
        : 'Review submitted. Will be published after 14 days or when both parties have reviewed.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/reviews/published
 * @desc    Get published reviews for a user or listing
 * @access  Public
 */
export const getPublishedReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, listingId, type } = req.query;

    if (!userId && !listingId) {
      return res.status(400).json({ error: 'userId or listingId required' });
    }

    let where: any = { isPublished: true };

    if (userId) {
      where.targetId = userId;
      if (type === 'guest') {
        where.isGuestReview = true;
      } else if (type === 'host') {
        where.isGuestReview = false;
      }
    } else if (listingId) {
      where.booking = {
        listingId,
      };
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        booking: {
          select: {
            checkInDate: true,
            checkOutDate: true,
            listing: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/reviews/:reviewId
 * @desc    Get review details
 * @access  Public
 */
export const getReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        target: {
          select: { id: true, name: true, avatar: true },
        },
        booking: {
          select: {
            id: true,
            checkInDate: true,
            checkOutDate: true,
            listing: {
              select: { title: true },
            },
          },
        },
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (!review.isPublished) {
      return res.status(403).json({ error: 'Review is not published' });
    }

    res.json(review);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/reviews/:reviewId/respond
 * @desc    Host responds to a review
 * @access  Private
 */
export const respondToReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { reviewId } = req.params;
    const { response } = req.body;

    if (!response) {
      return res.status(400).json({ error: 'Response text required' });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { booking: true },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Only target of review (host or guest) can respond
    if (review.targetId !== userId) {
      return res.status(403).json({ error: 'Not authorized to respond to this review' });
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        hostResponse: response,
        respondedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/reviews/:reviewId/flag
 * @desc    Flag a review for moderation
 * @access  Private
 */
export const flagReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { reviewId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check for existing flag
    if (review.flaggedAt) {
      return res.status(400).json({ error: 'Review already flagged for moderation' });
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        flaggedAt: new Date(),
        flagReason: reason,
        flaggedBy: userId,
      },
    });

    res.json({ message: 'Review flagged for moderation', review: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/reviews/user/:userId
 * @desc    Get all reviews by a user (author)
 * @access  Public
 */
export const getUserReviewsAsAuthor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const reviews = await prisma.review.findMany({
      where: {
        authorId: userId,
        isPublished: true,
      },
      include: {
        target: {
          select: { id: true, name: true, avatar: true },
        },
        booking: {
          select: {
            listing: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/reviews/user/:userId/received
 * @desc    Get all reviews received by a user (as target)
 * @access  Public
 */
export const getUserReviewsAsTarget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const reviews = await prisma.review.findMany({
      where: {
        targetId: userId,
        isPublished: true,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        booking: {
          select: {
            checkInDate: true,
            checkOutDate: true,
            listing: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/reviews/listing/:listingId/all
 * @desc    Get all published reviews for a listing
 * @access  Public
 */
export const getListingReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          booking: { listingId },
          isPublished: true,
        },
        include: {
          author: {
            select: { id: true, name: true, avatar: true },
          },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.review.count({
        where: {
          booking: { listingId },
          isPublished: true,
        },
      }),
    ]);

    res.json({
      reviews,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
};
