import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { createAccessToken, createRefreshToken } from '../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const VERIFICATION_TOKEN_EXPIRY = 60 * 60 * 1000;
const RESET_TOKEN_EXPIRY = 30 * 60 * 1000;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('hex');
const wrap = (fn: Function) => async (req: Request, res: Response, next: NextFunction) => {
  try { await fn(req, res, next); } catch (e) { next(e); }
};

export const register = wrap(async (req: Request, res: Response) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });
  if (!PASSWORD_REGEX.test(password)) return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, digit, and special character' });
  if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: 'Email already registered' });

  const verificationToken = randomToken();
  const user = await prisma.user.create({
    data: {
      name, email,
      password: await bcrypt.hash(password, 10),
      emailVerificationToken: hashToken(verificationToken),
      emailVerificationExpiry: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY),
    },
  });

  sendVerificationEmail(email, verificationToken).catch(e => console.error('Verification email failed:', e));
  res.status(201).json({ message: 'User registered successfully. Check your email to verify your account.', userId: user.id });
});

export const verifyEmail = wrap(async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Invalid verification token' });

  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: hashToken(token), emailVerificationExpiry: { gt: new Date() } },
  });
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerificationToken: null, emailVerificationExpiry: null },
  });
  res.json({ message: 'Email verified successfully' });
});

export const login = wrap(async (req: Request, res: Response) => {
  const { email, password, deviceId } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.emailVerified) return res.status(403).json({ error: 'Please verify your email first' });

  const accessToken = createAccessToken(user.id, user.email, user.role);
  const refreshToken = createRefreshToken(user.id);

  await prisma.session.create({
    data: {
      userId: user.id, token: refreshToken,
      device: deviceId || 'web',
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  res.json({ message: 'Login successful', accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export const refreshToken = wrap(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  if (!token) return res.status(400).json({ error: 'Refresh token required' });

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return res.status(401).json({ error: 'Invalid or expired refresh token' });

  res.json({ accessToken: createAccessToken(session.user.id, session.user.email, session.user.role), refreshToken: token });
});

export const logout = wrap(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) await prisma.session.deleteMany({ where: { token: refreshToken } });
  res.json({ message: 'Logged out successfully' });
});

export const forgotPassword = wrap(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const msg = { message: 'If email exists, password reset link has been sent' };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json(msg);

  const resetToken = randomToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: hashToken(resetToken), passwordResetExpiry: new Date(Date.now() + RESET_TOKEN_EXPIRY) },
  });

  sendPasswordResetEmail(email, resetToken).catch(e => console.error('Reset email failed:', e));
  res.json(msg);
});

export const resetPassword = wrap(async (req: Request, res: Response) => {
  const { token, password, confirmPassword } = req.body;
  if (!token || !password || !confirmPassword) return res.status(400).json({ error: 'Missing required fields' });
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });
  if (!PASSWORD_REGEX.test(password)) return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, digit, and special character' });

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: hashToken(token), passwordResetExpiry: { gt: new Date() } },
  });
  if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(password, 10), passwordResetToken: null, passwordResetExpiry: null },
  });
  res.json({ message: 'Password reset successfully' });
});

export const changePassword = wrap(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { currentPassword, newPassword, confirmPassword } = req.body;
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
  const userId = (req as any).userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerified: true, role: true, avatar: true, bio: true, phone: true, createdAt: true, isSuperhost: true, totalEarnings: true, totalSpent: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});
