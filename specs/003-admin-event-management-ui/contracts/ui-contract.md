# UI Contract: Admin Event Management

This feature is a consumer of the existing `apps/api` contract (`specs/001-event-registration-api/contracts/openapi.yaml`),
not a new external interface. This document fixes the **screen/route/action contract** this feature
introduces inside `apps/web`, so implementation and QA can validate against a stable shape.

## Route

| Route            | Type              | Purpose                                                                 |
|-------------------|-------------------|--------------------------------------------------------------------------|
| `/admin/events`   | Server Component  | Lists all events (Table), entry point for Add/Edit/Delete (FR-001).      |

Reachable from `AppSidebar`'s admin nav group (no auth gating — FR-016). No other new routes are
introduced; create/edit/delete happen in-place via dialogs (research.md #4).

## Components (new, `apps/web/src/components/admin/`)

| Component            | Kind             | Responsibility                                                                    |
|------------------------|------------------|------------------------------------------------------------------------------------|
| `EventsTable`          | Client Component | Renders the paginated event list, wires row actions to dialogs.                    |
| `EventFormDialog`      | Client Component | Create/Edit form (`mode: "create" \| "edit"`), react-hook-form + zod, calls the matching server action, surfaces field + top-level errors. |
| `DeleteEventDialog`    | Client Component | `AlertDialog` confirmation; shows a registration-count warning when applicable (FR-011). |
| `EventsEmptyState`     | Presentational   | Shown when the list is empty (FR-015), with a CTA that opens `EventFormDialog` in create mode. |

## Server Actions (`apps/web/src/app/(admin)/admin/events/actions.ts`)

All actions validate input against the shared zod schema (`packages/shared`) before calling
`apps/api`, and return the `ActionResult` union defined in `data-model.md`.

### `createEvent`

- **Input**: `EventFormValues` (data-model.md).
- **Calls**: `POST {API_BASE_URL}/events` (spec 001 contract).
- **Success**: `{ ok: true, event: EventResponse }`; triggers `revalidatePath('/admin/events')` and
  `revalidatePath('/events')`.
- **Failure**: API 400 → `{ ok: false, code: 'VALIDATION_ERROR', message, fieldErrors }`; network/5xx →
  `{ ok: false, code: 'INTERNAL_SERVER_ERROR', message: <user-friendly copy> }`.

### `updateEvent`

- **Input**: `{ eventId: string; values: Partial<EventFormValues> }`.
- **Calls**: `PATCH {API_BASE_URL}/events/:eventId`.
- **Success**: `{ ok: true, event: EventResponse }`; same revalidation as create.
- **Failure**:
  - 400 → `VALIDATION_ERROR` with `fieldErrors` (FR-004).
  - 404 → `NOT_FOUND` — client shows "This event no longer exists" and refreshes the list (edge case:
    concurrently-deleted event).
  - 409 → `CONFLICT` — client shows the capacity-vs-registrations message verbatim from the API and
    keeps the dialog open with the admin's entered values intact (FR-008).

### `deleteEvent`

- **Input**: `{ eventId: string }`.
- **Calls**: `DELETE {API_BASE_URL}/events/:eventId`.
- **Success**: `{ ok: true }`; same revalidation as create/update.
- **Failure**: 404 → `NOT_FOUND` (already deleted, e.g. by another admin) — client shows a friendly
  message and refreshes the list rather than erroring hard.

## Error surfacing contract (traceability to FR-013)

| API `code`             | HTTP | UI treatment                                                                 |
|--------------------------|------|-------------------------------------------------------------------------------|
| `VALIDATION_ERROR`       | 400  | Field-level errors under each input via `setError`; form stays open, values preserved. |
| `NOT_FOUND`              | 404  | Toast + list refresh; dialog closes (target no longer exists).                |
| `CONFLICT`               | 409  | Top-of-form error banner in `EventFormDialog` with the API's message; form stays open. |
| `PAYLOAD_TOO_LARGE`      | 413  | Toast: "That request was too large." (defensive; not expected from normal form use). |
| `RATE_LIMIT_EXCEEDED`    | 429  | Toast: "Too many requests — please wait a moment and try again."              |
| `INTERNAL_SERVER_ERROR`  | 500  | Toast: generic "Something went wrong, please try again." — no raw error text shown (FR-013). |
| network failure / offline | n/a | Toast: "Couldn't reach the server. Your changes were not saved." Form values are preserved (edge case). |

## Loading-state contract (FR-014)

- List fetch: `loading.tsx` under `(admin)/admin/events/` renders `Skeleton` rows matching the table
  shape.
- Form submit: submit button shows a spinner + is disabled for the duration of the action
  (`useFormStatus`/`useTransition`); dialog cannot be dismissed mid-submit.
- Delete confirm: confirm button in `DeleteEventDialog` shows the same pending treatment.
