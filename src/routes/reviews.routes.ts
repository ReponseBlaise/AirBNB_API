import { Router } from 'express';
import { createReview, getListingReviews, deleteReview } from '../controllers/reviews.controller.js';

const reviewsRouter = Router();

/**
 * @swagger
 * /api/v1/listings/{id}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Get all reviews for a listing (paginated, cached for 30s)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Listing ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of reviews for the listing
 *       404:
 *         description: Listing not found
 *   post:
 *     tags: [Reviews]
 *     summary: Add a review to a listing
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Listing ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - rating
 *               - comment
 *             properties:
 *               userId:
 *                 type: integer
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Review created successfully (cache invalidated)
 *       400:
 *         description: Invalid input or rating out of range
 *       404:
 *         description: Listing or user not found
 */

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
 * @swagger
 * /api/v1/reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete a review (cache invalidated)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       404:
 *         description: Review not found
 */

/**
 * DELETE /reviews/:id
 * Delete a review
 */
reviewsRouter.delete('/reviews/:id', deleteReview);

export default reviewsRouter;
