import { Router } from 'express';

import { validateRequest } from '@/middleware/request-validation';
import { eventController } from './event.controller';
import { createEventBodySchema, updateEventBodySchema } from './event.types';

export const eventRouter = Router();

eventRouter.get('/', eventController.listEvents);
eventRouter.post('/', validateRequest(createEventBodySchema), eventController.createEvent);
eventRouter.get('/:eventId', eventController.getEventById);
eventRouter.patch('/:eventId', validateRequest(updateEventBodySchema), eventController.updateEvent);
eventRouter.delete('/:eventId', eventController.deleteEvent);
