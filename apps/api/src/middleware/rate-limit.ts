import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

import { abusePolicy, type AbusePolicy } from '../config/abuse-policy';
import { logger } from '../shared/logger';

const buildRequestLogMeta = (request: Request) => {
  const forwardedFor = request.headers['x-forwarded-for'];
  const clientRef = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim() ?? request.ip;

  return {
    clientRef: clientRef ?? 'unknown',
    method: request.method,
    path: request.originalUrl,
  };
};

export const createRateLimitMiddleware = (
  policy: AbusePolicy = abusePolicy,
): RequestHandler => {
  const limiter = rateLimit({
    legacyHeaders: false,
    standardHeaders: true,
    windowMs: policy.rateLimitWindowMs,
    limit: policy.rateLimitMaxRequests,
    handler: (request, response) => {
      logger.warn('Blocked request because rate limit was exceeded.', {
        ...buildRequestLogMeta(request),
        rateLimitMaxRequests: policy.rateLimitMaxRequests,
        rateLimitWindowMs: policy.rateLimitWindowMs,
      });

      response.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      });
    },
  });

  return (request, response, next) => {
    logger.debug('Evaluating request against rate limit policy.', buildRequestLogMeta(request));
    limiter(request, response, next);
  };
};

export const rateLimitMiddleware = createRateLimitMiddleware();
