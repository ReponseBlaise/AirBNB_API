import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

/**
 * Middleware to check admin role
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/admin/users/:userId/suspend
 * @desc    Suspend a user account
 * @access  Private (Admin)
 */
export const suspendUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).userId;
    const { userId } = req.params;
    const { reason, duration } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent self-suspension
    if (adminId === userId) {
      return res.status(400).json({ error: 'Cannot suspend yourself' });
    }

    // Calculate suspension end date
    const suspendedUntil = duration
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
      : null;

    // Update user status
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedUntil,
        suspendReason: reason,
      },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        performedByAdminId: adminId,
        targetUserId: userId,
        action: 'SUSPEND_USER',
        reason,
        metadata: { duration, suspendedUntil },
      },
    });

    res.json({ message: 'User suspended', user: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/admin/users/:userId/ban
 * @desc    Permanently ban a user account
 * @access  Private (Admin)
 */
export const banUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).userId;
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (adminId === userId) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'BANNED',
        bannedAt: new Date(),
        banReason: reason,
      },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        performedByAdminId: adminId,
        targetUserId: userId,
        action: 'BAN_USER',
        reason,
      },
    });

    res.json({ message: 'User banned', user: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/admin/listings/:listingId/suspend
 * @desc    Suspend a listing
 * @access  Private (Admin)
 */
export const suspendListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).userId;
    const { listingId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendReason: reason,
      },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        performedByAdminId: adminId,
        targetListingId: listingId,
        action: 'SUSPEND_LISTING',
        reason,
      },
    });

    res.json({ message: 'Listing suspended', listing: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/admin/bookings/:bookingId/refund
 * @desc    Issue manual refund for a booking
 * @access  Private (Admin)
 */
export const manualRefund = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).userId;
    const { bookingId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({ error: 'amount and reason required' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (amount > booking.totalCostGuest) {
      return res.status(400).json({ error: 'Refund amount exceeds booking total' });
    }

    // Create refund payment record
    const refund = await prisma.payment.create({
      data: {
        bookingId,
        amount,
        currency: 'USD',
        status: 'REFUNDED',
        stripePaymentIntentId: `admin_refund_${Date.now()}`,
        refundedAt: new Date(),
        refundReason: `Admin refund: ${reason}`,
      },
    });

    // Update booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        refundAmount: amount,
        paymentStatus: 'REFUNDED',
      },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        performedByAdminId: adminId,
        targetBookingId: bookingId,
        action: 'MANUAL_REFUND',
        reason,
        metadata: { refundAmount: amount },
      },
    });

    res.json({ message: 'Manual refund issued', refund });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Retrieve admin action logs
 * @access  Private (Admin)
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, targetId, page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    let where: any = {};
    if (action) {
      where.action = action;
    }
    if (targetId) {
      where.OR = [
        { targetUserId: targetId },
        { targetListingId: targetId },
        { targetBookingId: targetId },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.adminAction.findMany({
        where,
        include: {
          performedByAdmin: {
            select: { id: true, name: true, email: true },
          },
          targetUser: {
            select: { id: true, name: true, email: true },
          },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.adminAction.count({ where }),
    ]);

    res.json({
      logs,
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
 * @route   GET /api/v1/admin/disputes
 * @desc    Get all disputes for resolution
 * @access  Private (Admin)
 */
export const getDisputes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status = 'OPEN', page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where: { status: status as any },
        include: {
          booking: {
            select: { id: true, guestId: true, hostId: true, totalCostGuest: true },
          },
          initiatedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dispute.count({ where: { status: status as any } }),
    ]);

    res.json({
      disputes,
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
 * @route   PUT /api/v1/admin/disputes/:disputeId/resolve
 * @desc    Resolve a dispute with refund decision
 * @access  Private (Admin)
 */
export const resolveDispute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).userId;
    const { disputeId } = req.params;
    const { decision, refundAmount, reason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision (APPROVED or REJECTED)' });
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { booking: true },
    });

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    if (dispute.status !== 'OPEN') {
      return res.status(400).json({ error: 'Dispute already resolved' });
    }

    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: decision === 'APPROVED' ? 'RESOLVED_APPROVED' : 'RESOLVED_REJECTED',
        resolvedAt: new Date(),
        resolvedBy: adminId,
        adminNotes: reason,
        refundAmount: decision === 'APPROVED' ? refundAmount : 0,
      },
    });

    // If approved, create refund
    if (decision === 'APPROVED' && refundAmount > 0) {
      await prisma.payment.create({
        data: {
          bookingId: dispute.bookingId,
          amount: refundAmount,
          currency: 'USD',
          status: 'REFUNDED',
          stripePaymentIntentId: `dispute_resolution_${Date.now()}`,
          refundedAt: new Date(),
          refundReason: `Dispute resolution approved: ${reason}`,
        },
      });
    }

    // Log admin action
    await prisma.adminAction.create({
      data: {
        performedByAdminId: adminId,
        action: 'RESOLVE_DISPUTE',
        reason,
        metadata: { disputeId, decision, refundAmount },
      },
    });

    res.json({ message: 'Dispute resolved', dispute: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin)
 */
export const getAdminStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, suspendedUsers, totalListings, activeListings, totalBookings, openDisputes] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'SUSPENDED' } }),
        prisma.listing.count(),
        prisma.listing.count({ where: { status: 'ACTIVE' } }),
        prisma.booking.count(),
        prisma.dispute.count({ where: { status: 'OPEN' } }),
      ]);

    res.json({
      users: {
        total: totalUsers,
        suspended: suspendedUsers,
      },
      listings: {
        total: totalListings,
        active: activeListings,
      },
      bookings: {
        total: totalBookings,
      },
      disputes: {
        open: openDisputes,
      },
    });
  } catch (error) {
    next(error);
  }
};
