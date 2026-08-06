import type { RequestHandler } from 'express';

import { ValidationError } from '../../shared/errors';
import { PrismaRegistrationRepository } from './registration.repository';
import { RegistrationService } from './registration.service';
import {
  registrationEventIdParamsSchema,
  mapRegistrationToResponse,
  type CreateRegistrationBody,
} from './registration.types';

const parseEventId = (eventIdValue: unknown): string => {
  const parsed = registrationEventIdParamsSchema.safeParse({ eventId: eventIdValue });

  if (!parsed.success) {
    throw new ValidationError('Request validation failed.', {
      issues: parsed.error.issues,
    });
  }

  return parsed.data.eventId;
};

export class RegistrationController {
  public constructor(private readonly service: RegistrationService) {}

  public readonly createRegistration: RequestHandler = async (request, response, next) => {
    try {
      const eventId = parseEventId(request.params.eventId);
      const registration = await this.service.createRegistration(
        eventId,
        request.body as CreateRegistrationBody,
      );

      response.status(201).json({ data: mapRegistrationToResponse(registration) });
    } catch (error) {
      next(error);
    }
  };
}

export const registrationController = new RegistrationController(
  new RegistrationService(new PrismaRegistrationRepository()),
);
