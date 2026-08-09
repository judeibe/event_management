# Phase 1 Data Model: Event Registration Portal

This feature does not own persistent storage — `apps/api`'s Prisma `Event`/`Attendee`/`Registration`
models (spec `001-event-registration-api/data-model.md`) remain the source of truth for anything sent
to the server. This document covers the **view-model, form, and device-local persistence shapes**
this UI introduces on top of that existing contract.

## Event (consumed shape)

Sourced verbatim from `@event-management/shared`'s `EventResponse` (`packages/shared/src/event.ts`) —
no new fields, no reshaping:

| Field                  | Type                    | Notes                                                                 |
|-------------------------|--------------------------|------------------------------------------------------------------------|
| `id`                   | `string`                | UUID; route param for `/events/:id`, key for registration lookups.     |
| `title`                | `string`                | Card/detail heading.                                                   |
| `description`          | `string`                | Shown only on the detail page (FR-002), not the grid card.             |
| `eventDate`            | `string` (ISO datetime) | Parsed client-side to derive Open/Full/Past state and for display.     |
| `maxCapacity`          | `number`                | Used with `currentRegistrations` to derive remaining availability.     |
| `currentRegistrations` | `number`                | Read-only; drives the availability badge/progress bar.                 |
| `category`             | `string`                | Rendered as a `Badge`; also the client-side filter dimension.          |
| `location`             | `string`                | Plain text, shown on card and detail.                                  |
| `price`                | `number`                | Formatted as currency for display; not a transaction (spec Assumptions). |
| `imageUrl`             | `string` (URL)          | Rendered via `EventThumbnail` with placeholder fallback.               |

Derived, computed client-side (not API fields): `remainingCapacity = maxCapacity - currentRegistrations`;
`isFull = remainingCapacity <= 0`; `isPast = new Date(eventDate).getTime() <= Date.now()`.

## RegistrationResponse (consumed shape)

Sourced verbatim from `@event-management/shared`'s `RegistrationResponse` (`registration.ts`):

| Field        | Type                      | Notes                                                        |
|---------------|---------------------------|----------------------------------------------------------------|
| `id`         | `string`                  | Stored locally as `MyRegistrationRecord.registrationId`.       |
| `eventId`    | `string`                  | Correlates back to an `Event`.                                 |
| `attendeeRef`| `string`                  | The email submitted at registration time.                      |
| `status`     | `'ACTIVE' \| 'CANCELLED'` | Mirrored into the local record; updated there on cancel.       |

## RegistrationFormValues (client form state)

Validated by a new shared zod schema, `packages/shared/src/registration-form-schema.ts` (mirrors the
existing `event-form-schema.ts` pattern), driven by `react-hook-form`:

| Field   | Type     | Required | Notes                                                          |
|---------|----------|----------|------------------------------------------------------------------|
| `name`  | `string` | yes      | Non-empty, trimmed. Display-only — never sent to the API.        |
| `email` | `string` | yes      | Non-empty, trimmed, valid email format. Sent as `attendeeRef`.   |

```ts
export const registrationFormValuesSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
})
export type RegistrationFormValues = z.infer<typeof registrationFormValuesSchema>
export const toRegistrationRequestBody = (values: RegistrationFormValues) => ({ attendeeRef: values.email })
```

Exported from `packages/shared/src/index.ts` alongside the existing `EventResponse`/`RegistrationResponse`
types. `apps/api`'s `createRegistrationBodySchema` (single `attendeeRef` field) is unchanged.

## MyRegistrationRecord (device-local persistence shape)

Stored as a JSON array under a single `localStorage` key, `event-portal:my-registrations:v1`
(`apps/web/src/lib/my-registrations.ts`):

| Field           | Type                      | Notes                                                                 |
|------------------|---------------------------|--------------------------------------------------------------------------|
| `registrationId` | `string`                 | From `RegistrationResponse.id`; primary key for update/remove.           |
| `eventId`         | `string`                 | For linking back to the event and for the detail page's "already registered" lookup. |
| `attendeeRef`     | `string`                 | The email used for this registration (needed to call `DELETE .../registrations/:attendeeRef`). |
| `attendeeName`    | `string`                 | Display-only, local convenience (research.md #3).                        |
| `status`          | `'ACTIVE' \| 'CANCELLED'`| Updated locally on successful cancel; drives whether a cancel action is offered. |
| `eventSnapshot`   | `{ title: string; eventDate: string; location: string }` | Captured at registration time so "my registrations" has something to show even before/if the live refresh (research.md #6) completes or fails. |
| `registeredAt`    | `string` (ISO)           | Sort order for the "my registrations" list.                              |

Module functions (`apps/web/src/lib/my-registrations.ts`):

```ts
export function getMyRegistrations(): MyRegistrationRecord[]
export function getMyRegistrationForEvent(eventId: string): MyRegistrationRecord | undefined
export function addMyRegistration(record: MyRegistrationRecord): void
export function markMyRegistrationCancelled(registrationId: string): void
export function removeMyRegistration(registrationId: string): void
```

Every function guards with `typeof window === 'undefined'` (no-op/empty return) and wraps
`localStorage`/`JSON` calls in try/catch (research.md #2).

## Server Action result shapes

```ts
type RegisterResult =
  | { ok: true; registration: RegistrationResponse }
  | { ok: false; code: ApiErrorCode; message: string; fieldErrors?: Record<string, string> }

type CancelResult =
  | { ok: true }
  | { ok: false; code: ApiErrorCode; message: string }
```

`code`/`message` come from the API's `ApiErrorResponse` envelope (`packages/shared`'s `ApiErrorBody`);
`fieldErrors` is populated when `code === 'VALIDATION_ERROR'` (client-side zod failures are caught
before submission, so this mainly guards against a future stricter API-side check).

## Validation Rules (traceability to FR-004 / FR-005 / FR-006)

- Required non-empty: `name`, `email` — client schema rejects empty/whitespace-only values before
  submit (FR-006).
- `email` well-formed — client schema (FR-006); the API applies no format check itself beyond
  non-empty, so this is a client-side-only guard for a better error message.
- Registration is blocked client-side when the event is already `isFull` or `isPast` (FR-004), and the
  server's `ConflictError` (`"Cannot register for past events."` / `"Event has reached maximum
  capacity."`) is the authoritative backstop if state changed since the page loaded (edge case:
  "event reaches full capacity while a visitor is viewing it").
- Duplicate registration on the same device is blocked client-side by checking
  `getMyRegistrationForEvent(eventId)` before rendering `RegisterForm` at all (FR-007); the server's
  `ConflictError` (`"Attendee is already registered for this event."`, from either the pre-check or a
  Prisma `P2002` catch) is the authoritative backstop for the same event submitted from a second
  device/browser or after local storage is cleared.
- Cancellation is allowed regardless of `eventDate` (edge case: cancelling a past event's registration
  is still permitted) — only gated on the local record's `status === 'ACTIVE'`.

## State Transitions

A `MyRegistrationRecord.status` follows the same two-state lifecycle as the server's `Registration.status`:
**(none) → ACTIVE** on a successful `registerForEvent` (local record created via `addMyRegistration`),
**ACTIVE → CANCELLED** on a successful `cancelRegistration` (`markMyRegistrationCancelled`) — including
the case where the server responds `404 "No active registration exists..."` (edge case: already
cancelled elsewhere), which the UI treats as confirmation of the true state and syncs locally too
(research.md #7), rather than surfacing that as an unresolved error. There is no `CANCELLED → ACTIVE`
transition (re-registering after cancelling creates a new registration/local record, since the API has
no "reactivate" operation).
