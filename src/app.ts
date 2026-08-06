import express, { type Express } from 'express';
import helmet from 'helmet';

import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { requestSizeMiddleware } from './middleware/request-size';
import { eventRouter } from './modules/events';

export const createApp = (): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(requestSizeMiddleware);
  app.use(rateLimitMiddleware);

  app.get('/health', (_request, response) => {
    response.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/events', eventRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
