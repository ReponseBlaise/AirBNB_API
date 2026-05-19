import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    const notifications = await prisma.notification.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' } });
    return res.json(notifications);
  } catch (err) { next(err); }
};

export const markNotificationRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id required' });
    const n = await prisma.notification.update({ where: { id }, data: { read: true } });
    return res.json(n);
  } catch (err) { next(err); }
};

export const createNotification = async (userId: string, type: string, title: string, body: string, data?: unknown) => {
  return prisma.notification.create({ data: { userId, type, title, body, data: data as any } });
};

export default {};
