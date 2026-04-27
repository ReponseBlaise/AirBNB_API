import { Router } from 'express';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, getUserListings, getUserBookings } from '../controllers/users.controller.js';
import profileRouter from './profile.routes.js';

const router = Router();

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.get('/:id/listings', getUserListings);
router.get('/:id/bookings', getUserBookings);
router.use('/:id/profile', profileRouter);

export default router;
