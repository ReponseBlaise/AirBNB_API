/**
 * @swagger
 * /api/v1/users/{id}/profile:
 *   get:
 *     tags: [Profile]
 *     summary: Get a user's profile
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Profile found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /api/v1/users/{id}/profile:
 *   post:
 *     tags: [Profile]
 *     summary: Create a user's profile
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
 *             $ref: '#/components/schemas/CreateProfileInput'
 *     responses:
 *       201:
 *         description: Profile created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Profile already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /api/v1/users/{id}/profile:
 *   put:
 *     tags: [Profile]
 *     summary: Update a user's profile
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
 *             $ref: '#/components/schemas/UpdateProfileInput'
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User or profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getProfile,
  updateProfile,
  switchMode,
  updateNotificationPreferences,
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  getUserReviews,
  getUserBookings,
} from '../controllers/profile.controller';

const router = Router();

// Public routes
router.get('/:userId', getProfile);
router.get('/:userId/reviews', getUserReviews);

// Protected routes
router.put('/', authenticate, updateProfile);
router.post('/switch-mode', authenticate, switchMode);
router.put('/notification-preferences', authenticate, updateNotificationPreferences);
router.get('/payment-methods', authenticate, getPaymentMethods);
router.post('/payment-methods', authenticate, addPaymentMethod);
router.delete('/payment-methods/:paymentMethodId', authenticate, deletePaymentMethod);
router.get('/bookings', authenticate, getUserBookings);

export default router;
