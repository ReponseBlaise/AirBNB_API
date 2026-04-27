import 'dotenv/config';
import express from 'express';
import authRouter from './routes/auth.routes.js';
import usersRouter from './routes/users.routes.js';
import listingsRouter from './routes/listings.routes.js';
import bookingsRouter from './routes/bookings.routes.js';
import uploadRouter from './routes/upload.routes.js';
import { connectDB } from './config/prisma.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();
app.use(express.json());

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/listings', listingsRouter);
app.use('/bookings', bookingsRouter);
app.use('/', uploadRouter);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler (must be last)
app.use(errorHandler);

async function main() {
  await connectDB();
  const PORT = process.env.PORT;
  const server = app.listen(PORT, () => console.log(`Running on port ${PORT}`));

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
