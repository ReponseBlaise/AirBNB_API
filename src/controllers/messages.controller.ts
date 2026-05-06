import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

/**
 * @route   POST /api/v1/messages/send
 * @desc    Send a message in a thread or create new thread
 * @access  Private
 */
export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const senderId = (req as any).userId;
    const { threadId, listingId, bookingId, receiverId, content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content required' });
    }

    // For external contact info flagging (basic version)
    const externalContactRegex = /(email|phone|whatsapp|telegram|signal|wechat|viber)[\s:@.\-]*/i;
    const flaggedAsExternal = externalContactRegex.test(content);

    let thread;

    if (threadId) {
      // Add to existing thread
      thread = await prisma.messageThread.findUnique({
        where: { id: threadId },
        include: { participants: true },
      });

      if (!thread) {
        return res.status(404).json({ error: 'Thread not found' });
      }

      // Verify user is participant
      const isParticipant = thread.participants.some(p => p.id === senderId);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Not authorized to message in this thread' });
      }
    } else {
      // Create new thread
      if (!receiverId) {
        return res.status(400).json({ error: 'receiverId required for new thread' });
      }

      // Check if receiver exists
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
      });

      if (!receiver) {
        return res.status(404).json({ error: 'Receiver not found' });
      }

      // Prevent self-messaging
      if (senderId === receiverId) {
        return res.status(400).json({ error: 'Cannot message yourself' });
      }

      // Check for existing thread between these users
      const existingThread = await prisma.messageThread.findFirst({
        where: {
          AND: [
            { participants: { some: { id: senderId } } },
            { participants: { some: { id: receiverId } } },
          ],
          ...(bookingId && { bookingId }),
          ...(listingId && { listingId }),
        },
      });

      if (existingThread) {
        thread = existingThread;
      } else {
        // Create new thread
        thread = await prisma.messageThread.create({
          data: {
            bookingId,
            listingId,
            participants: {
              connect: [{ id: senderId }, { id: receiverId }],
            },
          },
        });
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId,
        content,
        flaggedForExternal: flaggedAsExternal,
      },
    });

    // Update thread's last message
    await prisma.messageThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    });

    res.status(201).json({
      message,
      ...(flaggedAsExternal && {
        warning: 'Message contains potential external contact information (for moderation review)',
      }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/messages/threads
 * @desc    Get all message threads for current user
 * @access  Private
 */
export const getThreads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [threads, total] = await Promise.all([
      prisma.messageThread.findMany({
        where: {
          participants: {
            some: { id: userId },
          },
        },
        include: {
          participants: {
            select: { id: true, name: true, avatar: true },
            where: { NOT: { id: userId } },
          },
          messages: {
            select: { id: true, content: true, createdAt: true, sender: { select: { name: true } } },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          booking: {
            select: { id: true, checkInDate: true, checkOutDate: true },
          },
          listing: {
            select: { id: true, title: true },
          },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { lastMessageAt: 'desc' },
      }),
      prisma.messageThread.count({
        where: {
          participants: {
            some: { id: userId },
          },
        },
      }),
    ]);

    res.json({
      threads,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/messages/threads/:threadId
 * @desc    Get messages in a thread
 * @access  Private
 */
export const getThreadMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { threadId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Verify user is participant
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: { participants: true },
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const isParticipant = thread.participants.some(p => p.id === userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized to view this thread' });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { threadId },
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'asc' },
      }),
      prisma.message.count({
        where: { threadId },
      }),
    ]);

    res.json({
      thread: {
        id: thread.id,
        participants: thread.participants.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })),
      },
      messages,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/messages/:messageId/flag
 * @desc    Flag a message for moderation
 * @access  Private
 */
export const flagMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { messageId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { thread: true },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user is participant in thread
    const thread = await prisma.messageThread.findUnique({
      where: { id: message.threadId },
      include: { participants: true },
    });

    const isParticipant = thread?.participants.some(p => p.id === userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        flaggedAt: new Date(),
        flagReason: reason,
        flaggedBy: userId,
      },
    });

    res.json({ message: 'Message flagged for moderation', message: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/messages/:messageId
 * @desc    Delete a message (soft delete)
 * @access  Private
 */
export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete
    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    // Soft delete: mark as deleted
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
      },
    });

    res.json({ message: 'Message deleted', deletedMessage: { id: updated.id } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/messages/threads/:threadId/mark-read
 * @desc    Mark all messages in thread as read
 * @access  Private
 */
export const markThreadAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { threadId } = req.params;

    // Verify user is participant
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: { participants: true },
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const isParticipant = thread.participants.some(p => p.id === userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Mark all messages from other users as read
    await prisma.message.updateMany({
      where: {
        threadId,
        NOT: { senderId: userId },
      },
      data: {
        readAt: new Date(),
      },
    });

    res.json({ message: 'Thread marked as read' });
  } catch (error) {
    next(error);
  }
};
