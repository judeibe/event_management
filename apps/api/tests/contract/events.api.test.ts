import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const testDatabaseUrl = 'file:./prisma/test.db';

let app: Express;
let prisma: PrismaClient;
let request: any;

describe('Event API contract', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.MAX_REQUEST_SIZE = '100kb';

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

  it('supports create, list, get, update, and delete event flow', async () => {
    const createResponse = await request(app).post('/events').send({
      title: 'Community meetup',
      description: 'Monthly event for contributors',
      eventDate: '2027-07-21T18:00:00.000Z',
      maxCapacity: 120,
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      data: {
        title: 'Community meetup',
        description: 'Monthly event for contributors',
        eventDate: '2027-07-21T18:00:00.000Z',
        maxCapacity: 120,
        currentRegistrations: 0,
      },
    });

    const eventId = createResponse.body.data.id as string;
    expect(eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    const listResponse = await request(app).get('/events');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].id).toBe(eventId);

    const getResponse = await request(app).get(`/events/${eventId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.id).toBe(eventId);

    const updateResponse = await request(app).patch(`/events/${eventId}`).send({
      title: 'Updated meetup',
      description: 'Updated details',
      maxCapacity: 80,
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      data: {
        id: eventId,
        title: 'Updated meetup',
        description: 'Updated details',
        maxCapacity: 80,
      },
    });

    const deleteResponse = await request(app).delete(`/events/${eventId}`);
    expect(deleteResponse.status).toBe(204);

    const getDeletedResponse = await request(app).get(`/events/${eventId}`);
    expect(getDeletedResponse.status).toBe(404);
    expect(getDeletedResponse.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
      },
    });
  });

  it('returns 400 for invalid event payloads', async () => {
    const response = await request(app).post('/events').send({
      title: '',
      description: 'invalid payload',
      eventDate: 'not-a-date',
      maxCapacity: 0,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
