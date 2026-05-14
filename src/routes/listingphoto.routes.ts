import { Router } from 'express';
import { getListingPhotos, addListingPhoto, deleteListingPhoto } from '../controllers/listingphoto.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/v1/listingphotos/{listingId}/photos:
 *   get:
 *     tags: [Listing Photos]
 *     summary: Get all photos for a listing
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Listing photos returned
 */
router.get('/:listingId/photos', getListingPhotos);

/**
 * @swagger
 * /api/v1/listingphotos/{listingId}/photos:
 *   post:
 *     tags: [Listing Photos]
 *     summary: Add a photo to a listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url, publicId]
 *             properties:
 *               url:
 *                 type: string
 *               publicId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Listing photo created
 */
router.post('/:listingId/photos', authenticate, addListingPhoto);

/**
 * @swagger
 * /api/v1/listingphotos/photos/{photoId}:
 *   delete:
 *     tags: [Listing Photos]
 *     summary: Delete a listing photo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Photo deleted
 */
router.delete('/photos/:photoId', authenticate, deleteListingPhoto);

export default router;
