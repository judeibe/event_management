import { z } from 'zod';

// Mirrors apps/api/src/modules/events/event.types.ts's createEventBodySchema/updateEventBodySchema
// field-by-field, but validates the *form* representation (e.g. a datetime-local input string)
// rather than the wire representation (a full ISO datetime string). Keep in sync if the API schema
// changes. apps/api's own schema is untouched by this file.

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

const isNotInThePast = (datetimeLocalValue: string): boolean => {
  const parsed = new Date(datetimeLocalValue);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now();
};

export const eventFormValuesSchema = z.object({
  title: requiredText('Title'),
  description: requiredText('Description'),
  eventDate: z
    .string()
    .min(1, 'Event date is required.')
    .refine(isNotInThePast, 'Event date must be in the future.'),
  location: requiredText('Location'),
  category: requiredText('Category'),
  price: z.coerce.number().nonnegative('Price must be zero or greater.'),
  maxCapacity: z.coerce
    .number()
    .int('Capacity must be a whole number.')
    .positive('Capacity must be greater than zero.'),
  imageUrl: z.string().trim().url('Enter a valid image URL.'),
});

export type EventFormValues = z.infer<typeof eventFormValuesSchema>;

/**
 * Builds a schema instance with an extra check that maxCapacity can't drop below an event's
 * current active registration count (FR-008). Pass `minCapacity` only in edit mode.
 */
export const buildEventFormSchema = (minCapacity?: number) =>
  eventFormValuesSchema.superRefine((values, ctx) => {
    if (minCapacity !== undefined && values.maxCapacity < minCapacity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxCapacity'],
        message: `Capacity cannot be less than the ${minCapacity} attendee(s) already registered.`,
      });
    }
  });

/** Converts validated form values into the API's create/update request body shape. */
export const toEventRequestBody = (values: EventFormValues) => ({
  title: values.title,
  description: values.description,
  eventDate: new Date(values.eventDate).toISOString(),
  location: values.location,
  category: values.category,
  price: values.price,
  maxCapacity: values.maxCapacity,
  imageUrl: values.imageUrl,
});

export type EventRequestBody = ReturnType<typeof toEventRequestBody>;
