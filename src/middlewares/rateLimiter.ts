import rateLimit from 'express-rate-limit';

const isProduction = process.env['NODE_ENV'] === 'production';
const windowMs = Number(process.env['RATE_LIMIT_WINDOW_MS'] ?? 15 * 60 * 1000);

const parseLimit = (envName: string, prodDefault: number, devDefault: number) => {
  const configured = process.env[envName];
  if (configured) return Number(configured);
  return isProduction ? prodDefault : devDefault;
};

const limiter = (max: number, message: string) => rateLimit({
  windowMs,
  max,
  message,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
});

export const generalLimiter = limiter(
  parseLimit('RATE_LIMIT_GENERAL_MAX', 100, 1000),
  'Too many requests from this IP, please try again later.',
);

export const strictLimiter = limiter(
  parseLimit('RATE_LIMIT_STRICT_MAX', 20, 300),
  'Too many requests from this IP, please try again later.',
);

export const authLimiter = limiter(
  parseLimit('RATE_LIMIT_AUTH_MAX', 5, 200),
  'Too many auth attempts, please try again later.',
);

// AI-specific rate limiter: stricter limits for expensive operations
export const aiLimiter = limiter(
  parseLimit('RATE_LIMIT_AI_MAX', 10, 50),
  'Too many AI requests. Please wait a moment and try again.',
);
