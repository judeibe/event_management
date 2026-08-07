import { prisma } from '../../db/client';

export interface CreateEventInput {
  readonly title: string;
  readonly description: string;
  readonly eventDate: Date;
  readonly maxCapacity: number;
}

export interface UpdateEventInput {
  readonly title?: string;
  readonly description?: string;
  readonly eventDate?: Date;
  readonly maxCapacity?: number;
}

export interface EventEntity {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly eventDate: Date;
  readonly maxCapacity: number;
  readonly currentRegistrations: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface EventRepository {
  create(input: CreateEventInput): Promise<EventEntity>;
  findAll(): Promise<EventEntity[]>;
  findById(eventId: string): Promise<EventEntity | null>;
  updateById(eventId: string, input: UpdateEventInput): Promise<EventEntity>;
  deleteById(eventId: string): Promise<void>;
  countActiveRegistrations(eventId: string): Promise<number>;
}

export class PrismaEventRepository implements EventRepository {
  public async create(input: CreateEventInput): Promise<EventEntity> {
    return prisma.event.create({
      data: {
        title: input.title,
        description: input.description,
        eventDate: input.eventDate,
        maxCapacity: input.maxCapacity,
      },
    });
  }

  public async findAll(): Promise<EventEntity[]> {
    return prisma.event.findMany({
      orderBy: [{ eventDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  public async findById(eventId: string): Promise<EventEntity | null> {
    return prisma.event.findUnique({
      where: { id: eventId },
    });
  }

  public async updateById(eventId: string, input: UpdateEventInput): Promise<EventEntity> {
    const updateData = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.eventDate !== undefined ? { eventDate: input.eventDate } : {}),
      ...(input.maxCapacity !== undefined ? { maxCapacity: input.maxCapacity } : {}),
    };

    return prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });
  }

  public async deleteById(eventId: string): Promise<void> {
    await prisma.event.delete({
      where: { id: eventId },
    });
  }

  public async countActiveRegistrations(eventId: string): Promise<number> {
    return prisma.registration.count({
      where: {
        eventId,
        status: 'ACTIVE',
      },
    });
  }
}

export const eventRepository: EventRepository = new PrismaEventRepository();
