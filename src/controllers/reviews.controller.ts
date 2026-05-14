import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma.js';

const uid = (req: Request) => (req as any).userId as string | undefined;

export const submitReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { listingId, rating, comment } = req.body;
    if (!listingId || rating === undefined || comment === undefined) {
      return res.status(400).json({ error: 'listingId, rating and comment are required' });
    }

    const review = await prisma.review.create({
      data: {
        userId,
        listingId: String(listingId),
        rating: Number(rating),
        comment: String(comment),
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        listing: true,
      },
    });

    return res.status(201).json(review);
  } catch (error) {
    return next(error);
  }
};

export const getPublishedReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, listingId } = req.query;
    const where: Record<string, unknown> = {};

    if (userId) where.userId = String(userId);
    if (listingId) where.listingId = String(listingId);

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        listing: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(reviews);
  } catch (error) {
    return next(error);
  }
};

export const getReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.reviewId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        listing: true,
      },
    });

    if (!review) return res.status(404).json({ error: 'Review not found' });
    return res.json(review);
  } catch (error) {
    return next(error);
  }
};

export const respondToReview = async (_req: Request, res: Response) => {
  return res.status(501).json({ error: 'Review responses are not modeled in the current schema' });
};

export const flagReview = async (_req: Request, res: Response) => {
  return res.status(501).json({ error: 'Review moderation fields are not modeled in the current schema' });
};

export const getUserReviewsAsAuthor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: String(req.params.userId) },
      include: { user: { select: { id: true, name: true, avatar: true } }, listing: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(reviews);
  } catch (error) {
    return next(error);
  }
};

export const getUserReviewsAsTarget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const reviews = await prisma.review.findMany({
      where: { listing: { hostId: userId } },
      include: { user: { select: { id: true, name: true, avatar: true } }, listing: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(reviews);
  } catch (error) {
    return next(error);
  }
};

export const getListingReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { listingId: String(listingId) },
      include: { user: { select: { id: true, name: true, avatar: true } }, listing: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(reviews);
  } catch (error) {
    return next(error);
  }
};
