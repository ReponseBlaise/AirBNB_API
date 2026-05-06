import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

/**
 * @route   GET /api/v1/profile/:userId
 * @desc    Get user profile
 * @access  Public
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        languagesSpoken: true,
        isSuperhost: true,
        hostResponseRate: true,
        hostResponseTime: true,
        hostCancellationRate: true,
        createdAt: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    res.json({
      ...user,
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/profile
 * @desc    Update user profile
 * @access  Private
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { name, bio, languagesSpoken, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(bio && { bio }),
        ...(languagesSpoken && { languagesSpoken }),
        ...(phone && { phone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        languagesSpoken: true,
        phone: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/profile/switch-mode
 * @desc    Switch between guest and host mode
 * @access  Private
 */
export const switchMode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { preferredRole } = req.body;

    if (!['GUEST', 'HOST'].includes(preferredRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        preferredRole,
      },
      select: {
        id: true,
        role: true,
        preferredRole: true,
        name: true,
      },
    });

    res.json({
      message: `Switched to ${preferredRole} mode`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/profile/notification-preferences
 * @desc    Update notification preferences
 * @access  Private
 */
export const updateNotificationPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const preferences = req.body; // { email, push, sms }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: preferences,
      },
      select: {
        id: true,
        notificationPreferences: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/profile/payment-methods
 * @desc    Get user's payment methods
 * @access  Private
 */
export const getPaymentMethods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const paymentMethods = await prisma.paymentMethod_.findMany({
      where: { userId },
      select: {
        id: true,
        methodType: true,
        last4Digits: true,
        expiryMonth: true,
        expiryYear: true,
        isDefault: true,
        createdAt: true,
      },
    });

    res.json(paymentMethods);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/profile/payment-methods
 * @desc    Add a new payment method (Stripe tokenized)
 * @access  Private
 */
export const addPaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { methodType, stripeTokenId, last4Digits, expiryMonth, expiryYear, isDefault } = req.body;

    if (!stripeTokenId) {
      return res.status(400).json({ error: 'Stripe token required' });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.paymentMethod_.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const paymentMethod = await prisma.paymentMethod_.create({
      data: {
        userId,
        methodType,
        stripeTokenId,
        last4Digits,
        expiryMonth,
        expiryYear,
        isDefault: isDefault || false,
      },
    });

    res.status(201).json(paymentMethod);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/profile/payment-methods/:paymentMethodId
 * @desc    Remove a payment method
 * @access  Private
 */
export const deletePaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { paymentMethodId } = req.params;

    const paymentMethod = await prisma.paymentMethod_.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod || paymentMethod.userId !== userId) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    await prisma.paymentMethod_.delete({
      where: { id: paymentMethodId },
    });

    res.json({ message: 'Payment method deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/profile/:userId/reviews
 * @desc    Get reviews for a user (as host or guest)
 * @access  Public
 */
export const getUserReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { type = 'all' } = req.query; // guest, host, all

    let where: any = {};

    if (type === 'guest') {
      where = { guestId: userId, isGuestReview: true };
    } else if (type === 'host') {
      where = { hostId: userId, isGuestReview: false };
    } else {
      where = {
        OR: [
          { guestId: userId, isGuestReview: true },
          { hostId: userId, isGuestReview: false },
        ],
      };
    }

    const reviews = await prisma.review.findMany({
      where: {
        ...where,
        isPublished: true,
      },
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/profile/bookings
 * @desc    Get user's bookings (as guest or host)
 * @access  Private
 */
export const getUserBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { type = 'guest' } = req.query; // guest, host

    let where: any = {};

    if (type === 'host') {
      where = { hostId: userId };
    } else {
      where = { guestId: userId };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            address: true,
            basePricePerNight: true,
            photos: { take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
};
