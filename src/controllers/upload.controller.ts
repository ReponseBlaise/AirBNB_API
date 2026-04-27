import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import prisma from '../config/prisma.js';
import { uploadToCloudinary, deleteFromCloudinary, getOptimizedUrl } from '../config/cloudinary.js';
import { stripSensitiveUserFields } from '../utils/userSanitizer.js';

export async function uploadAvatar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params['id']);

    if (req.userId !== id) {
      return res.status(403).json({ error: 'You can only update your own avatar' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId);
    }

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, 'airbnb/avatars');

    const updated = await prisma.user.update({
      where: { id },
      data: { avatar: url, avatarPublicId: publicId },
    });

    return res.json(stripSensitiveUserFields(updated));
  } catch (error) {
    next(error);
  }
}

export async function deleteAvatar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params['id']);

    if (req.userId !== id) {
      return res.status(403).json({ error: 'You can only update your own avatar' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.avatar) {
      return res.status(400).json({ error: 'No avatar to remove' });
    }

    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { avatar: null, avatarPublicId: null },
    });

    return res.json({ message: 'Avatar removed', user: stripSensitiveUserFields(updated) });
  } catch (error) {
    next(error);
  }
}

export async function uploadListingPhotos(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params['id']);

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (listing.hostId !== req.userId) {
      return res.status(403).json({ error: 'Only the host can upload photos for this listing' });
    }

    const existingCount = await prisma.listingPhoto.count({ where: { listingId: id } });

    if (existingCount >= 5) {
      return res.status(400).json({ error: 'Maximum of 5 photos allowed per listing' });
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const remaining = 5 - existingCount;
    const toUpload = files.slice(0, remaining);

    await Promise.all(
      toUpload.map(async (file) => {
        const { url, publicId } = await uploadToCloudinary(file.buffer, 'airbnb/listings');
        await prisma.listingPhoto.create({ data: { url, publicId, listingId: id } });
      })
    );

    const updated = await prisma.listing.findUnique({
      where: { id },
      include: {
        photos: true,
      },
    });

    const response = {
      ...updated,
      photos: updated?.photos.map((p) => ({ ...p, url: getOptimizedUrl(p.url, 800, 600) })),
    };

    return res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function deleteListingPhoto(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const listingId = Number(req.params['id']);
    const photoId = Number(req.params['photoId']);

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (listing.hostId !== req.userId) {
      return res.status(403).json({ error: 'Only the host can delete photos for this listing' });
    }

    const photo = await prisma.listingPhoto.findUnique({ where: { id: photoId } });
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    if (photo.listingId !== listingId) {
      return res.status(403).json({ error: 'Photo does not belong to this listing' });
    }

    await deleteFromCloudinary(photo.publicId);
    await prisma.listingPhoto.delete({ where: { id: photoId } });

    return res.json({ message: 'Photo deleted' });
  } catch (error) {
    next(error);
  }
}
