import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';

const uid = (req: Request) => (req as any).userId;
const authorSelect = { select: { id: true, name: true, avatar: true } };
const paginate = (req: Request, defaultLimit = 10) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || defaultLimit;
  return { skip: (page - 1) * limit, take: limit, page, limit };
};

export const submitReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewerId = uid(req);
    const { bookingId, rating, comment, categories } = req.body;
    if (!bookingId || !rating) return res.status(400).json({ error: 'Missing required fields' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { guest: true, host: true, listing: true } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const daysSinceCheckOut = Math.floor((Date.now() - new Date(booking.checkOutDate).getTime()) / 86400000);
    if (daysSinceCheckOut > 14) return res.status(400).json({ error: 'Review period has expired (14 days after checkout)' });
    if (daysSinceCheckOut < 0) return res.status(400).json({ error: 'Cannot review before checkout' });

    const isGuest = booking.guestId === reviewerId;
    const isHost = booking.hostId === reviewerId;
    if (!isGuest && !isHost) return res.status(403).json({ error: 'Not authorized to review this booking' });

    const existing = await prisma.review.findFirst({ where: { bookingId, authorId: reviewerId } });
    if (existing) return res.status(400).json({ error: 'Review already submitted for this booking' });

    const autoPublish = daysSinceCheckOut >= 14;
    const review = await prisma.review.create({
      data: { bookingId, authorId: reviewerId, isGuestReview: isGuest, targetId: isGuest ? booking.hostId : booking.guestId, rating, comment, categories: categories || {}, isPublished: autoPublish, publishedAt: autoPublish ? new Date() : null },
    });

    const counterReview = await prisma.review.findFirst({ where: { bookingId, isGuestReview: !isGuest } });
    if (counterReview && !counterReview.isPublished) {
      const now = new Date();
      await Promise.all([
        prisma.review.update({ where: { id: review.id }, data: { isPublished: true, publishedAt: now } }),
        prisma.review.update({ where: { id: counterReview.id }, data: { isPublished: true, publishedAt: now } }),
      ]);
    }

    res.status(201).json({ review, message: review.isPublished ? 'Review published' : 'Review submitted. Will be published after 14 days or when both parties have reviewed.' });
  } catch (e) { next(e); }
};

export const getPublishedReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, listingId, type } = req.query;
    if (!userId && !listingId) return res.status(400).json({ error: 'userId or listingId required' });

    const where: any = { isPublished: true };
    if (userId) {
      where.targetId = userId;
      if (type === 'guest') where.isGuestReview = true;
      else if (type === 'host') where.isGuestReview = false;
    } else {
      where.booking = { listingId };
    }

    const reviews = await prisma.review.findMany({
      where,
      include: { author: authorSelect, booking: { select: { checkInDate: true, checkOutDate: true, listing: { select: { title: true } } } } },
      orderBy: { publishedAt: 'desc' },
    });
    res.json(reviews);
  } catch (e) { next(e); }
};

export const getReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.reviewId },
      include: { author: authorSelect, target: authorSelect, booking: { select: { id: true, checkInDate: true, checkOutDate: true, listing: { select: { title: true } } } } },
    });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (!review.isPublished) return res.status(403).json({ error: 'Review is not published' });
    res.json(review);
  } catch (e) { next(e); }
};

export const respondToReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = req.params;
    const { response } = req.body;
    if (!response) return res.status(400).json({ error: 'Response text required' });

    const review = await prisma.review.findUnique({ where: { id: reviewId }, include: { booking: true } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.targetId !== uid(req)) return res.status(403).json({ error: 'Not authorized to respond to this review' });

    res.json(await prisma.review.update({ where: { id: reviewId }, data: { hostResponse: response, respondedAt: new Date() } }));
  } catch (e) { next(e); }
};

export const flagReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason required' });

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.flaggedAt) return res.status(400).json({ error: 'Review already flagged for moderation' });

    const updated = await prisma.review.update({ where: { id: reviewId }, data: { flaggedAt: new Date(), flagReason: reason, flaggedBy: uid(req) } });
    res.json({ message: 'Review flagged for moderation', review: updated });
  } catch (e) { next(e); }
};

export const getUserReviewsAsAuthor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { authorId: req.params.userId, isPublished: true },
      include: { target: authorSelect, booking: { select: { listing: { select: { title: true } } } } },
      orderBy: { publishedAt: 'desc' },
    });
    res.json(reviews);
  } catch (e) { next(e); }
};

export const getUserReviewsAsTarget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { targetId: req.params.userId, isPublished: true },
      include: { author: authorSelect, booking: { select: { checkInDate: true, checkOutDate: true, listing: { select: { title: true } } } } },
      orderBy: { publishedAt: 'desc' },
    });
    res.json(reviews);
  } catch (e) { next(e); }
};

export const getListingReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;
    const { skip, take, page, limit } = paginate(req);
    const where = { booking: { listingId }, isPublished: true };
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({ where, include: { author: authorSelect }, skip, take, orderBy: { publishedAt: 'desc' } }),
      prisma.review.count({ where }),
    ]);
    res.json({ reviews, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};
