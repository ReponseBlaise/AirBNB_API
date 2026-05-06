import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import prisma from '../config/prisma.js';

const jwtSecret = (process.env.JWT_SECRET ?? '') as jwt.Secret;
if (!jwtSecret) throw new Error('JWT_SECRET environment variable is not set');

export interface AuthRequest extends Request { userId?: string; role?: string; }
type TokenPayload = JwtPayload & { userId?: string; role?: string; };

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing or invalid authorization header' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing or invalid authorization header' });

  try {
    const payload = jwt.verify(token, jwtSecret) as TokenPayload;
    if (typeof payload === 'string' || typeof payload.userId !== 'string' || typeof payload.role !== 'string') {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } });
    if (!user) return res.status(401).json({ error: 'User no longer exists' });

    req.userId = payload.userId;
    req.role = payload.role;
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return res.status(401).json({ error: 'Token expired' });
    if (err instanceof jwt.JsonWebTokenError) return res.status(401).json({ error: 'Invalid token signature or format' });
    if (process.env.NODE_ENV !== 'production') console.error('JWT auth error:', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export const requireHost = (req: AuthRequest, res: Response, next: NextFunction) =>
  req.role === 'HOST' || req.role === 'ADMIN' ? next() : res.status(403).json({ error: 'Host access required' });

export const requireGuest = (req: AuthRequest, res: Response, next: NextFunction) =>
  req.role === 'GUEST' || req.role === 'ADMIN' ? next() : res.status(403).json({ error: 'Guest access required' });

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) =>
  req.role === 'ADMIN' ? next() : res.status(403).json({ error: 'Admin access required' });
