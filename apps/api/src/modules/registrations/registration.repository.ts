import { PrismaClient, Prisma} from "@/generated/prisma/client";

import { prisma } from '@/db/client';

export interface RegistrationEventEntity {
  readonly id: string;
  readonly eventDate: Date;
  readonly maxCapacity: number;
  readonly currentRegistrations: number;
}

export interface AttendeeEntity {
  readonly id: string;
  readonly externalRef: string;
  readonly createdAt: Date;
}

export interface RegistrationEntity {
  readonly id: string;
  readonly eventId: string;
  readonly attendeeId: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly cancelledAt: Date | null;
}

export interface RegistrationWithAttendeeEntity extends RegistrationEntity {
  readonly attendee: AttendeeEntity;
}

export interface CreateRegistrationInput {
  readonly eventId: string;
  readonly attendeeId: string;
}

export interface RegistrationTransactionRepository {
  findEventById(eventId: string): Promise<RegistrationEventEntity | null>;
  getOrCreateAttendeeByExternalRef(externalRef: string): Promise<AttendeeEntity>;
  findAttendeeByExternalRef(externalRef: string): Promise<AttendeeEntity | null>;
  findActiveRegistration(eventId: string, attendeeId: string): Promise<RegistrationEntity | null>;
  createRegistration(input: CreateRegistrationInput): Promise<RegistrationEntity>;
  incrementEventRegistrationsIfCapacityAvailable(eventId: string): Promise<boolean>;
  cancelRegistrationById(registrationId: string): Promise<RegistrationEntity>;
  countActiveRegistrationsForEvent(eventId: string): Promise<number>;
  setEventCurrentRegistrations(eventId: string, currentRegistrations: number): Promise<void>;
  findRegistrationById(registrationId: string): Promise<RegistrationWithAttendeeEntity | null>;
}

export interface RegistrationRepository {
  withTransaction<T>(
    operation: (repository: RegistrationTransactionRepository) => Promise<T>,
  ): Promise<T>;
}

class PrismaRegistrationTransactionRepository implements RegistrationTransactionRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findEventById(eventId: string): Promise<RegistrationEventEntity | null> {
    return this.client.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        eventDate: true,
        maxCapacity: true,
        currentRegistrations: true,
      },
    });
  }

  public async getOrCreateAttendeeByExternalRef(externalRef: string): Promise<AttendeeEntity> {
    return this.client.attendee.upsert({
      where: { externalRef },
      create: { externalRef },
      update: {},
      select: {
        id: true,
        externalRef: true,
        createdAt: true,
      },
    });
  }

  public async findAttendeeByExternalRef(externalRef: string): Promise<AttendeeEntity | null> {
    return this.client.attendee.findUnique({
      where: { externalRef },
      select: {
        id: true,
        externalRef: true,
        createdAt: true,
      },
    });
  }

  public async findActiveRegistration(
    eventId: string,
    attendeeId: string,
  ): Promise<RegistrationEntity | null> {
    return this.client.registration.findFirst({
      where: {
        attendeeId,
        eventId,
        status: 'ACTIVE',
      },
    });
  }

  public async createRegistration(input: CreateRegistrationInput): Promise<RegistrationEntity> {
    return this.client.registration.create({
      data: {
        attendeeId: input.attendeeId,
        eventId: input.eventId,
        status: 'ACTIVE',
      },
    });
  }

  public async incrementEventRegistrationsIfCapacityAvailable(eventId: string): Promise<boolean> {
    const result = await this.client.event.updateMany({
      where: {
        id: eventId,
        currentRegistrations: {
          lt: this.client.event.fields.maxCapacity,
        },
      },
      data: {
        currentRegistrations: {
          increment: 1,
        },
      },
    });

    return result.count === 1;
  }

  public async cancelRegistrationById(registrationId: string): Promise<RegistrationEntity> {
    return this.client.registration.update({
      where: { id: registrationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
  }

  public async countActiveRegistrationsForEvent(eventId: string): Promise<number> {
    return this.client.registration.count({
      where: {
        eventId,
        status: 'ACTIVE',
      },
    });
  }

  public async setEventCurrentRegistrations(
    eventId: string,
    currentRegistrations: number,
  ): Promise<void> {
    await this.client.event.update({
      where: { id: eventId },
      data: { currentRegistrations },
    });
  }

  public async findRegistrationById(
    registrationId: string,
  ): Promise<RegistrationWithAttendeeEntity | null> {
    return this.client.registration.findUnique({
      where: { id: registrationId },
      include: {
        attendee: true,
      },
    });
  }
}

export class PrismaRegistrationRepository implements RegistrationRepository {
  public constructor(private readonly client: PrismaClient = prisma) {}

  public async withTransaction<T>(
    operation: (repository: RegistrationTransactionRepository) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(async (transactionClient) =>
      operation(new PrismaRegistrationTransactionRepository(transactionClient)),
    );
  }
}

export const registrationRepository: RegistrationRepository = new PrismaRegistrationRepository();
