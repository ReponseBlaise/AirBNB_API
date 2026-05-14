import { Router } from 'express';
import {
  submitReview,
  getPublishedReviews,
  getReview,
  respondToReview,
  flagReview,
  getUserReviewsAsAuthor,
  getUserReviewsAsTarget,
  getListingReviews,
} from '../controllers/reviews.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const reviewsRouter = Router();

// Submit review (booking-based, dual-directional)
reviewsRouter.post('/submit', authenticate, submitReview);

// Get published reviews
reviewsRouter.get('/published', getPublishedReviews);
reviewsRouter.get('/:reviewId', getReview);

// User reviews (as author and target)
reviewsRouter.get('/user/:userId', getUserReviewsAsAuthor);
reviewsRouter.get('/user/:userId/received', getUserReviewsAsTarget);

// Listing reviews
reviewsRouter.get('/listing/:listingId/all', getListingReviews);

// Respond to review (host response)
reviewsRouter.put('/:reviewId/respond', authenticate, respondToReview);

// Flag review for moderation
reviewsRouter.put('/:reviewId/flag', authenticate, flagReview);

export default reviewsRouter;
