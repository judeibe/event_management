import { prisma } from '@/db/client';
import { PrismaClient, Prisma} from "@/generated/prisma/client";

import { logger } from '../shared/logger';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
  logger.warn('DATABASE_URL was not set. Falling back to file:./prisma/dev.db for seeding.');
}

const seedDatabase = async (): Promise<void> => {
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  await prisma.$transaction(async (transaction) => {
    await transaction.registration.deleteMany();
    await transaction.attendee.deleteMany();
    await transaction.event.deleteMany();

    const eventFuturePrimary = await transaction.event.create({
      data: {
        title: 'Quarterly Product Workshop',
        description: 'Hands-on workshop for product planning and feedback.',
        eventDate: new Date(now.getTime() + 7 * oneDayMs),
        maxCapacity: 3,
        category: 'Business',
        location: 'HQ Conference Center, San Francisco, CA',
        price: 40,
        imageUrl: 'https://picsum.photos/seed/quarterly-product-workshop/800/600',
      },
    });

    const eventFutureSecondary = await transaction.event.create({
      data: {
        title: 'Community Town Hall',
        description: 'Open forum for roadmap updates and Q&A.',
        eventDate: new Date(now.getTime() + 14 * oneDayMs),
        maxCapacity: 5,
        category: 'Community',
        location: 'Sunset Park, Los Angeles, CA',
        price: 0,
        imageUrl: 'https://picsum.photos/seed/community-town-hall/800/600',
      },
    });

    await transaction.event.create({
      data: {
        title: 'Archived Session',
        description: 'Historical event used for past-event registration checks.',
        eventDate: new Date(now.getTime() - 2 * oneDayMs),
        maxCapacity: 2,
        category: 'Business',
        location: 'HQ Conference Center, San Francisco, CA',
        price: 25,
        imageUrl: 'https://picsum.photos/seed/archived-session/800/600',
      },
    });

    const [attendeeOne, attendeeTwo, attendeeThree, attendeeFour] = await Promise.all([
      transaction.attendee.create({ data: { externalRef: 'alex@example.com' } }),
      transaction.attendee.create({ data: { externalRef: 'blair@example.com' } }),
      transaction.attendee.create({ data: { externalRef: 'casey@example.com' } }),
      transaction.attendee.create({ data: { externalRef: 'drew@example.com' } }),
    ]);

    await Promise.all([
      transaction.registration.create({
        data: {
          attendeeId: attendeeOne.id,
          eventId: eventFuturePrimary.id,
        },
      }),
      transaction.registration.create({
        data: {
          attendeeId: attendeeTwo.id,
          eventId: eventFuturePrimary.id,
        },
      }),
      transaction.registration.create({
        data: {
          attendeeId: attendeeThree.id,
          eventId: eventFuturePrimary.id,
          status: 'CANCELLED',
          cancelledAt: new Date(now.getTime() - oneDayMs),
        },
      }),
      transaction.registration.create({
        data: {
          attendeeId: attendeeFour.id,
          eventId: eventFutureSecondary.id,
        },
      }),
    ]);

    await Promise.all([
      transaction.event.update({
        where: { id: eventFuturePrimary.id },
        data: { currentRegistrations: 2 },
      }),
      transaction.event.update({
        where: { id: eventFutureSecondary.id },
        data: { currentRegistrations: 1 },
      }),
    ]);
  });
};

const runSeed = async (): Promise<void> => {
  try {
    await seedDatabase();
    logger.info('Seed data generated successfully for local validation.');
  } finally {
    await prisma.$disconnect();
  }
};

void runSeed().catch((error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
    logger.error(
      'Failed to seed because database tables are missing. Run `npx prisma migrate dev --name init` first.',
      { error },
    );
    process.exitCode = 1;
    return;
  }

  logger.error('Failed to seed local validation data.', { error });
  process.exitCode = 1;
});
