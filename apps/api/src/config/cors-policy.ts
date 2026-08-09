import { env } from './env';

export interface CorsPolicy {
  readonly allowedOrigins: readonly string[];
}

export const corsPolicy: CorsPolicy = Object.freeze({
  allowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
});
