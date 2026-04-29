import { Router } from 'express';
import { createReview, getListingReviews, deleteReview } from '../controllers/reviews.controller.js';

const reviewsRouter = Router();

/**
 * GET /listings/:id/reviews
 * Get all reviews for a listing (paginated)
 */
reviewsRouter.get('/listings/:id/reviews', getListingReviews);

/**
 * POST /listings/:id/reviews
 * Add a review to a listing
 */
reviewsRouter.post('/listings/:id/reviews', createReview);

/**
 * DELETE /reviews/:id
 * Delete a review
 */
reviewsRouter.delete('/reviews/:id', deleteReview);

export default reviewsRouter;
