import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import {
  AppError,
  InternalServerError,
  NotFoundError,
  PayloadTooLargeError,
  ValidationError,
} from '../shared/errors';
import { logger } from '../shared/logger';

const sendErrorResponse: ErrorRequestHandler = (error, _request, response, _next) => {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    appError = new ValidationError('Request validation failed.', {
      issues: error.issues,
    });
  } else if ((error as { type?: string } | undefined)?.type === 'entity.too.large') {
    appError = new PayloadTooLargeError();
  } else {
    appError = new InternalServerError();
  }

  if (appError.statusCode >= 500) {
    logger.error('Unhandled application error.', { error });
  }

  response.status(appError.statusCode).json({
    error: {
      code: appError.code,
      details: appError.details,
      message: appError.message,
    },
  });
};

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new NotFoundError(`Route ${request.method} ${request.originalUrl} was not found.`));
};

export const errorHandler = sendErrorResponse;
