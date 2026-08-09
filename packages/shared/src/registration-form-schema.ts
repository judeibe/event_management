import { z } from 'zod';

// Mirrors apps/api/src/modules/registrations/registration.types.ts's createRegistrationBodySchema
// (a single `attendeeRef` field), but collects name+email from the visitor: only email is sent to
// the API (as attendeeRef); name is a display-only convenience the API has no field for
// (research.md #3). apps/api's own schema is untouched by this file.

export const registrationFormValuesSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
});

export type RegistrationFormValues = z.infer<typeof registrationFormValuesSchema>;

/** Converts validated form values into the API's create-registration request body shape. */
export const toRegistrationRequestBody = (values: RegistrationFormValues) => ({
  attendeeRef: values.email,
});

export type RegistrationRequestBody = ReturnType<typeof toRegistrationRequestBody>;
