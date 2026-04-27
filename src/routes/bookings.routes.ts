import { Router } from 'express';
import { getAllBookings, getBookingById, createBooking, deleteBooking, updateBookingStatus } from '../controllers/bookings.controller.js';
import { authenticate, requireGuest } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', getAllBookings);
router.get('/:id', getBookingById);
router.post('/', authenticate, requireGuest, createBooking);
router.delete('/:id', authenticate, deleteBooking);
router.patch('/:id/status', updateBookingStatus);

export default router;
