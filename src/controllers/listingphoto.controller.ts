import type { NextFunction, Request, Response } from 'express';
import prisma from '../models/prisma.js';

export const getListingPhotos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;
    if (!listingId) return res.status(400).json({ error: 'listingId required' });
    const photos = await prisma.listingPhoto.findMany({ where: { listingId } });
    res.json(photos);
  } catch (e) { next(e); }
};

export const addListingPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;
    const { url, publicId } = req.body;
    if (!listingId) return res.status(400).json({ error: 'listingId required' });
    if (!url || !publicId) return res.status(400).json({ error: 'Missing url or publicId' });
    const photo = await prisma.listingPhoto.create({ data: { url, publicId, listingId } });
    res.status(201).json(photo);
  } catch (e) { next(e); }
};

export const deleteListingPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { photoId } = req.params;
    if (!photoId) return res.status(400).json({ error: 'photoId required' });
    await prisma.listingPhoto.delete({ where: { id: photoId } });
    res.json({ message: 'Photo deleted' });
  } catch (e) { next(e); }
};
