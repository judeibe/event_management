import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, Prisma} from "@/generated/prisma/client";

import { env } from '../config/env';
import { logger } from '../shared/logger';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prismaLogs: Prisma.LogLevel[] =
  env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'];

const adapter = new PrismaBetterSqlite3({ url: env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogs,
    adapter,
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

let lifecycleHooksAttached = false;

export const connectToDatabase = async (): Promise<void> => {
  await prisma.$connect();
  logger.info('Database connection established.');
};

export const disconnectFromDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('Database connection closed.');
};

export const setupPrismaLifecycleHooks = (): void => {
  if (lifecycleHooksAttached) {
    return;
  }

  lifecycleHooksAttached = true;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info('Received shutdown signal.', { signal });

    try {
      await disconnectFromDatabase();
      process.exit(0);
    } catch (error) {
      logger.error('Failed during graceful shutdown.', { error, signal });
      process.exit(1);
    }
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
};
