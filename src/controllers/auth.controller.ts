import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { createAccessToken, createRefreshToken } from '../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const VERIFICATION_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
const RESET_TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email format'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['HOST', 'GUEST']).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user with email and password
 * @access  Public
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters with uppercase, digit, and special character',
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const verificationExpiry = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerificationToken: verificationTokenHash,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }

    res.status(201).json({
      message: 'User registered successfully. Check your email to verify your account.',
      userId: user.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: tokenHash,
        emailVerificationExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user with email and password
 * @access  Public
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, deviceId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    // Create tokens
    const accessToken = createAccessToken(user.id, user.email, user.role);
    const refreshToken = createRefreshToken(user.id);

    // Store session
    const ipAddress = req.ip || '';
    const userAgent = req.get('user-agent') || '';
    const device = deviceId || 'web';

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        device,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Private
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = session.user;
    const accessToken = createAccessToken(user.id, user.email, user.role);

    res.json({
      accessToken,
      refreshToken: token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (refreshToken) {
      await prisma.session.deleteMany({
        where: { token: refreshToken },
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists (security)
      return res.json({ message: 'If email exists, password reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetExpiry: resetExpiry,
      },
    });

    // Send reset email
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    res.json({ message: 'If email exists, password reset link has been sent' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters with uppercase, digit, and special character',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters with uppercase, digit, and special character',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        avatar: true,
        bio: true,
        phone: true,
        createdAt: true,
        isSuperhost: true,
        totalEarnings: true,
        totalSpent: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};