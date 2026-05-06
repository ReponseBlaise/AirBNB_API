import rateLimit from 'express-rate-limit';

const limiter = (max: number, message: string) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  message,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
});

export const generalLimiter = limiter(100, 'Too many requests from this IP, please try again later.');
export const strictLimiter  = limiter(20,  'Too many requests from this IP, please try again later.');
export const authLimiter    = limiter(5,   'Too many auth attempts, please try again later.');
