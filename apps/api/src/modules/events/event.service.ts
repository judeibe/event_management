import { ConflictError, NotFoundError } from '@/shared/errors';
import type { EventEntity, EventRepository } from './event.repository';
import type { CreateEventBody, UpdateEventBody } from './event.types';

export class EventService {
  public constructor(private readonly repository: EventRepository) {}

  public async createEvent(input: CreateEventBody): Promise<EventEntity> {
    return this.repository.create({
      title: input.title.trim(),
      description: input.description.trim(),
      eventDate: new Date(input.eventDate),
      maxCapacity: input.maxCapacity,
      category: input.category.trim(),
      location: input.location.trim(),
      price: input.price,
      imageUrl: input.imageUrl.trim(),
    });
  }

  public async listEvents(): Promise<EventEntity[]> {
    return this.repository.findAll();
  }

  public async getEventById(eventId: string): Promise<EventEntity> {
    const event = await this.repository.findById(eventId);

    if (!event) {
      throw new NotFoundError(`Event ${eventId} was not found.`, { eventId });
    }

    return event;
  }

  public async updateEvent(eventId: string, input: UpdateEventBody): Promise<EventEntity> {
    const existingEvent = await this.repository.findById(eventId);

    if (!existingEvent) {
      throw new NotFoundError(`Event ${eventId} was not found.`, { eventId });
    }

    if (input.maxCapacity !== undefined) {
      const activeRegistrationCount = await this.repository.countActiveRegistrations(eventId);
      const occupancyFloor = Math.max(existingEvent.currentRegistrations, activeRegistrationCount);

      if (input.maxCapacity < occupancyFloor) {
        throw new ConflictError('Cannot reduce max capacity below current registrations.', {
          currentRegistrations: occupancyFloor,
          eventId,
          requestedMaxCapacity: input.maxCapacity,
        });
      }
    }

    const updateInput = {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.eventDate !== undefined ? { eventDate: new Date(input.eventDate) } : {}),
      ...(input.maxCapacity !== undefined ? { maxCapacity: input.maxCapacity } : {}),
      ...(input.category !== undefined ? { category: input.category.trim() } : {}),
      ...(input.location !== undefined ? { location: input.location.trim() } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl.trim() } : {}),
    };

    return this.repository.updateById(eventId, updateInput);
  }

  public async deleteEvent(eventId: string): Promise<void> {
    const event = await this.repository.findById(eventId);

    if (!event) {
      throw new NotFoundError(`Event ${eventId} was not found.`, { eventId });
    }

    await this.repository.deleteById(eventId);
  }
}
