import jwt, { type JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'replace-with-a-long-random-secret-key';

export interface TokenPayload extends JwtPayload { userId: string; email?: string; role: string; }

export const createAccessToken = (userId: string, email: string, role: string) =>
  jwt.sign({ userId, email: email ?? '', role }, JWT_SECRET, { expiresIn: '15m' });
export const createRefreshToken = (userId: string) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

export const verifyToken = (token: string): TokenPayload | null => {
  try { return jwt.verify(token, JWT_SECRET) as TokenPayload; } catch { return null; }
};
