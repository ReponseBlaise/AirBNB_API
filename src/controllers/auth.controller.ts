import type { NextFunction, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { stripSensitiveUserFields } from '../utils/userSanitizer.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { sendEmail } from '../config/email.js';
import { welcomeEmail, passwordResetEmail } from '../templates/emails.js';

const userModel = (prisma as any).user;

const jwtSecret = (process.env['JWT_SECRET'] ?? '') as jwt.Secret;
const jwtExpiresIn = process.env['JWT_EXPIRES_IN'] ?? '7d';

if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is not set');
}

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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

function signToken(userId: number, role: string) {
  return jwt.sign({ userId, role }, jwtSecret, { expiresIn: jwtExpiresIn as NonNullable<SignOptions['expiresIn']> });
}


export async function register(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    const existingUser = await userModel.findFirst({
      where: {
        OR: [{ email: result.data.email }, { username: result.data.username }],
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }

    const hashedPassword = await bcrypt.hash(result.data.password, 10);

    const user = await userModel.create({
      data: {
        name: result.data.name,
        email: result.data.email,
        username: result.data.username,
        phone: 'N/A',
        password: hashedPassword,
        role: result.data.role ?? 'GUEST',
      },
    });

    res.status(201).json(stripSensitiveUserFields(user));

    try {
      await sendEmail(user.email, 'Welcome to Airbnb!', welcomeEmail(user.name, user.role));
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    return;
  } catch (error) {
    next(error);
  }
}

export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    const user = await userModel.findUnique({
      where: { email: result.data.email },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
        password: true,
        resetToken: true,
        resetTokenExpiry: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(result.data.password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id, user.role);

    return res.json({
      token,
      user: stripSensitiveUserFields(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await userModel.findUnique({
      where: { id: req.userId },
      include: {
        profile: true,
        listings: req.role === 'HOST' || req.role === 'ADMIN' ? { include: { _count: { select: { bookings: true } } } } : false,
        bookings:
          req.role === 'GUEST' || req.role === 'ADMIN'
            ? {
                include: {
                  listing: { select: { id: true, title: true, location: true, pricePerNight: true } },
                },
              }
            : false,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(stripSensitiveUserFields(user));
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const result = changePasswordSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    const user = await userModel.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
        password: true,
        resetToken: true,
        resetTokenExpiry: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentMatches = await bcrypt.compare(result.data.currentPassword, user.password);

    if (!currentMatches) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    const hashedPassword = await bcrypt.hash(result.data.newPassword, 10);

    await userModel.update({
      where: { id: req.userId },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    const user = await userModel.findUnique({
      where: { email: result.data.email },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
        password: true,
        resetToken: true,
        resetTokenExpiry: true,
      },
    });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
      const resetUrl = `${process.env['API_URL'] ?? 'http://localhost:3000'}/auth/reset-password/${rawToken}`;

      await userModel.update({
        where: { id: user.id },
        data: {
          resetToken: hashedToken,
          resetTokenExpiry,
        },
      });

      try {
        await sendEmail(user.email, 'Reset your password', passwordResetEmail(user.name, resetUrl));
      } catch (emailError) {
        console.error('Password reset email failed:', emailError);
      }
    }

    return res.status(200).json({ message: 'If that email is registered, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = resetPasswordSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    const rawToken = req.params['token'];

    if (!rawToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await userModel.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
        password: true,
        resetToken: true,
        resetTokenExpiry: true,
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(result.data.password, 10);

    await userModel.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
}