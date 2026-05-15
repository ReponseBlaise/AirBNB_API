import { Router } from 'express';
import {
  initiateMtn,
  capturePayment,
  refundPayment,
  getPayment,
  getBookingPayments,
  getUserPayments,
  mtnWebhook,
} from '../controllers/payments.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

/**
 * @swagger
 * /api/v1/payments/authorize:
 *   post:
 *     tags: [Payments]
 *     summary: Authorize a payment hold for a booking
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               paymentMethodId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment authorized
 *       400:
 *         description: Invalid request
 */

/**
 * @swagger
 * /api/v1/payments/{paymentId}/capture:
 *   post:
 *     tags: [Payments]
 *     summary: Capture a previously authorized payment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment captured
 *       400:
 *         description: Invalid request
 */

/**
 * @swagger
 * /api/v1/payments/{paymentId}/refund:
 *   post:
 *     tags: [Payments]
 *     summary: Refund a captured payment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Refund processed
 *       400:
 *         description: Invalid request
 */

/**
 * @swagger
 * /api/v1/payments/{paymentId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details returned
 *       404:
 *         description: Payment not found
 */

const router = Router();

// Payment authorization / initiation flow
router.post('/authorize', authenticate, initiateMtn);
router.post('/mtn/initiate', authenticate, initiateMtn);
router.post('/:paymentId/capture', authenticate, capturePayment);
router.post('/:paymentId/refund', authenticate, refundPayment);

// MTN webhook (public)
router.post('/mtn/webhook', mtnWebhook);

// Retrieval
router.get('/:paymentId', authenticate, getPayment);
router.get('/booking/:bookingId', authenticate, getBookingPayments);
router.get('/', authenticate, getUserPayments);

export default router;
