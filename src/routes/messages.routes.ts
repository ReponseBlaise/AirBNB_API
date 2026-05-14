import { Router } from 'express';
import {
  sendMessage,
  getThreads,
  getThreadMessages,
  flagMessage,
  deleteMessage,
  markThreadAsRead,
} from '../controllers/messages.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

/**
 * @swagger
 * /api/v1/messages/send:
 *   post:
 *     tags: [Messages]
 *     summary: Send a message (create thread if needed)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               threadId:
 *                 type: string
 *                 description: For existing threads (optional)
 *               receiverId:
 *                 type: string
 *                 description: For new threads (required if no threadId)
 *               listingId:
 *                 type: string
 *                 description: Optional context
 *               bookingId:
 *                 type: string
 *                 description: Optional context
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 */

const router = Router();

// Messaging endpoints
router.post('/send', authenticate, sendMessage);
router.get('/threads', authenticate, getThreads);
router.get('/threads/:threadId', authenticate, getThreadMessages);
router.put('/threads/:threadId/mark-read', authenticate, markThreadAsRead);

// Message actions
router.put('/:messageId/flag', authenticate, flagMessage);
router.delete('/:messageId', authenticate, deleteMessage);

export default router;
