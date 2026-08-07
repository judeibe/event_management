import { z } from 'zod';

export const registrationEventIdParamsSchema = z.object({
  eventId: z.string().uuid(),
});

export const unregisterRegistrationParamsSchema = z.object({
  attendeeRef: z.string().trim().min(1),
  eventId: z.string().uuid(),
});

export const createRegistrationBodySchema = z.object({
  attendeeRef: z.string().trim().min(1),
});

export type RegistrationEventIdParams = z.infer<typeof registrationEventIdParamsSchema>;
export type UnregisterRegistrationParams = z.infer<typeof unregisterRegistrationParamsSchema>;
export type CreateRegistrationBody = z.infer<typeof createRegistrationBodySchema>;

export interface RegistrationResponse {
  readonly id: string;
  readonly eventId: string;
  readonly attendeeRef: string;
  readonly status: 'ACTIVE' | 'CANCELLED';
}

export interface RegistrationResponseSource {
  readonly id: string;
  readonly eventId: string;
  readonly status: string;
  readonly attendee: {
    readonly externalRef: string;
  };
}

export const mapRegistrationToResponse = (
  registration: RegistrationResponseSource,
): RegistrationResponse => ({
  id: registration.id,
  eventId: registration.eventId,
  attendeeRef: registration.attendee.externalRef,
  status: registration.status === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE',
});
