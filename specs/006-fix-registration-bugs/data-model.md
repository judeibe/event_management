# Phase 1 Data Model: Registration Portal Bug Fixes

This feature does not change the shape of any entity. `apps/api/prisma/schema.prisma`'s `Event`,
`Attendee`, and `Registration` models (`001-event-registration-api/data-model.md`) and
`apps/web`'s `EventResponse`/`RegistrationResponse`/`MyRegistrationRecord` shapes
(`004-event-registration-portal/data-model.md`) are unchanged field-for-field. This document records
only the one **state-transition behavior change** and the two **client-side result-shape changes**
this feature introduces.

## Registration state transitions (amends `004-event-registration-portal/data-model.md`)

`004`'s data model stated: *"There is no `CANCELLED → ACTIVE` transition (re-registering after
cancelling creates a new registration/local record, since the API has no 'reactivate' operation)."*
This is now explicitly superseded (research.md #1):

```text
(none) ──register──▶ ACTIVE ──cancel──▶ CANCELLED ──register again──▶ ACTIVE ──cancel──▶ CANCELLED ──▶ ...
```

- **(none) → ACTIVE**: unchanged — first-time registration for an `(eventId, attendeeId)` pair still
  creates a new `Registration` row.
- **ACTIVE → CANCELLED**: unchanged — `DELETE /events/:eventId/registrations/:attendeeRef` still sets
  `status: 'CANCELLED'`, `cancelledAt: <now>` on the existing row.
- **CANCELLED → ACTIVE (new)**: registering again for the same `(eventId, attendeeId)` pair, when no
  *active* registration currently exists for it, now **reactivates the same row** (`status: 'ACTIVE'`,
  `cancelledAt: null`) instead of failing with `P2002` or creating a second row. The row's `id` is
  preserved across the cycle — a given attendee/event pair has at most one `Registration` row, ever,
  whose `status` toggles. This cycle repeats indefinitely (spec Edge Cases).
- There is still no transition while a row is already `ACTIVE` for that pair — a second `register`
  attempt in that state is rejected with the existing `ConflictError` ("Attendee is already registered
  for this event."), unchanged (FR-002).

`RegistrationRepository`/`RegistrationTransactionRepository` interface addition
(`apps/api/src/modules/registrations/registration.repository.ts`):

```ts
export interface RegistrationTransactionRepository {
  // ...existing methods, unchanged...

  /** Any status — used to detect a reactivatable (cancelled) row before falling back to create. */
  findRegistrationByEventAndAttendee(
    eventId: string,
    attendeeId: string,
  ): Promise<RegistrationEntity | null>;

  /** Flips a cancelled row back to ACTIVE and clears cancelledAt. */
  reactivateRegistration(registrationId: string): Promise<RegistrationEntity>;
}
```

`RegistrationService.createRegistrationInTransaction` control flow changes from
*"create, catch P2002 as duplicate"* to an explicit three-way branch, after the existing
`findActiveRegistration` duplicate check (unchanged):

```text
no active registration for (eventId, attendeeId)
  → look up any registration for (eventId, attendeeId)
      → found (must be CANCELLED)  → reactivateRegistration(existing.id)
      → not found                  → createRegistration({ attendeeId, eventId })   (unchanged path)
```

The outer `P2002` catch in `RegistrationService.createRegistration` (`registration.service.ts:24-36`)
is kept as a defensive backstop for a genuine concurrent double-submit race (two simultaneous requests
for the same never-before-seen pair), not removed — it simply becomes unreachable for the
cancel-then-re-register case this feature fixes.

## Client-side: live event fetch result (amends `004`'s `MyRegistrationsList` behavior)

`004` conflated "confirmed deleted" and "could not be fetched" into a single `EventResponse | null`
per entry. This feature splits that into an explicit three-state result so FR-005 ("only ... when the
event has genuinely been removed, never merely because event details could not be fetched") is
representable in the type, not just in prose:

```ts
type LiveEventState =
  | { status: 'loading' }
  | { status: 'ok'; event: EventResponse }
  | { status: 'not-found' }   // confirmed 404 from apps/api — the event is genuinely gone
  | { status: 'unreachable' } // any other failure: non-2xx, network/CORS error, timeout
```

`fetchEvent` (`apps/web/src/components/dashboard/my-registrations-list.tsx`) returns this union
instead of `EventResponse | null`. `MyRegistrationListItem`'s `isDeleted` becomes
`liveEvent?.status === 'not-found'` — `'unreachable'` (and `'loading'`) fall back to
`record.eventSnapshot`, exactly like `'loading'` already did, satisfying the "no connectivity" edge
case (User Story 2, Scenario 3) as a direct consequence of the type, not a special case.

## Client-side: `useSyncExternalStore` server-snapshot contract (research.md #6)

No stored data shape changes. The fix is purely in which function is passed as `getServerSnapshot`:

| Component             | `getSnapshot` (client, unchanged)        | `getServerSnapshot` (fixed)                          |
|------------------------|--------------------------------------------|---------------------------------------------------------|
| `RegistrationPanel`    | `() => getMyRegistrationForEvent(event.id)` | `() => undefined` (was: same as `getSnapshot`)          |
| `MyRegistrationsList`  | `getMyRegistrations`                        | `() => []` — a stable empty-array reference, e.g. reusing `my-registrations.ts`'s existing module-level `cachedRecords` initial value, not a fresh literal per call (was: same as `getSnapshot`) |

## Validation Rules (amends `packages/shared/src/event-form-schema.ts`)

```ts
// Before:
imageUrl: z.string().trim().url('Enter a valid image URL.'),

// After:
imageUrl: z.string().trim().min(1, 'Image URL is required.').url('Enter a valid image URL.'),
```

No other field in `eventFormValuesSchema` changes. `buildEventFormSchema`'s `maxCapacity`
`superRefine` (unrelated to this feature) is untouched.

## CORS configuration (new, `apps/api`)

Not an entity, but a new validated config shape in `apps/api/src/config/env.ts` (extends the existing
`envSchema`, same pattern as every other var there):

| Var                    | Type                              | Default                   | Notes                                          |
|-------------------------|------------------------------------|-----------------------------|---------------------------------------------------|
| `CORS_ALLOWED_ORIGINS` | comma-separated string → `string[]` | `http://localhost:3001`   | Origins allowed to make cross-origin requests to `apps/api`. |

Derived policy (new `apps/api/src/config/cors-policy.ts`, mirrors `abuse-policy.ts`):

```ts
export interface CorsPolicy {
  readonly allowedOrigins: readonly string[];
}

export const corsPolicy: CorsPolicy = Object.freeze({
  allowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
});
```

`app.ts` passes `corsPolicy.allowedOrigins` to the `cors` middleware's `origin` option. No credentials
(cookies/auth headers) are involved — `apps/api` has no auth (`CLAUDE.md`) — so `credentials: true` is
not set.
