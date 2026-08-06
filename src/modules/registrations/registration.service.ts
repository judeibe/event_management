import { Prisma } from '@prisma/client';

import { ConflictError, NotFoundError } from '../../shared/errors';
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

    const registration = await repository.createRegistration({
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
}
