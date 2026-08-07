import type { RequestHandler } from 'express';
import { ZodError, type ZodType } from 'zod';

import { ValidationError } from '../shared/errors';

export const validateRequest = <TSchema extends ZodType>(schema: TSchema): RequestHandler => {
  return (request, _response, next) => {
    try {
      request.body = schema.parse(request.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError('Request validation failed.', {
            issues: error.issues.map((issue) => ({
              code: issue.code,
              message: issue.message,
              path: issue.path,
            })),
          }),
        );

        return;
      }

      next(error);
    }
  };
};
