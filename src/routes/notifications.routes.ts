import { Router } from 'express';
import { getNotifications, markNotificationRead } from '../controllers/notifications.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', authenticate, getNotifications);
router.put('/:id/read', authenticate, markNotificationRead);

export default router;
