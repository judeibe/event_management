import type { Express } from 'express';
import type { PrismaClient } from '@/generated/prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const testDatabaseUrl = 'file:./prisma/test.db';

let app: Express;
let prisma: PrismaClient;
let request: any;

const createEvent = async (
  eventDate: string,
  maxCapacity = 5,
): Promise<{ readonly id: string }> => {
  const response = await request(app).post('/events').send({
    title: 'Registration target event',
    description: 'Event used in registration tests',
    eventDate,
    maxCapacity,
    category: 'Community',
    location: 'Sunset Park, Los Angeles, CA',
    price: 25,
    imageUrl: 'https://picsum.photos/seed/registration-target-event/800/600',
  });

  expect(response.status).toBe(201);

  return { id: response.body.data.id as string };
};

describe('Registration API contract', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.RATE_LIMIT_MAX_REQUESTS = '30';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.MAX_REQUEST_SIZE = '1kb';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const supertest = require('supertest') as any;
    const { prisma: prismaClient } = (await import('../../src/db/client.js')) as {
      prisma: PrismaClient;
    };
    const { createApp } = (await import('../../src/app.js')) as { createApp: () => Express };

    prisma = prismaClient;
    app = createApp();
    request = supertest;

    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.registration.deleteMany();
    await prisma.attendee.deleteMany();
    await prisma.event.deleteMany();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('creates a registration for a future event with available capacity', async () => {
    const event = await createEvent('2030-07-21T18:00:00.000Z', 2);
    const response = await request(app).post(`/events/${event.id}/registrations`).send({
      attendeeRef: 'attendee-a@example.com',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      data: {
        eventId: event.id,
        attendeeRef: 'attendee-a@example.com',
        status: 'ACTIVE',
      },
    });

    const storedEvent = await prisma.event.findUnique({ where: { id: event.id } });
    expect(storedEvent?.currentRegistrations).toBe(1);
  });

  it('rejects duplicate registrations for the same attendee and event', async () => {
    const event = await createEvent('2030-07-21T18:00:00.000Z', 3);

    const firstResponse = await request(app).post(`/events/${event.id}/registrations`).send({
      attendeeRef: 'attendee-b@example.com',
    });
    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app).post(`/events/${event.id}/registrations`).send({
      attendeeRef: 'attendee-b@example.com',
    });
    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.error.code).toBe('CONFLICT');
  });

  it('rejects registrations for past events', async () => {
    const event = await createEvent('2020-01-01T10:00:00.000Z', 3);

    const response = await request(app).post(`/events/${event.id}/registrations`).send({
      attendeeRef: 'attendee-c@example.com',
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('rejects registrations when event capacity has been reached', async () => {
    const event = await createEvent('2030-07-21T18:00:00.000Z', 1);

    const accepted = await request(app).post(`/events/${event.id}/registrations`).send({
      attendeeRef: 'attendee-d@example.com',
    });
    expect(accepted.status).toBe(201);

    const rejected = await request(app).post(`/events/${event.id}/registrations`).send({
      attendeeRef: 'attendee-e@example.com',
    });

    expect(rejected.status).toBe(409);
    expect(rejected.body.error.code).toBe('CONFLICT');
  });

  it('rejects oversized registration payloads with 413', async () => {
    const event = await createEvent('2030-07-21T18:00:00.000Z', 3);
    const response = await request(app).post(`/events/${event.id}/registrations`).send({
      attendeeRef: 'x'.repeat(5_000),
    });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('unregisters an attendee and reconciles occupancy for the event', async () => {
    const event = await createEvent('2030-07-21T18:00:00.000Z', 3);
    const attendeeRef = 'attendee-unregister@example.com';

    const registrationResponse = await request(app).post(`/events/${event.id}/registrations`).send({
      attendeeRef,
    });
    expect(registrationResponse.status).toBe(201);

    const unregisterResponse = await request(app).delete(
      `/events/${event.id}/registrations/${encodeURIComponent(attendeeRef)}`,
    );

    expect(unregisterResponse.status).toBe(204);

    const storedEvent = await prisma.event.findUnique({ where: { id: event.id } });
    expect(storedEvent?.currentRegistrations).toBe(0);

    const attendee = await prisma.attendee.findUnique({ where: { externalRef: attendeeRef } });
    expect(attendee).toBeDefined();
    expect(attendee).not.toBeNull();

    if (!attendee) {
      throw new Error('Expected attendee to exist after registration');
    }

    const registration = await prisma.registration.findFirst({
      where: {
        attendeeId: attendee.id,
        eventId: event.id,
      },
    });

    expect(registration?.status).toBe('CANCELLED');
    expect(registration?.cancelledAt).toBeTruthy();
  });

  it('returns 404 when attempting to unregister a non-existent active registration', async () => {
    const event = await createEvent('2030-07-21T18:00:00.000Z', 3);

    const response = await request(app).delete(
      `/events/${event.id}/registrations/${encodeURIComponent('missing-attendee@example.com')}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns throttling response when request volume exceeds configured limit', async () => {
    const event = await createEvent('2030-07-21T18:00:00.000Z', 500);
    let throttledResponse: any;

    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await request(app).post(`/events/${event.id}/registrations`).send({
        attendeeRef: `attendee-throttle-${attempt}@example.com`,
      });

      if (response.status === 429) {
        throttledResponse = response;
        break;
      }
    }

    expect(throttledResponse).toBeDefined();
    expect(throttledResponse.status).toBe(429);
    expect(throttledResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
