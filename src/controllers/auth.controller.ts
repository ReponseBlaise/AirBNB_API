import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { createAccessToken, createRefreshToken } from '../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const RESET_TOKEN_EXPIRY = 30 * 60 * 1000;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('hex');

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };

export const register = wrap(async (req: Request, res: Response) => {
  const { name, email, username, phone, password, confirmPassword, role = 'GUEST' } = req.body;

  if (!name || !email || !username || !phone || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, digit, and special character' });
  }

  if (!['GUEST', 'HOST', 'ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) return res.status(409).json({ error: 'Email or username already registered' });

  const resetToken = randomToken();
  const user = await prisma.user.create({
    data: {
      name,
      email,
      username,
      phone,
      password: await bcrypt.hash(password, 10),
      role,
      resetToken: hashToken(resetToken),
      resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_EXPIRY),
    },
  });

  sendVerificationEmail(email, resetToken).catch(() => undefined);
  res.status(201).json({ message: 'User registered successfully', userId: user.id });
});

export const verifyEmail = wrap(async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) return res.status(400).json({ error: 'Invalid verification token' });

  const user = await prisma.user.findFirst({
    where: { resetToken: hashToken(token), resetTokenExpiry: { gt: new Date() } },
  });

  if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: null, resetTokenExpiry: null },
  });

  res.json({ message: 'Email verified successfully' });
});

export const login = wrap(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const accessToken = createAccessToken(user.id, user.email, user.role);
  const refreshToken = createRefreshToken(user.id);

  res.json({
    message: 'Login successful',
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, username: user.username, phone: user.phone, role: user.role },
  });
});

export const refreshToken = wrap(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  if (!token) return res.status(400).json({ error: 'Refresh token required' });

  res.json({ accessToken: createAccessToken('', '', 'GUEST'), refreshToken: token });
});

export const logout = wrap(async (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export const forgotPassword = wrap(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json({ message: 'If email exists, password reset link has been sent' });

  const resetToken = randomToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: hashToken(resetToken), resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_EXPIRY) },
  });

  sendPasswordResetEmail(email, resetToken).catch(() => undefined);
  res.json({ message: 'If email exists, password reset link has been sent' });
});

export const resetPassword = wrap(async (req: Request, res: Response) => {
  const { token, password, confirmPassword } = req.body;
  if (!token || !password || !confirmPassword) return res.status(400).json({ error: 'Missing required fields' });
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });
  if (!PASSWORD_REGEX.test(password)) return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, digit, and special character' });

  const user = await prisma.user.findFirst({
    where: { resetToken: hashToken(token), resetTokenExpiry: { gt: new Date() } },
  });

  if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(password, 10), resetToken: null, resetTokenExpiry: null },
  });

  res.json({ message: 'Password reset successfully' });
});

export const changePassword = wrap(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string | undefined;
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing required fields' });
  if (newPassword !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(401).json({ error: 'Current password is incorrect' });
  if (!PASSWORD_REGEX.test(newPassword)) return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, digit, and special character' });

  await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 10) } });
  res.json({ message: 'Password changed successfully' });
});

export const getMe = wrap(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, username: true, phone: true, avatar: true, createdAt: true },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});
