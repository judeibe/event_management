import { describe, expect, it, vi } from 'vitest';

import { ConflictError, NotFoundError } from '../../src/shared/errors';
import { EventService } from '../../src/modules/events/event.service';
import type { EventEntity, EventRepository } from '../../src/modules/events/event.repository';

const buildEvent = (overrides: Partial<EventEntity> = {}): EventEntity => ({
  id: 'f3f5233b-f6f6-494f-9e0e-5b5b4df47f8f',
  title: 'Event title',
  description: 'Event description',
  eventDate: new Date('2027-01-10T10:00:00.000Z'),
  maxCapacity: 100,
  currentRegistrations: 0,
  category: 'Business',
  location: 'HQ Conference Center, San Francisco, CA',
  price: 40,
  imageUrl: 'https://picsum.photos/seed/event-title/800/600',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const createRepositoryMock = (): EventRepository => ({
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  countActiveRegistrations: vi.fn(),
});

describe('EventService', () => {
  it('creates events with normalized values', async () => {
    const repository = createRepositoryMock();
    const created = buildEvent();
    vi.mocked(repository.create).mockResolvedValue(created);

    const service = new EventService(repository);

    const result = await service.createEvent({
      title: '  Launch party  ',
      description: '  Community meetup  ',
      eventDate: '2027-01-10T10:00:00.000Z',
      maxCapacity: 150,
      category: '  Music  ',
      location: '  Sunset Park, Los Angeles, CA  ',
      price: 50,
      imageUrl: '  https://picsum.photos/seed/launch-party/800/600  ',
    });

    expect(repository.create).toHaveBeenCalledWith({
      title: 'Launch party',
      description: 'Community meetup',
      eventDate: new Date('2027-01-10T10:00:00.000Z'),
      maxCapacity: 150,
      category: 'Music',
      location: 'Sunset Park, Los Angeles, CA',
      price: 50,
      imageUrl: 'https://picsum.photos/seed/launch-party/800/600',
    });
    expect(result).toEqual(created);
  });

  it('updates event details when constraints are satisfied', async () => {
    const repository = createRepositoryMock();
    const existing = buildEvent({ currentRegistrations: 1 });
    const updated = buildEvent({ title: 'Updated title', maxCapacity: 5 });

    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.countActiveRegistrations).mockResolvedValue(1);
    vi.mocked(repository.updateById).mockResolvedValue(updated);

    const service = new EventService(repository);

    const result = await service.updateEvent(existing.id, {
      title: '  Updated title  ',
      maxCapacity: 5,
      eventDate: '2027-01-12T10:00:00.000Z',
    });

    expect(repository.updateById).toHaveBeenCalledWith(existing.id, {
      title: 'Updated title',
      eventDate: new Date('2027-01-12T10:00:00.000Z'),
      maxCapacity: 5,
    });
    expect(result).toEqual(updated);
  });

  it('rejects updates that reduce capacity below active registrations', async () => {
    const repository = createRepositoryMock();
    const existing = buildEvent({ currentRegistrations: 3 });

    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.countActiveRegistrations).mockResolvedValue(3);

    const service = new EventService(repository);

    await expect(service.updateEvent(existing.id, { maxCapacity: 2 })).rejects.toBeInstanceOf(ConflictError);
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('throws not found when updating unknown events', async () => {
    const repository = createRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const service = new EventService(repository);

    await expect(service.updateEvent('missing-event-id', { title: 'Updated' })).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('deletes an existing event', async () => {
    const repository = createRepositoryMock();
    const existing = buildEvent();

    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.deleteById).mockResolvedValue();

    const service = new EventService(repository);

    await service.deleteEvent(existing.id);

    expect(repository.deleteById).toHaveBeenCalledWith(existing.id);
  });

  it('throws not found when deleting unknown events', async () => {
    const repository = createRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const service = new EventService(repository);

    await expect(service.deleteEvent('missing-event-id')).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });
});
