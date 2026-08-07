import { env } from './env';

export interface AbusePolicy {
  readonly maxRequestSize: string;
  readonly rateLimitMaxRequests: number;
  readonly rateLimitWindowMs: number;
}

export const abusePolicy: AbusePolicy = Object.freeze({
  maxRequestSize: env.MAX_REQUEST_SIZE,
  rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
});
