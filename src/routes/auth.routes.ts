import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { changePassword, forgotPassword, getMe, login, register, resetPassword } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);// register route should be public, no authentication required
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;