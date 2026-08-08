import type { RequestHandler } from 'express';

import { ValidationError } from '@/shared/errors';
import { PrismaEventRepository } from './event.repository';
import { EventService } from './event.service';
import { eventIdParamsSchema, mapEventToResponse, type CreateEventBody, type UpdateEventBody } from './event.types';

const parseEventId = (eventIdValue: unknown): string => {
  const parsed = eventIdParamsSchema.safeParse({ eventId: eventIdValue });

  if (!parsed.success) {
    throw new ValidationError('Request validation failed.', {
      issues: parsed.error.issues,
    });
  }

  return parsed.data.eventId;
};

export class EventController {
  public constructor(private readonly service: EventService) {}

  public readonly createEvent: RequestHandler = async (request, response, next) => {
    try {
      const event = await this.service.createEvent(request.body as CreateEventBody);
      response.status(201).json({ data: mapEventToResponse(event) });
    } catch (error) {
      next(error);
    }
  };

  public readonly listEvents: RequestHandler = async (_request, response, next) => {
    try {
      const events = await this.service.listEvents();
      response.status(200).json({ data: events.map(mapEventToResponse) });
    } catch (error) {
      next(error);
    }
  };

  public readonly getEventById: RequestHandler = async (request, response, next) => {
    try {
      const eventId = parseEventId(request.params.eventId);
      const event = await this.service.getEventById(eventId);
      response.status(200).json({ data: mapEventToResponse(event) });
    } catch (error) {
      next(error);
    }
  };

  public readonly updateEvent: RequestHandler = async (request, response, next) => {
    try {
      const eventId = parseEventId(request.params.eventId);
      const event = await this.service.updateEvent(eventId, request.body as UpdateEventBody);
      response.status(200).json({ data: mapEventToResponse(event) });
    } catch (error) {
      next(error);
    }
  };

  public readonly deleteEvent: RequestHandler = async (request, response, next) => {
    try {
      const eventId = parseEventId(request.params.eventId);
      await this.service.deleteEvent(eventId);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

export const eventController = new EventController(new EventService(new PrismaEventRepository()));
