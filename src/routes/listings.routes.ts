/**
 * @swagger
 * /api/v1/listings:
 *   get:
 *     tags: [Listings]
 *     summary: Get all listings
 *     parameters:
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
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [APARTMENT, HOUSE, VILLA, CABIN]
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: guests
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listings returned
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 */
/**
 * @swagger
 * /api/v1/listings/search:
 *   get:
 *     tags: [Listings]
 *     summary: Search listings
 *     parameters:
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
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [APARTMENT, HOUSE, VILLA, CABIN]
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: guests
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listings returned
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 */
/**
 * @swagger
 * /api/v1/listings/stats:
 *   get:
 *     tags: [Listings]
 *     summary: Get listing stats
 *     responses:
 *       200:
 *         description: Listing statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   location:
 *                     type: string
 *                   total:
 *                     type: integer
 *                   avg_price:
 *                     type: number
 *                   min_price:
 *                     type: number
 *                   max_price:
 *                     type: number
 */
/**
 * @swagger
 * /api/v1/listings/{id}:
 *   get:
 *     tags: [Listings]
 *     summary: Get a listing by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Listing found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /api/v1/listings:
 *   post:
 *     tags: [Listings]
 *     summary: Create a listing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateListingInput'
 *     responses:
 *       201:
 *         description: Listing created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /api/v1/listings/{id}:
 *   put:
 *     tags: [Listings]
 *     summary: Update a listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateListingInput'
 *     responses:
 *       200:
 *         description: Listing updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /api/v1/listings/{id}:
 *   delete:
 *     tags: [Listings]
 *     summary: Delete a listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Listing deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { upload } from '../config/multer.js';
import { uploadListingPhotos, deleteListingPhoto } from '../controllers/upload.controller.js';
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  publishListing,
  setAvailability,
  getAvailability,
  getHostListings,
  deleteListing,
} from '../controllers/listings.controller.js';

const router = Router();

// Public routes
router.get('/', getListings);
router.get('/host/:hostId', getHostListings);
router.get('/:listingId', getListingById);
router.get('/:listingId/availability', getAvailability);

// Protected routes (Host only)
router.post('/', authenticate, createListing);
router.put('/:listingId', authenticate, updateListing);
router.post('/:listingId/publish', authenticate, publishListing);
router.post('/:listingId/photos', authenticate, upload.array('photos', 5), (req, res, next) => {
  if (!req.params.listingId) return res.status(400).json({ error: 'listingId is required' });
  req.params.id = req.params.listingId;
  return uploadListingPhotos(req, res, next);
});
router.delete('/:listingId/photos/:photoId', authenticate, (req, res, next) => {
  if (!req.params.listingId) return res.status(400).json({ error: 'listingId is required' });
  req.params.id = req.params.listingId;
  return deleteListingPhoto(req, res, next);
});
router.post('/:listingId/availability', authenticate, setAvailability);
router.delete('/:listingId', authenticate, deleteListing);

export default router;
