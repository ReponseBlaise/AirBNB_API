import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';

const uid = (req: Request) => (req as any).userId;
const paginate = (req: Request, defaultLimit = 20) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || defaultLimit;
  return { skip: (page - 1) * limit, take: limit, page, limit };
};
const logAction = (performedByAdminId: string, action: string, reason: string, meta: object = {}) =>
  prisma.adminAction.create({ data: { performedByAdminId, action, reason, metadata: meta } });

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: uid(req) }, select: { role: true } });
    if (user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch (e) { next(e); }
};

export const suspendUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = uid(req);
    const { userId } = req.params;
    const { reason, duration } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason required' });

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (adminId === userId) return res.status(400).json({ error: 'Cannot suspend yourself' });

    const suspendedUntil = duration ? new Date(Date.now() + duration * 86400000) : null;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED', suspendedAt: new Date(), suspendedUntil, suspendReason: reason },
    });
    await logAction(adminId, 'SUSPEND_USER', reason, { duration, suspendedUntil, targetUserId: userId });
    res.json({ message: 'User suspended', user: updated });
  } catch (e) { next(e); }
};

export const banUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = uid(req);
    const { userId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason required' });

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (adminId === userId) return res.status(400).json({ error: 'Cannot ban yourself' });

    const updated = await prisma.user.update({ where: { id: userId }, data: { status: 'BANNED', bannedAt: new Date(), banReason: reason } });
    await logAction(adminId, 'BAN_USER', reason, { targetUserId: userId });
    res.json({ message: 'User banned', user: updated });
  } catch (e) { next(e); }
};

export const suspendListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = uid(req);
    const { listingId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason required' });

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const updated = await prisma.listing.update({ where: { id: listingId }, data: { status: 'SUSPENDED', suspendedAt: new Date(), suspendReason: reason } });
    await logAction(adminId, 'SUSPEND_LISTING', reason, { targetListingId: listingId });
    res.json({ message: 'Listing suspended', listing: updated });
  } catch (e) { next(e); }
};

export const manualRefund = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = uid(req);
    const { bookingId } = req.params;
    const { amount, reason } = req.body;
    if (!amount || !reason) return res.status(400).json({ error: 'amount and reason required' });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (amount > booking.totalCostGuest) return res.status(400).json({ error: 'Refund amount exceeds booking total' });

    const refund = await prisma.payment.create({
      data: { bookingId, amount, currency: 'USD', status: 'REFUNDED', stripePaymentIntentId: `admin_refund_${Date.now()}`, refundedAt: new Date(), refundReason: `Admin refund: ${reason}` },
    });
    await prisma.booking.update({ where: { id: bookingId }, data: { refundAmount: amount, paymentStatus: 'REFUNDED' } });
    await logAction(adminId, 'MANUAL_REFUND', reason, { targetBookingId: bookingId, refundAmount: amount });
    res.json({ message: 'Manual refund issued', refund });
  } catch (e) { next(e); }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, targetId } = req.query;
    const { skip, take, page, limit } = paginate(req, 50);
    const where: any = {
      ...(action && { action }),
      ...(targetId && { OR: [{ targetUserId: targetId }, { targetListingId: targetId }, { targetBookingId: targetId }] }),
    };
    const [logs, total] = await Promise.all([
      prisma.adminAction.findMany({
        where, skip, take,
        include: {
          performedByAdmin: { select: { id: true, name: true, email: true } },
          targetUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.adminAction.count({ where }),
    ]);
    res.json({ logs, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

export const getDisputes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status = 'OPEN' } = req.query;
    const { skip, take, page, limit } = paginate(req);
    const where = { status: status as any };
    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where, skip, take,
        include: {
          booking: { select: { id: true, guestId: true, hostId: true, totalCostGuest: true } },
          initiatedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dispute.count({ where }),
    ]);
    res.json({ disputes, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

export const resolveDispute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = uid(req);
    const { disputeId } = req.params;
    const { decision, refundAmount, reason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(decision)) return res.status(400).json({ error: 'Invalid decision (APPROVED or REJECTED)' });

    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId }, include: { booking: true } });
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    if (dispute.status !== 'OPEN') return res.status(400).json({ error: 'Dispute already resolved' });

    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: { status: decision === 'APPROVED' ? 'RESOLVED_APPROVED' : 'RESOLVED_REJECTED', resolvedAt: new Date(), resolvedBy: adminId, adminNotes: reason, refundAmount: decision === 'APPROVED' ? refundAmount : 0 },
    });

    if (decision === 'APPROVED' && refundAmount > 0) {
      await prisma.payment.create({
        data: { bookingId: dispute.bookingId, amount: refundAmount, currency: 'USD', status: 'REFUNDED', stripePaymentIntentId: `dispute_resolution_${Date.now()}`, refundedAt: new Date(), refundReason: `Dispute resolution approved: ${reason}` },
      });
    }

    await logAction(adminId, 'RESOLVE_DISPUTE', reason, { disputeId, decision, refundAmount });
    res.json({ message: 'Dispute resolved', dispute: updated });
  } catch (e) { next(e); }
};

export const getAdminStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, suspendedUsers, totalListings, activeListings, totalBookings, openDisputes] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.booking.count(),
      prisma.dispute.count({ where: { status: 'OPEN' } }),
    ]);
    res.json({ users: { total: totalUsers, suspended: suspendedUsers }, listings: { total: totalListings, active: activeListings }, bookings: { total: totalBookings }, disputes: { open: openDisputes } });
  } catch (e) { next(e); }
};
