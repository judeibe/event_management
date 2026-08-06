import { Router } from 'express';

import { validateRequest } from '../../middleware/request-validation';
import { registrationController } from './registration.controller';
import { createRegistrationBodySchema } from './registration.types';

export const registrationRouter = Router({ mergeParams: true });

registrationRouter.post(
  '/',
  validateRequest(createRegistrationBodySchema),
  registrationController.createRegistration,
);
