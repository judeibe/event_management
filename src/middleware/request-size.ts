import express, { type RequestHandler } from 'express';

import { abusePolicy, type AbusePolicy } from '../config/abuse-policy';
import { logger } from '../shared/logger';

const buildRequestLogMeta = (request: {
  method?: string | undefined;
  originalUrl?: string | undefined;
  url?: string | undefined;
}) => ({
  method: request.method ?? 'UNKNOWN',
  path: request.originalUrl ?? request.url ?? 'unknown',
});

export const createRequestSizeMiddleware = (
  policy: AbusePolicy = abusePolicy,
): RequestHandler => {
  const parser = express.json({
    limit: policy.maxRequestSize,
    verify: (request, _response, buffer) => {
      logger.debug('Validated request payload size.', {
        ...buildRequestLogMeta(request),
        payloadBytes: buffer.length,
      });
    },
  });

  return (request, response, next) => {
    parser(request, response, (error) => {
      if ((error as { type?: string } | undefined)?.type === 'entity.too.large') {
        logger.warn('Blocked request because payload exceeded configured size.', {
          ...buildRequestLogMeta(request),
          maxRequestSize: policy.maxRequestSize,
        });
      }

      next(error);
    });
  };
};

export const requestSizeMiddleware = createRequestSizeMiddleware();
