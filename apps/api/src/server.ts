import { app } from './app';
import { env } from './config/env';
import { connectToDatabase, setupPrismaLifecycleHooks } from './db/client';
import { logger } from './shared/logger';

const startServer = async (): Promise<void> => {
  setupPrismaLifecycleHooks();
  await connectToDatabase();

  app.listen(env.PORT, () => {
    logger.info('Server started successfully.', {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
    });
  });
};

startServer().catch((error: unknown) => {
  logger.error('Failed to start server.', { error });
  process.exit(1);
});
