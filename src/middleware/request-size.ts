import express from 'express';

import { abusePolicy, type AbusePolicy } from '../config/abuse-policy';

export const createRequestSizeMiddleware = (policy: AbusePolicy = abusePolicy) => {
  return express.json({
    limit: policy.maxRequestSize,
  });
};

export const requestSizeMiddleware = createRequestSizeMiddleware();
