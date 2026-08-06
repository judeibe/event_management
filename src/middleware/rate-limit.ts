import { rateLimit } from 'express-rate-limit';

import { abusePolicy, type AbusePolicy } from '../config/abuse-policy';

export const createRateLimitMiddleware = (policy: AbusePolicy = abusePolicy) => {
  return rateLimit({
    legacyHeaders: false,
    standardHeaders: true,
    windowMs: policy.rateLimitWindowMs,
    limit: policy.rateLimitMaxRequests,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    },
  });
};

export const rateLimitMiddleware = createRateLimitMiddleware();
