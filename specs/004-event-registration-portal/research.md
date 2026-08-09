# Phase 0 Research: Event Registration Portal

## 1. Rendering & mutation architecture

**Decision**: Server Components for the initial `/events` grid and `/events/[eventId]` detail fetch
(SSR, matching `apps/api`'s data via `lib/api-client.ts`), paired with Next.js Server Actions
(`"use server"`, colocated `actions.ts`) for `registerForEvent`/`cancelRegistration`. `/my-registrations`
is the one exception: because it must read `localStorage`, its list rendering happens in a Client
Component (`MyRegistrationsList`) behind a thin Server Component page shell that only renders static
chrome (`SiteHeader`).

**Rationale**: Keeps the same low-dependency footprint `003-admin-event-management-ui` established —
no SWR/React Query, no client state library. The only new client-side data access this feature
introduces is `localStorage`, which cannot be read on the server at all, so a Client Component is
required there regardless of preference; everywhere else, Server Components remain the default.

**Alternatives considered**:
- *Client-side fetching everywhere (SWR/React Query)* — would unify the data-fetching model across all
  three routes, but adds a new dependency for two of three routes that don't need it; rejected.
- *Storing registrations server-side keyed by a cookie/session instead of `localStorage`* — would let
  `/my-registrations` stay a Server Component, but introduces session/cookie infrastructure the spec
  explicitly avoided (clarification: browser-local storage, no login); rejected as out of scope.

## 2. Client-local "my registrations" persistence

**Decision**: A new plain module, `apps/web/src/lib/my-registrations.ts`, wraps `window.localStorage`
under a single versioned key (`event-portal:my-registrations:v1`) and exposes typed
get/add/mark-cancelled operations (see `data-model.md`). Because `/my-registrations` must fetch live
event data (capacity/date, and to detect a deleted event) from a Client Component, this feature adds
one new public environment variable, `NEXT_PUBLIC_API_BASE_URL`, alongside the existing server-only
`API_BASE_URL` in `apps/web/.env` — the existing `lib/api-client.ts` is explicitly server-only by
design (reads a non-`NEXT_PUBLIC_` var) and must not be repurposed for browser use.

**Rationale**: `localStorage` is the simplest mechanism that satisfies the resolved clarification
(device-local, no login) with zero new dependencies. A versioned key lets a future schema change
migrate or safely ignore old data instead of crashing on parse. Every function is guarded with a
`typeof window === 'undefined'` early return and a try/catch around `JSON.parse`/`setItem` (private
browsing can throw on quota) so a storage failure degrades to a toast ("Couldn't save this on your
device") rather than breaking the page — consistent with FR-014's "no blank/broken page" intent even
though this isn't strictly an API failure.

**Alternatives considered**:
- *`sessionStorage`* — clears on tab close, which is a worse fit than the spec's own description
  ("remembered ... later," implying persistence beyond the current session); rejected.
- *IndexedDB* — unnecessary complexity for a handful of small records; rejected.

## 3. Registration form fields and the `attendeeRef` mapping

**Decision**: `RegisterForm` collects **name** and **email**. Only `email` is sent to the API, as the
single `attendeeRef` field `POST /events/:eventId/registrations` accepts. `name` is persisted
alongside the local registration record (`MyRegistrationRecord.attendeeName`) purely for a friendlier
confirmation and "my registrations" display — it is never sent to `apps/api`, since neither
`Attendee` nor `Registration` has a name column.

**Rationale**: `attendeeRef` must be a stable, unique-ish identifier for `getOrCreateAttendeeByExternalRef`
— email is the natural fit and matches how a visitor would expect to be "found" if they ever needed
support. Dropping the name field entirely would save one input, but showing "You're registered,
Jordan!" and a name-labeled row in "my registrations" is a small UX win with no backend contract cost,
so it's kept as a deliberate, explicitly-scoped addition rather than a silent assumption.

**Alternatives considered**:
- *Email only, no name field* — simpler form, but a materially worse confirmation/"my registrations"
  display for negligible savings; rejected.
- *Concatenate name into `attendeeRef`* (e.g. `"Jordan <jordan@example.com>"`) — would pollute the
  identifier apps/api treats as an opaque unique key and complicate any future backend feature that
  reads `attendeeRef` as a plain email; rejected.

## 4. Screen structure: inline registration vs. dialog

**Decision**: Registration lives inline on `/events/[eventId]`, not in a modal/sheet triggered from
the grid. The detail page renders exactly one of: `RegisterForm` (open, not yet registered on this
device), `AlreadyRegisteredCard` (a local record exists and is active), or a disabled
"registration closed" notice (full or past).

**Rationale**: Spec US2 acceptance scenario 2 ("when they view that event again, they see their
existing registration status instead of a registration option") describes state that belongs to the
detail page itself, not a transient dialog. Keeping it inline also avoids an extra click to open a
dialog just to discover you're already registered, which better serves SC-002's under-1-minute
target than a grid-triggered modal would.

**Alternatives considered**:
- *Dialog opened from `EventCard`* — mirrors `003`'s admin pattern, but that pattern exists there
  because the admin table is the primary surface and editing many events benefits from staying on one
  screen; a public visitor viewing one event at a time doesn't share that constraint, and a full detail
  page also gives room for the fuller description/imagery FR-002 asks for. Rejected for this feature.

## 5. Browse/discovery: list scale and filtering (SC-001)

**Decision**: `GET /events` (spec 001) has no pagination or filtering; `/events` fetches the full list
once (Server Component) and renders it as a responsive card grid (`EventGrid`), which owns
client-side search-by-title and category-filter state over the already-fetched array. No backend
change.

**Rationale**: A public discovery grid degrades worse under raw pagination than a search/filter
control does — visitors browsing for something specific benefit more from narrowing the list than
from paging through it. This mirrors `003`'s resolution of the identical "no server pagination"
constraint (there: client-side table pagination) adapted to a browsing use case, and meets SC-001's
30-second discovery target at current/expected event volumes without an `apps/api` contract change.

**Alternatives considered**:
- *Client-side pagination (mirroring `003` exactly)* — works but is a worse fit for "find an event you
  want" than direct search/filter; rejected in favor of filter, though both are the same "no server
  change, handle it client-side" family of solution.
- *Add server-side search/filter query params to `GET /events`* — the eventual correct fix at scale,
  but an `apps/api` contract change out of scope for a portal-only feature; noted as a follow-up.

## 6. "My registrations" data source (no batch/list endpoint exists)

**Decision**: `/my-registrations` is served entirely from the `localStorage` record
(`lib/my-registrations.ts`) — `apps/api` has no `GET` endpoint for registrations at all (only
`POST`/`DELETE`), so there is nothing to query server-side. `MyRegistrationsList` opportunistically
refreshes each stored entry's event data via `GET /events/:eventId` (client-side, using
`NEXT_PUBLIC_API_BASE_URL`) to show current capacity/date and to detect a deleted event (404 →
"no longer available," with an option to remove the stale local entry).

**Rationale**: Matches `spec.md`'s own Assumptions section, which already anticipates this
("registrations remembered via device-local storage are a convenience layer only... a cleared browser
or different device means the visitor loses their personal view, not that the registration itself is
invalidated"). Adding a real backend query is an `apps/api` change out of scope for this feature.

**Alternatives considered**:
- *Add `GET /events/:eventId/registrations?attendeeRef=...`* — would let the portal confirm a local
  record's true status server-side (catching cancellations made elsewhere) and remove the
  per-entry-refresh Complexity Tracking concern, but is a backend contract change; flagged as the
  clear follow-up recommendation if this staleness window becomes a real problem, not built now.

## 7. Error message surfacing

**Decision**: `apps/api`'s error `code` is coarse (`NOT_FOUND`/`CONFLICT` cover multiple distinct
business rules — past event, full capacity, duplicate registration, already cancelled — see
`registration.service.ts`), but its `message` is specific and human-readable per case. The UI contract
therefore surfaces `error.message` verbatim (via `toast.error(result.message)` or an inline banner)
rather than trying to re-derive a finer-grained reason from `code` alone.

**Rationale**: Re-implementing case detection client-side (e.g. string-matching on `message`, or
adding a client-side lookup table) would be fragile and duplicate logic the backend already expresses
correctly. Displaying the API's own message directly satisfies FR-013/SC-006 ("specific, understandable
reason") with the least code and the least drift risk if the backend's wording changes.

**Alternatives considered**:
- *Client-side code-to-copy mapping table (as `003` does for `VALIDATION_ERROR`/`NOT_FOUND`/etc.)* —
  appropriate there because those are genuinely generic outcomes with one meaning each; not applicable
  here since a single `code` maps to several distinct, already-worded business messages.

## 8. Visual/UX direction ("intuitive and appealing to the eye")

**Decision**: Card grid (not a table) for `/events`, each `EventCard` built from the existing `Card` +
`EventThumbnail` (16:9, `object-cover`) + title + muted date/location line + category `Badge` +
formatted price + `EventAvailabilityBadge`. Availability communicates three states reusing existing
primitives only: **Open** → `Progress` showing "X/Y spots" (the exact component already used in the
current prototype); **Full** → `Badge variant="destructive"`; **Past** → `Badge variant="outline"` +
reduced card opacity so past events visually recede without disappearing (FR-003). Registration
success shows an inline confirmation panel (replacing the form) plus a `sonner` toast. Empty/loading
states reuse the `Card`-centered-icon shape and `Skeleton` primitive `003` already established, with
visitor-facing copy and icons swapped in.

**Rationale**: Satisfies the "intuitive and appealing to the eye" directive using only components
already in the project (no new dependency), keeping one consistent design language across admin and
visitor surfaces rather than introducing a second visual style.

**Alternatives considered**:
- *Reuse `003`'s `Table` for the public list* — rejected; a table is a poor fit for a public, visually
  browsable catalog and doesn't showcase `imageUrl`, which matters for an "appealing" browsing
  experience.

## 9. Automated testing for `apps/web`

**Decision**: No new frontend test framework is introduced, matching `003`'s precedent. `quickstart.md`
provides the executable manual validation (constitution's "tests **or** executable validation steps"
allowance).

**Rationale**: Standing up Vitest/Testing Library or Playwright for `apps/web` remains a separable
investment not specific to this feature; bundling it here would blur delivery boundaries, same
reasoning `003`'s research.md already recorded.

**Alternatives considered**:
- *Add component tests now* — deferred; flagged as a standing follow-up recommendation, not silently
  skipped.
