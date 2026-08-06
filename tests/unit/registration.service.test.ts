import { describe, expect, it, vi } from 'vitest';

import type {
  AttendeeEntity,
  RegistrationEntity,
  RegistrationEventEntity,
  RegistrationRepository,
  RegistrationTransactionRepository,
  RegistrationWithAttendeeEntity,
} from '../../src/modules/registrations/registration.repository';
import { RegistrationService } from '../../src/modules/registrations/registration.service';
import { ConflictError, NotFoundError } from '../../src/shared/errors';

const buildEvent = (overrides: Partial<RegistrationEventEntity> = {}): RegistrationEventEntity => ({
  id: 'f3f5233b-f6f6-494f-9e0e-5b5b4df47f8f',
  eventDate: new Date('2030-01-10T10:00:00.000Z'),
  maxCapacity: 100,
  currentRegistrations: 1,
  ...overrides,
});

const buildAttendee = (overrides: Partial<AttendeeEntity> = {}): AttendeeEntity => ({
  id: 'c7063ad5-76b9-4f8c-8661-f9ca64270d95',
  externalRef: 'attendee@example.com',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const buildRegistration = (overrides: Partial<RegistrationEntity> = {}): RegistrationEntity => ({
  id: '25acaa64-b782-4ec4-947f-2703eb2c0c43',
  eventId: 'f3f5233b-f6f6-494f-9e0e-5b5b4df47f8f',
  attendeeId: 'c7063ad5-76b9-4f8c-8661-f9ca64270d95',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  cancelledAt: null,
  ...overrides,
});

const buildRegistrationWithAttendee = (
  overrides: Partial<RegistrationWithAttendeeEntity> = {},
): RegistrationWithAttendeeEntity => ({
  ...buildRegistration(),
  attendee: buildAttendee(),
  ...overrides,
});

interface RegistrationRepositoryMockBundle {
  readonly repository: RegistrationRepository;
  readonly transactionRepository: RegistrationTransactionRepository;
}

const createRepositoryMock = (): RegistrationRepositoryMockBundle => {
  const transactionRepository: RegistrationTransactionRepository = {
    findEventById: vi.fn(),
    getOrCreateAttendeeByExternalRef: vi.fn(),
    findActiveRegistration: vi.fn(),
    createRegistration: vi.fn(),
    incrementEventRegistrationsIfCapacityAvailable: vi.fn(),
    findRegistrationById: vi.fn(),
  };

  const repository: RegistrationRepository = {
    withTransaction: vi.fn(async (operation) => operation(transactionRepository)),
  };

  return { repository, transactionRepository };
};

describe('RegistrationService', () => {
  it('creates a registration for a future event with available capacity', async () => {
    const { repository, transactionRepository } = createRepositoryMock();
    const event = buildEvent();
    const attendee = buildAttendee();
    const createdRegistration = buildRegistration();
    const registrationWithAttendee = buildRegistrationWithAttendee();

    vi.mocked(transactionRepository.findEventById).mockResolvedValue(event);
    vi.mocked(transactionRepository.getOrCreateAttendeeByExternalRef).mockResolvedValue(attendee);
    vi.mocked(transactionRepository.findActiveRegistration).mockResolvedValue(null);
    vi.mocked(transactionRepository.createRegistration).mockResolvedValue(createdRegistration);
    vi.mocked(transactionRepository.incrementEventRegistrationsIfCapacityAvailable).mockResolvedValue(true);
    vi.mocked(transactionRepository.findRegistrationById).mockResolvedValue(registrationWithAttendee);

    const service = new RegistrationService(repository);

    const result = await service.createRegistration(event.id, {
      attendeeRef: '  attendee@example.com  ',
    });

    expect(transactionRepository.getOrCreateAttendeeByExternalRef).toHaveBeenCalledWith(
      'attendee@example.com',
    );
    expect(transactionRepository.createRegistration).toHaveBeenCalledWith({
      eventId: event.id,
      attendeeId: attendee.id,
    });
    expect(result).toEqual(registrationWithAttendee);
  });

  it('rejects registration when the event does not exist', async () => {
    const { repository, transactionRepository } = createRepositoryMock();

    vi.mocked(transactionRepository.findEventById).mockResolvedValue(null);

    const service = new RegistrationService(repository);

    await expect(
      service.createRegistration('f3f5233b-f6f6-494f-9e0e-5b5b4df47f8f', { attendeeRef: 'abc' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects registration for events in the past', async () => {
    const { repository, transactionRepository } = createRepositoryMock();
    const pastEvent = buildEvent({
      eventDate: new Date('2020-01-10T10:00:00.000Z'),
    });

    vi.mocked(transactionRepository.findEventById).mockResolvedValue(pastEvent);

    const service = new RegistrationService(repository);

    await expect(service.createRegistration(pastEvent.id, { attendeeRef: 'abc' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(transactionRepository.createRegistration).not.toHaveBeenCalled();
  });

  it('rejects registration when event capacity has been reached', async () => {
    const { repository, transactionRepository } = createRepositoryMock();
    const fullEvent = buildEvent({
      currentRegistrations: 10,
      maxCapacity: 10,
    });

    vi.mocked(transactionRepository.findEventById).mockResolvedValue(fullEvent);

    const service = new RegistrationService(repository);

    await expect(service.createRegistration(fullEvent.id, { attendeeRef: 'abc' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(transactionRepository.createRegistration).not.toHaveBeenCalled();
  });

  it('rejects duplicate active registrations for the same attendee and event', async () => {
    const { repository, transactionRepository } = createRepositoryMock();
    const event = buildEvent();
    const attendee = buildAttendee();

    vi.mocked(transactionRepository.findEventById).mockResolvedValue(event);
    vi.mocked(transactionRepository.getOrCreateAttendeeByExternalRef).mockResolvedValue(attendee);
    vi.mocked(transactionRepository.findActiveRegistration).mockResolvedValue(buildRegistration());

    const service = new RegistrationService(repository);

    await expect(service.createRegistration(event.id, { attendeeRef: attendee.externalRef })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(transactionRepository.createRegistration).not.toHaveBeenCalled();
  });
});
