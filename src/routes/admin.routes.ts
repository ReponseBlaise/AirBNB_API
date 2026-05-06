import { Router } from 'express';
import {
  suspendUser,
  banUser,
  suspendListing,
  manualRefund,
  getAuditLogs,
  getDisputes,
  resolveDispute,
  getAdminStats,
  requireAdmin,
} from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';

/**
 * @swagger
 * /api/v1/admin/users/{userId}/suspend:
 *   post:
 *     tags: [Admin]
 *     summary: Suspend a user (temporary)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               reason:
 *                 type: string
 *               duration:
 *                 type: number
 *                 description: Duration in days (optional for permanent)
 */

const router = Router();

// Protect all admin routes
router.use(authenticate, requireAdmin);

// User management
router.post('/users/:userId/suspend', suspendUser);
router.post('/users/:userId/ban', banUser);

// Listing management
router.post('/listings/:listingId/suspend', suspendListing);

// Payment & dispute management
router.post('/bookings/:bookingId/refund', manualRefund);
router.get('/disputes', getDisputes);
router.put('/disputes/:disputeId/resolve', resolveDispute);

// Logs and stats
router.get('/audit-logs', getAuditLogs);
router.get('/stats', getAdminStats);

export default router;
