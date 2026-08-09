import { Prisma} from "@/generated/prisma/client";

import { ConflictError, NotFoundError } from '@/shared/errors';
import type { CreateRegistrationBody } from './registration.types';
import type {
  RegistrationRepository,
  RegistrationWithAttendeeEntity,
  RegistrationTransactionRepository,
} from './registration.repository';

export class RegistrationService {
  public constructor(private readonly repository: RegistrationRepository) {}

  public async createRegistration(
    eventId: string,
    input: CreateRegistrationBody,
  ): Promise<RegistrationWithAttendeeEntity> {
    const attendeeRef = input.attendeeRef.trim();

    try {
      return await this.repository.withTransaction(async (transactionRepository) =>
        this.createRegistrationInTransaction(eventId, attendeeRef, transactionRepository),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictError('Attendee is already registered for this event.', {
          attendeeRef,
          eventId,
        });
      }

      throw error;
    }
  }

  public async unregisterRegistration(eventId: string, attendeeRefInput: string): Promise<void> {
    const attendeeRef = attendeeRefInput.trim();

    await this.repository.withTransaction(async (transactionRepository) =>
      this.unregisterRegistrationInTransaction(eventId, attendeeRef, transactionRepository),
    );
  }

  private async createRegistrationInTransaction(
    eventId: string,
    attendeeRef: string,
    repository: RegistrationTransactionRepository,
  ): Promise<RegistrationWithAttendeeEntity> {
    const event = await repository.findEventById(eventId);

    if (!event) {
      throw new NotFoundError(`Event ${eventId} was not found.`, { eventId });
    }

    if (event.eventDate.getTime() <= Date.now()) {
      throw new ConflictError('Cannot register for past events.', { eventId });
    }

    if (event.currentRegistrations >= event.maxCapacity) {
      throw new ConflictError('Event has reached maximum capacity.', { eventId });
    }

    const attendee = await repository.getOrCreateAttendeeByExternalRef(attendeeRef);
    const activeRegistration = await repository.findActiveRegistration(eventId, attendee.id);

    if (activeRegistration) {
      throw new ConflictError('Attendee is already registered for this event.', {
        attendeeRef,
        eventId,
      });
    }

    // A prior registration for this attendee/event pair may exist but be cancelled (the
    // `@@unique([eventId, attendeeId])` constraint allows at most one row per pair, regardless of
    // status). Reactivate it in place rather than inserting a new row, which would violate that
    // constraint.
    const existingRegistration = await repository.findRegistrationByEventAndAttendee(
      eventId,
      attendee.id,
    );

    const registration = existingRegistration
      ? await repository.reactivateRegistration(existingRegistration.id)
      : await repository.createRegistration({
          attendeeId: attendee.id,
          eventId,
        });

    const incremented = await repository.incrementEventRegistrationsIfCapacityAvailable(eventId);

    if (!incremented) {
      throw new ConflictError('Event has reached maximum capacity.', { eventId });
    }

    const registrationWithAttendee = await repository.findRegistrationById(registration.id);

    if (!registrationWithAttendee) {
      throw new NotFoundError('Registration could not be loaded after creation.', {
        eventId,
        registrationId: registration.id,
      });
    }

    return registrationWithAttendee;
  }

  private async unregisterRegistrationInTransaction(
    eventId: string,
    attendeeRef: string,
    repository: RegistrationTransactionRepository,
  ): Promise<void> {
    const event = await repository.findEventById(eventId);

    if (!event) {
      throw new NotFoundError(`Event ${eventId} was not found.`, { eventId });
    }

    const attendee = await repository.findAttendeeByExternalRef(attendeeRef);

    if (!attendee) {
      throw new NotFoundError('No active registration exists for this attendee and event.', {
        attendeeRef,
        eventId,
      });
    }

    const activeRegistration = await repository.findActiveRegistration(eventId, attendee.id);

    if (!activeRegistration) {
      throw new NotFoundError('No active registration exists for this attendee and event.', {
        attendeeRef,
        eventId,
      });
    }

    await repository.cancelRegistrationById(activeRegistration.id);
    const activeRegistrations = await repository.countActiveRegistrationsForEvent(eventId);
    await repository.setEventCurrentRegistrations(eventId, activeRegistrations);
  }
}
