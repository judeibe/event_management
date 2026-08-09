# UI Contract: Event Registration Portal

This feature is a consumer of the existing `apps/api` contract
(`specs/001-event-registration-api/contracts/openapi.yaml`), not a new external interface. This
document fixes the **screen/route/action contract** this feature introduces inside `apps/web`, so
implementation and QA can validate against a stable shape.

## Routes

| Route                    | Type                                  | Purpose                                                                 |
|----------------------------|----------------------------------------|----------------------------------------------------------------------------|
| `/events`                 | Server Component                       | Card grid of all events with search/category filter, entry point for browsing (FR-001, FR-003). Replaces the previous prototype at this path. |
| `/events/[eventId]`       | Server Component                       | Full event detail + inline registration or "already registered"/"closed" state (FR-002, FR-004, FR-005, FR-007). |
| `/my-registrations`       | Server Component shell + Client Component | Lists the visitor's device-local registrations, cancel action (FR-009, FR-010, FR-011). |

Reachable from `AppSidebar`'s attendee nav group (`Events` already present; `My Registrations` added
by this feature). No auth gating, consistent with the rest of the project.

## Components (new, `apps/web/src/components/dashboard/` unless noted)

| Component                    | Kind              | Responsibility                                                                       |
|-------------------------------|-------------------|-----------------------------------------------------------------------------------------|
| `EventGrid`                  | Client Component  | Renders the responsive card grid; owns search-by-title/category-filter state (FR-001, research.md #5). |
| `EventCard`                  | Presentational    | One event's summary (thumbnail, title, date, location, category, price, availability), links to detail. |
| `EventAvailabilityBadge`     | Presentational    | Derives/renders Open (`Progress`) / Full / Past state from an `Event` (FR-003).          |
| `EventsEmptyState`           | Presentational    | Shown when no events exist.                                                             |
| `RegisterForm`                | Client Component  | Name+email form, react-hook-form + zod, calls `registerForEvent`, shows inline success (FR-005, FR-006). |
| `AlreadyRegisteredCard`       | Presentational    | Shown instead of `RegisterForm` when a local record exists for this event (FR-007).      |
| `CancelRegistrationDialog`    | Client Component  | `AlertDialog` confirmation, calls `cancelRegistration` (FR-011).                         |
| `MyRegistrationsList`         | Client Component  | Reads `localStorage`, refreshes each entry's event data, renders items or empty state (FR-009, FR-010). |
| `MyRegistrationListItem`      | Presentational    | One row: event summary, status, cancel action (reuses `CancelRegistrationDialog`).       |
| `EventThumbnail` (`components/shared/`) | Presentational | Promoted from `components/admin/`; used by `EventCard` and the detail page.             |

## Server Actions (`apps/web/src/app/(dashboard)/events/[eventId]/actions.ts`)

Both actions validate input against the shared zod schema (`packages/shared`) before calling
`apps/api`, and return the result unions defined in `data-model.md`. `localStorage` writes happen in
the calling Client Component after the action resolves (Server Actions cannot access `localStorage`).

### `registerForEvent`

- **Input**: `{ eventId: string; values: RegistrationFormValues }`.
- **Calls**: `POST {API_BASE_URL}/events/:eventId/registrations` with `{ attendeeRef: values.email }`.
- **Success**: `{ ok: true, registration: RegistrationResponse }`; triggers
  `revalidatePath('/events')` and `revalidatePath('/events/${eventId}')`. Caller then calls
  `addMyRegistration(...)`.
- **Failure**:
  - 400 → `{ ok: false, code: 'VALIDATION_ERROR', message, fieldErrors }`.
  - 404 → `{ ok: false, code: 'NOT_FOUND', message }` — event was deleted since the page loaded.
  - 409 → `{ ok: false, code: 'CONFLICT', message }` — covers past event, full capacity, and duplicate
    registration; `message` is displayed verbatim (research.md #7).
  - network/5xx → `{ ok: false, code: 'INTERNAL_SERVER_ERROR', message: <user-friendly copy> }`.

### `cancelRegistration`

- **Input**: `{ eventId: string; attendeeRef: string }`.
- **Calls**: `DELETE {API_BASE_URL}/events/:eventId/registrations/:attendeeRef`.
- **Success**: `{ ok: true }`; triggers the same revalidation as above. Caller then calls
  `markMyRegistrationCancelled(registrationId)`.
- **Failure**:
  - 404, message `"Event ... was not found."` → `{ ok: false, code: 'NOT_FOUND', message }` — event
    deleted; UI removes the stale local entry.
  - 404, message `"No active registration exists..."` → `{ ok: false, code: 'NOT_FOUND', message }` —
    already cancelled elsewhere; UI still calls `markMyRegistrationCancelled` locally to sync state
    (research.md #7, data-model.md State Transitions), since this response confirms the true state.
  - network/5xx → `{ ok: false, code: 'INTERNAL_SERVER_ERROR', message: <user-friendly copy> }`.

## Client-side module contract (`apps/web/src/lib/my-registrations.ts`)

Not a Server Action — a plain browser-only module, part of this feature's contract because
`MyRegistrationsList` and the detail page both depend on its exact signatures (see `data-model.md` for
the full type and function list). Read operations (`getMyRegistrations`,
`getMyRegistrationForEvent`) must never throw; write operations
(`addMyRegistration`/`markMyRegistrationCancelled`/`removeMyRegistration`) surface failures as a
`sonner` toast, not a thrown error, so a `localStorage` failure never blocks the surrounding page.

## Error surfacing contract (traceability to FR-013, SC-006)

| Situation                                   | HTTP | UI treatment                                                                 |
|-----------------------------------------------|------|---------------------------------------------------------------------------------|
| `VALIDATION_ERROR`                            | 400  | Field-level errors under Name/Email via `setError`; form stays open, values preserved. |
| `NOT_FOUND` (event deleted)                   | 404  | Toast with the API's message + page/list refresh (`router.refresh()`/`revalidatePath`). |
| `NOT_FOUND` (registration already cancelled)  | 404  | Toast with the API's message; local record marked cancelled (research.md #7).   |
| `CONFLICT` (past event / full / duplicate)    | 409  | Inline banner in `RegisterForm` (or toast on `/my-registrations`) with the API's message verbatim; form stays open where applicable. |
| `PAYLOAD_TOO_LARGE`                           | 413  | Toast: "That request was too large." (defensive; not expected from normal form use). |
| `RATE_LIMIT_EXCEEDED`                         | 429  | Toast: "Too many requests — please wait a moment and try again."                |
| `INTERNAL_SERVER_ERROR`                       | 500  | Toast: generic "Something went wrong, please try again." — no raw error text shown. |
| network failure / offline                     | n/a  | Toast: "Couldn't reach the server. Please check your connection and try again." Form values preserved. |
| `localStorage` read/write failure             | n/a  | Toast: "Couldn't save this on your device." Registration on the server still succeeded if the API call itself succeeded — the toast clarifies only the local bookmarking failed. |

## Loading-state contract (FR-014)

- `/events` fetch: `app/(dashboard)/events/loading.tsx` renders a grid of `Skeleton` cards matching
  `EventCard`'s shape.
- `/events/[eventId]` fetch: `app/(dashboard)/events/[eventId]/loading.tsx` renders a `Skeleton`
  detail layout.
- `/my-registrations`: `MyRegistrationsList` shows `Skeleton` rows while its per-entry
  `GET /events/:eventId` refreshes are in flight (initial local read is synchronous, so this covers
  only the live-data refresh, not the whole page).
- Form submit (`RegisterForm`, `CancelRegistrationDialog`): submit/confirm button shows a spinner and
  is disabled for the duration of the action (`isSubmitting`/`useTransition`), same pattern as
  `003`'s `EventFormDialog`.
