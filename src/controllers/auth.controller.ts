import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { createAccessToken, createRefreshToken } from '../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

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

  const accessToken = createAccessToken(user.id, user.email ?? '', user.role);
  const refreshToken = createRefreshToken(user.id);

  res.json({
    message: 'Login successful',
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email ?? '', username: user.username, phone: user.phone, role: user.role },
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

export const oauthGoogle = wrap(async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  // Verify the token with Google's tokeninfo endpoint (suitable for sandbox/dev)
  const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!resp.ok) return res.status(400).json({ error: 'Invalid Google idToken' });
  const payload = (await resp.json()) as {
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
  };

  // payload contains email, email_verified, name, picture, sub
  if (!payload.email || payload.email_verified !== 'true' && payload.email_verified !== true) {
    return res.status(400).json({ error: 'Email not verified by Google' });
  }

  const email = payload.email;
  if (!email) return res.status(400).json({ error: 'Invalid Google idToken' });
  const name: string = payload.name ?? '';
  const avatar: string | undefined = payload.picture;

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // create a lightweight user account for OAuth login
    user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        username: (email.split('@')[0] + Math.floor(Math.random() * 10000)).slice(0, 32),
        phone: '',
        password: await bcrypt.hash(randomToken(), 10),
        role: 'GUEST',
        avatar,
      },
    });
  }

  const accessToken = createAccessToken(user.id, user.email ?? '', user.role);
  const refreshToken = createRefreshToken(user.id);

  res.json({ message: 'OAuth login successful', accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email ?? '', role: user.role, avatar: user.avatar ?? undefined } });
});

export const oauthApple = wrap(async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  // NOTE: Proper Apple ID token verification requires fetching Apple's JWKS and
  // verifying the JWT signature. For development convenience we decode the token
  // and accept it, but in production you MUST verify the signature and audience.
  const decoded = jwt.decode(idToken) as any | null;
  if (!decoded || !decoded.email) return res.status(400).json({ error: 'Invalid Apple idToken' });

  const email = decoded.email;
  if (!email) return res.status(400).json({ error: 'Invalid Apple idToken' });
  const name = decoded.name ?? '';

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        username: (email.split('@')[0] + Math.floor(Math.random() * 10000)).slice(0, 32),
        phone: '',
        password: await bcrypt.hash(randomToken(), 10),
        role: 'GUEST',
      },
    });
  }

  const accessToken = createAccessToken(user.id, user.email ?? '', user.role);
  const refreshToken = createRefreshToken(user.id);
  
  res.json({ message: 'OAuth login successful (apple)', accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email ?? '', role: user.role } });
});
