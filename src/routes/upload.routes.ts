import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { upload } from '../config/multer.js';
import { uploadAvatar, deleteAvatar, uploadListingPhotos, deleteListingPhoto } from '../controllers/upload.controller.js';

const router = Router();

router.post('/users/:id/avatar', authenticate, upload.single('image'), uploadAvatar);
router.delete('/users/:id/avatar', authenticate, deleteAvatar);

router.post('/listings/:id/photos', authenticate, upload.array('photos', 5), uploadListingPhotos);
router.delete('/listings/:id/photos/:photoId', authenticate, deleteListingPhoto);

export default router;
