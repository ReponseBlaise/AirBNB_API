import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';

const uid = (req: Request) => (req as any).userId;
const paginate = (req: Request, defaultLimit = 20) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || defaultLimit;
  return { skip: (page - 1) * limit, take: limit, page, limit };
};
const EXTERNAL_REGEX = /(email|phone|whatsapp|telegram|signal|wechat|viber)[\s:@.\-]*/i;

const getThreadWithAuth = async (threadId: string, userId: string, res: Response) => {
  const thread = await prisma.messageThread.findUnique({ where: { id: threadId }, include: { participants: true } });
  if (!thread) { res.status(404).json({ error: 'Thread not found' }); return null; }
  if (!thread.participants.some(p => p.id === userId)) { res.status(403).json({ error: 'Not authorized' }); return null; }
  return thread;
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const senderId = uid(req);
    const { threadId, listingId, bookingId, receiverId, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });

    let thread;
    if (threadId) {
      thread = await getThreadWithAuth(threadId, senderId, res);
      if (!thread) return;
    } else {
      if (!receiverId) return res.status(400).json({ error: 'receiverId required for new thread' });
      const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
      if (!receiver) return res.status(404).json({ error: 'Receiver not found' });
      if (senderId === receiverId) return res.status(400).json({ error: 'Cannot message yourself' });

      thread = await prisma.messageThread.findFirst({
        where: { AND: [{ participants: { some: { id: senderId } } }, { participants: { some: { id: receiverId } } }], ...(bookingId && { bookingId }), ...(listingId && { listingId }) },
      }) ?? await prisma.messageThread.create({
        data: { bookingId, listingId, participants: { connect: [{ id: senderId }, { id: receiverId }] } },
      });
    }

    const flaggedAsExternal = EXTERNAL_REGEX.test(content);
    const message = await prisma.message.create({ data: { threadId: thread.id, senderId, content, flaggedForExternal: flaggedAsExternal } });
    await prisma.messageThread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date() } });

    res.status(201).json({ message, ...(flaggedAsExternal && { warning: 'Message contains potential external contact information (for moderation review)' }) });
  } catch (e) { next(e); }
};

export const getThreads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    const { skip, take, page, limit } = paginate(req);
    const where = { participants: { some: { id: userId } } };
    const [threads, total] = await Promise.all([
      prisma.messageThread.findMany({
        where, skip, take,
        include: {
          participants: { select: { id: true, name: true, avatar: true }, where: { NOT: { id: userId } } },
          messages: { select: { id: true, content: true, createdAt: true, sender: { select: { name: true } } }, take: 1, orderBy: { createdAt: 'desc' } },
          booking: { select: { id: true, checkInDate: true, checkOutDate: true } },
          listing: { select: { id: true, title: true } },
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
      prisma.messageThread.count({ where }),
    ]);
    res.json({ threads, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

export const getThreadMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    const { threadId } = req.params;
    const { skip, take, page, limit } = paginate(req, 50);

    const thread = await getThreadWithAuth(threadId, userId, res);
    if (!thread) return;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({ where: { threadId }, include: { sender: { select: { id: true, name: true, avatar: true } } }, skip, take, orderBy: { createdAt: 'asc' } }),
      prisma.message.count({ where: { threadId } }),
    ]);

    res.json({
      thread: { id: thread.id, participants: thread.participants.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })) },
      messages,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (e) { next(e); }
};

export const flagMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    const { messageId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason required' });

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const thread = await getThreadWithAuth(message.threadId, userId, res);
    if (!thread) return;

    const updated = await prisma.message.update({ where: { id: messageId }, data: { flaggedAt: new Date(), flagReason: reason, flaggedBy: userId } });
    res.json({ message: 'Message flagged for moderation', flaggedMessage: updated });
  } catch (e) { next(e); }
};

export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    const { messageId } = req.params;
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.senderId !== userId) return res.status(403).json({ error: 'Not authorized to delete this message' });
    const updated = await prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
    res.json({ message: 'Message deleted', deletedMessage: { id: updated.id } });
  } catch (e) { next(e); }
};

export const markThreadAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = uid(req);
    const thread = await getThreadWithAuth(req.params.threadId, userId, res);
    if (!thread) return;
    await prisma.message.updateMany({ where: { threadId: req.params.threadId, NOT: { senderId: userId } }, data: { readAt: new Date() } });
    res.json({ message: 'Thread marked as read' });
  } catch (e) { next(e); }
};
