import type { Event as EventModel } from '@prisma/client';
import { z } from 'zod';

const nonEmptyTrimmedString = z.string().trim().min(1);

export const eventIdParamsSchema = z.object({
  eventId: z.string().uuid(),
});

export const createEventBodySchema = z.object({
  title: nonEmptyTrimmedString,
  description: nonEmptyTrimmedString,
  eventDate: z.string().datetime(),
  maxCapacity: z.number().int().positive(),
});

export const updateEventBodySchema =
  createEventBodySchema
    .partial()
    .refine((payload) => Object.keys(payload).length > 0, 'At least one field must be provided.');

export type EventIdParams = z.infer<typeof eventIdParamsSchema>;
export type CreateEventBody = z.infer<typeof createEventBodySchema>;
export type UpdateEventBody = z.infer<typeof updateEventBodySchema>;

export interface EventResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly eventDate: string;
  readonly maxCapacity: number;
  readonly currentRegistrations: number;
}

export const mapEventToResponse = (event: EventModel): EventResponse => ({
  id: event.id,
  title: event.title,
  description: event.description,
  eventDate: event.eventDate.toISOString(),
  maxCapacity: event.maxCapacity,
  currentRegistrations: event.currentRegistrations,
});
