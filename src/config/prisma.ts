import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const poolMax = Number(process.env['DB_POOL_MAX'] ?? 10);
const poolIdleTimeoutMs = Number(process.env['DB_IDLE_TIMEOUT_MS'] ?? 30000);
const poolConnectionTimeoutMs = Number(process.env['DB_CONNECTION_TIMEOUT_MS'] ?? 30000);
const queryRetries = Number(process.env['DB_QUERY_RETRIES'] ?? 2);
const queryRetryDelayMs = Number(process.env['DB_QUERY_RETRY_DELAY_MS'] ?? 250);

const pool = new Pool({
  connectionString,
  keepAlive: true,
  connectionTimeoutMillis: poolConnectionTimeoutMs,
  idleTimeoutMillis: poolIdleTimeoutMs,
  max: poolMax,
});

pool.on('error', (error: Error & { code?: string }) => {
  if (error.code === 'ECONNRESET') {
    console.error('Postgres connection reset (ECONNRESET). The pool will retry on next query.');
    return;
  }

  console.error('Unexpected Postgres pool error:', error);
});

const adapter = new PrismaPg(pool);

const basePrisma = new PrismaClient({ adapter });

function isTransientDbError(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code)
      : '';
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: string }).message)
      : '';

  return (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    message.includes('ECONNRESET') ||
    message.includes('Connection terminated due to connection timeout') ||
    message.includes('Connection terminated unexpectedly')
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({
        model,
        operation,
        args,
        query,
      }: {
        model?: string;
        operation: string;
        args: unknown;
        query: (args: unknown) => Promise<unknown>;
      }) {
        let attempt = 0;

        while (true) {
          try {
            return await query(args);
          } catch (error) {
            if (!isTransientDbError(error) || attempt >= queryRetries) {
              throw error;
            }

            attempt += 1;
            const delay = queryRetryDelayMs * attempt;
            console.warn(
              `Transient DB error on ${model ?? 'raw'}.${operation}; retry ${attempt}/${queryRetries} in ${delay}ms`
            );
            await sleep(delay);
          }
        }
      },
    },
  },
});

export async function connectDB() {
  await basePrisma.$connect();
  console.log('Database connected');
}

process.on('beforeExit', async () => {
  await basePrisma.$disconnect();
});

export default prisma;
