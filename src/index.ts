import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { setupSwagger } from './config/swagger.js';
import v1Router from './routes/v1/index.js';
import uploadRouter from './routes/upload.routes.js';
import { connectDB } from './config/prisma.js';
import { errorHandler } from './middlewares/errorHandler.js';
import compression from 'compression';
import { generalLimiter, strictLimiter, authLimiter } from './middlewares/rateLimiter.js';
import morgan from 'morgan';
import { deprecateV1 } from './middlewares/deprecation.middleware.js';

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true, // Enable if you need to send cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-ID'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Performance middleware
app.use(compression());

// Request logging
app.use(process.env['NODE_ENV'] === 'production' ? morgan('combined') : morgan('dev'));

setupSwagger(app);

// Rate limiting middleware
app.use(generalLimiter);
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/bookings', strictLimiter);

// Mount upload routes before v1 router so multipart listing photo uploads
// are handled by upload controller instead of placeholder listing endpoints.
app.use('/api/v1', uploadRouter);

// Mount versioned API (v1)
app.use('/api/v1', deprecateV1, v1Router);

// Rest of your code remains the same...
app.get('/', (_req, res) =>
  res.json({
    message: 'AirBNB API',
    docs: '/api-docs',
    health: '/health',
    api_base: '/api/v1',
  })
);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

async function main() {
  await connectDB();
  const PORT = Number(process.env['PORT']) || 3000;
  const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the process using it or change PORT in .env.`);
      process.exit(1);
    }

    console.error(error);
    process.exit(1);
  });
}

main();