import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

// Send a message (creates a thread implicitly by using threadId)
export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });

    const { threadId, receiverId, listingId, bookingId, content } = req.body;
    if (!content || !(threadId || receiverId)) return res.status(400).json({ error: 'threadId or receiverId and content are required' });

    const senderId = req.userId;
    const to = receiverId ?? null;

    const message = await prisma.message.create({
      data: {
        threadId: threadId ?? undefined,
        senderId,
        receiverId: String(to ?? ''),
        listingId: listingId ?? undefined,
        bookingId: bookingId ?? undefined,
        content: String(content),
      },
    });

    return res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

// Return simple list of threads (grouped by threadId or conversation partner)
export const getThreads = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get latest message per thread or per conversation
    const messages = await prisma.$queryRaw`
      SELECT DISTINCT ON (COALESCE(thread_id, LEAST(sender_id, receiver_id)||'-'||GREATEST(sender_id, receiver_id))) *
      FROM "Message"
      WHERE sender_id = ${req.userId} OR receiver_id = ${req.userId}
      ORDER BY COALESCE(thread_id, LEAST(sender_id, receiver_id)||'-'||GREATEST(sender_id, receiver_id)), created_at DESC
    `;

    return res.json(messages);
  } catch (err) {
    next(err);
  }
};

export const getThreadMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });

    const { threadId } = req.params;
    if (!threadId) return res.status(400).json({ error: 'threadId required' });

    const msgs = await prisma.message.findMany({ where: { threadId }, orderBy: { createdAt: 'asc' } });
    return res.json(msgs);
  } catch (err) {
    next(err);
  }
};

export const flagMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    const { messageId } = req.params;
    if (!messageId) return res.status(400).json({ error: 'messageId required' });
    const updated = await prisma.message.update({ where: { id: messageId }, data: { flagged: true } });
    return res.json(updated);
  } catch (err) { next(err); }
};

export const deleteMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    const { messageId } = req.params;
    if (!messageId) return res.status(400).json({ error: 'messageId required' });
    await prisma.message.delete({ where: { id: messageId } });
    return res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

export const markThreadAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    const { threadId } = req.params;
    if (!threadId) return res.status(400).json({ error: 'threadId required' });
    await prisma.message.updateMany({ where: { threadId, receiverId: req.userId }, data: { read: true } });
    return res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
};

export default {}
