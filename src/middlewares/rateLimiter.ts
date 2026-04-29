import rateLimit from 'express-rate-limit';

/**
 * General rate limiter: 100 requests per 15 minutes
 * Applied to all routes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  statusCode: 429,
});

/**
 * Strict rate limiter: 20 requests per 15 minutes
 * Applied to POST routes
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
});

/**
 * Auth limiter: 5 requests per 15 minutes for sensitive endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many auth attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
});
