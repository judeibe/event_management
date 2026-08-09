# Phase 1 Data Model: Admin Event Management UI

This feature does not own persistent storage — `apps/api`'s Prisma `Event`/`Registration` models
(spec `001-event-registration-api/data-model.md`) remain the source of truth. This document covers the
**view-model and form shapes** this UI introduces on top of that existing contract.

## Event (consumed shape)

Sourced verbatim from `@event-management/shared`'s `EventResponse` (`packages/shared/src/event.ts`) —
no new fields, no reshaping:

| Field                   | Type     | Notes                                                              |
|--------------------------|----------|----------------------------------------------------------------------------|
| `id`                    | `string` | UUID; used as React key and mutation target.                              |
| `title`                 | `string` | Displayed as primary column in the admin table.                           |
| `description`           | `string` | Shown in edit form and any detail expansion; not shown in table row.      |
| `eventDate`              | `string` (ISO datetime) | Parsed to `Date` client-side for display and for the past-date form check. |
| `maxCapacity`            | `number` | Editable; constrained at submit time (see Validation Rules).              |
| `currentRegistrations`   | `number` | **Read-only** in this UI — never sent in create/update payloads.          |
| `category`               | `string` | Rendered as a `Badge` in the table.                                       |
| `location`               | `string` | Plain text column.                                                        |
| `price`                  | `number` | Formatted as currency for display; editable as a plain non-negative number.|
| `imageUrl`               | `string` (URL) | Rendered via `<img>` with fallback (research.md #6).                |

## EventFormValues (client form state)

Shape validated by the new shared zod schema (`packages/shared`, see below) and driven by
`react-hook-form`. Used for both create and edit (`mode` prop distinguishes the two; edit pre-fills
from an `EventResponse`).

| Field         | Type     | Required | Notes                                                                 |
|---------------|----------|----------|------------------------------------------------------------------------|
| `title`       | `string` | yes      | Non-empty, trimmed.                                                    |
| `description` | `string` | yes      | Non-empty, trimmed.                                                    |
| `eventDate`   | `string` (datetime-local input value → ISO string on submit) | yes | Must not resolve to a past instant (FR-003). |
| `location`    | `string` | yes      | Non-empty, trimmed.                                                    |
| `category`    | `string` | yes      | Non-empty, trimmed; free-form text input (per spec Assumptions).       |
| `price`       | `number` | yes      | ≥ 0.                                                                    |
| `maxCapacity` | `number` | yes      | Positive integer; on edit, additionally must be ≥ event's current active registration count (FR-008), enforced client-side using the `currentRegistrations` value already in hand, with the server's `ConflictError` as the authoritative backstop. |
| `imageUrl`    | `string` (URL) | yes | Must be a well-formed URL (matches API's `z.string().url()`).          |

This schema lives in `packages/shared` (e.g. `packages/shared/src/event-form-schema.ts`), exported
from `packages/shared/src/index.ts` alongside the existing `EventResponse` type, so `apps/web` imports
one definition of "what a valid event looks like" instead of re-declaring it. `apps/api`'s existing
`event.types.ts` schema is unchanged by this feature.

## Server Action result shape

Mutations return a discriminated union so client components can branch without throwing across the
server/client boundary:

```text
type ActionResult =
  | { ok: true; event: EventResponse }              // create/update
  | { ok: true }                                     // delete
  | { ok: false; code: ApiErrorCode; message: string; fieldErrors?: Record<string, string> }
```

`code`/`message` are taken from the API's `ApiErrorResponse` envelope (`packages/shared`'s
`ApiErrorBody`); `fieldErrors` is populated when `code === 'VALIDATION_ERROR'` by mapping the API's
Zod `details.issues` (or the client-side resolver's own validation) onto react-hook-form's
`setError(field, ...)`.

## Validation Rules (traceability to FR-003 / FR-008)

- Required non-empty: `title`, `description`, `location`, `category`, `imageUrl`, `eventDate` — client
  schema rejects empty/whitespace-only values before submit (FR-003, FR-004).
- `eventDate` not in the past — checked against `new Date()` at submit time on the client, and already
  enforced implicitly by business rules server-side via normal create/update flow (FR-003).
- `price >= 0` — client schema (FR-003).
- `maxCapacity` positive integer — client schema (FR-003).
- `maxCapacity >= currentRegistrations` on edit — client-side pre-check using the already-fetched
  `currentRegistrations`, with the server's 409 `ConflictError` (`event.service.ts`) as the
  authoritative rule the UI must surface verbatim if the client-side check is stale (FR-008).
- `imageUrl` well-formed URL — client schema (FR-002).

## State Transitions

Events have no explicit status/lifecycle field relevant to this UI (registration `status` belongs to
the `Registration` entity, not `Event`, and is out of scope here per spec's Key Entities section). The
only "transition" this feature manages is existence: **created → (optionally updated any number of
times) → deleted**. Delete is a hard delete (spec Assumptions), immediately removing the row from both
the admin table and the attendee-facing `/events` list after `revalidatePath`.
