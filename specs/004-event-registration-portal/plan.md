# Implementation Plan: Event Registration Portal

**Branch**: `004-event-registration-portal` | **Date**: 2026-08-08 | **Spec**: `/specs/004-event-registration-portal/spec.md`

**Input**: Feature specification from `/specs/004-event-registration-portal/spec.md`

## Summary

Build the public, unauthenticated visitor experience in `apps/web`: a visually appealing `/events`
card grid (replacing the current unfinished prototype), an `/events/[eventId]` detail page that
inlines registration, and a `/my-registrations` page — all consuming `apps/api`'s existing `Event`
and `Registration` endpoints (spec `001-event-registration-api`) with no backend changes. Since
`apps/api` has no auth and no endpoint to list registrations by attendee, "my registrations" is
served entirely from a new device-local `localStorage` module rather than a server query, per the
clarification already recorded in `spec.md`. Registration collects name + email; only email is sent
to the API as `attendeeRef`, name is a local-only display convenience. Built with the project's
existing shadcn/ui + Tailwind v4 kit and the same Server Component + Server Action architecture
`003-admin-event-management-ui` established, reusing its primitives and patterns wherever they fit a
public-facing (not admin) surface.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16 (App Router), React 19

**Primary Dependencies**: Next.js Server Components + Server Actions, shadcn/ui (`@base-ui/react`
primitives, already scaffolded), Tailwind CSS v4, `react-hook-form` + `@hookform/resolvers/zod`,
`zod` (schema shared via `packages/shared`), `lucide-react` (icons), shadcn `sonner` (toast), browser
`localStorage` (Web Storage API) for device-local "my registrations" persistence — new to this
feature, no other app currently uses client-side storage.

**Storage**: N/A server-side — consumes `apps/api`'s existing REST endpoints (`GET /events`,
`GET /events/:eventId`, `POST /events/:eventId/registrations`,
`DELETE /events/:eventId/registrations/:attendeeRef`, spec `001-event-registration-api`) over HTTP.
No Prisma/schema changes. Client-side: `localStorage`, scoped to one browser/device, holding a small
list of the visitor's own registration records (research.md #2).

**Testing**: No automated frontend test suite exists in `apps/web` yet (per `CLAUDE.md`, unchanged by
this feature); acceptance criteria are validated via the manual, executable scenarios in
`quickstart.md` (constitution's "tests **or** executable validation steps" allowance). `apps/api`'s
existing test suite is unaffected since this feature does not modify `apps/api`.

**Target Platform**: Web browser, served by `apps/web`'s Next.js dev/prod server on `:3001`. Unlike
`003`'s desktop-first admin tool, this is the public-facing surface, so layout is responsive
mobile-through-desktop from the start (grid collapses to a single column on small screens).

**Project Type**: Web application — frontend addition inside the existing pnpm/Turborepo monorepo,
plus a small additive export in `packages/shared`. `apps/api` is untouched.

**Performance Goals**: Events grid renders and is interactive on local dev in well under 2s at seed
scale. SC-001/SC-002/SC-004 are UX-latency budgets (find+view an event <30s, register <1min, cancel
<30s) rather than raw throughput numbers; register/cancel actions update the visible availability and
the visitor's local registration state immediately on success (no extra round-trip before the UI
reflects the outcome), satisfying SC-005.

**Constraints**: No auth/authz (matches `apps/api`'s explicit out-of-scope stance); must not change
`apps/api`'s tested contract/behavior; must reuse the existing shadcn kit rather than introducing a
second component library; `GET /events` has no server-side pagination or filtering today and is not
being changed by this feature (research.md #5); `apps/api` has no endpoint to list registrations by
`attendeeRef`, so "my registrations" is `localStorage`-only and will not reflect registrations
cancelled through another channel until the portal's own cancel flow runs (research.md #6, spec.md
Assumptions); the registration form's `name` field is never sent to the API (no such field exists on
`Attendee`/`Registration`) — only `email` is sent, as `attendeeRef` (research.md #3).

**Scale/Scope**: Three routes (`/events` grid replacing the prototype, new `/events/[eventId]`
detail+registration page, new `/my-registrations` page) + ~10 new presentational/client components
under `components/dashboard/` (plus promoting one existing component to a shared location) + 2 new
Server Actions (`registerForEvent`, `cancelRegistration`) + 1 new client-side persistence module + 1
new shared zod schema module + 1 new sidebar nav entry. No new `apps/api` routes or entities.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Pre-Phase 0 Gate Check:

- **Code Quality First**: PASS — new code is split into focused, single-responsibility components
  (`EventGrid`, `EventCard`, `EventAvailabilityBadge`, `RegisterForm`, `AlreadyRegisteredCard`,
  `CancelRegistrationDialog`, `MyRegistrationsList`), a dedicated persistence module
  (`lib/my-registrations.ts`), and a shared validation schema — following the same colocation
  convention `003` already established under `components/admin/`, applied here under
  `components/dashboard/`.
- **Functional Correctness**: PASS, with the same documented gap as `003` — no automated frontend
  test harness yet, so acceptance criteria are validated via `quickstart.md`'s executable scenarios.
  Not silently dropped; flagged as a standing follow-up (research.md #9).
- **User Experience by Contract**: PASS — `contracts/ui-contract.md` fixes how registration and
  cancellation errors map to specific UI treatment. The API already returns a distinct, human-readable
  `message` per business-rule violation (past event / full / duplicate / already-cancelled) even
  though the `code` field is coarse (`CONFLICT`/`NOT_FOUND`); the UI contract surfaces that message
  verbatim rather than inventing a second layer of copy, keeping behavior predictable and traceable to
  what the API actually says (FR-013, SC-006).
- **Efficient Data and API Interaction**: CONCERN, justified — (a) `GET /events` has no server-side
  pagination/filtering, so the full list is fetched once and filtered client-side; (b) there is no
  batch endpoint to list registrations by attendee, so `/my-registrations` issues one
  `GET /events/:eventId` per locally-stored registration to refresh live capacity/date. Both are
  documented in Complexity Tracking below.
- **Delivery Standards**: PASS — Server Action inputs are validated (shared zod schema) before any
  network call; `localStorage` access is guarded for SSR (`typeof window` checks) and wrapped in
  try/catch for quota/private-browsing failures, surfaced as a toast rather than a crash; the one new
  environment variable (`NEXT_PUBLIC_API_BASE_URL`, needed because the my-registrations refresh runs
  client-side) is additive and documented in `.env`.

Post-Phase 1 Gate Check:

- PASS — `research.md`, `data-model.md`, `contracts/ui-contract.md`, and `quickstart.md` resolve every
  Technical Context item, define the error/loading contract explicitly, and both constitutional
  concerns (list filtering, per-entry registration refresh) are documented with rationale and a scoped
  alternative in Complexity Tracking below rather than left implicit.

## Project Structure

### Documentation (this feature)

```text
specs/004-event-registration-portal/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── ui-contract.md   # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md  # /speckit-specify output
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/
│   │   └── (dashboard)/
│   │       ├── events/
│   │       │   ├── page.tsx              # edited: replaces the raw-fetch prototype with
│   │       │   │                          #   apiClient + EventGrid, proper loading/error states
│   │       │   ├── loading.tsx           # new: Skeleton grid for FR-014
│   │       │   └── [eventId]/
│   │       │       ├── page.tsx          # new: Server Component, event detail + inline
│   │       │       │                      #   registration/status (FR-002, FR-005, FR-007)
│   │       │       ├── loading.tsx       # new: Skeleton detail
│   │       │       └── actions.ts        # new: registerForEvent / cancelRegistration Server Actions
│   │       └── my-registrations/
│   │           └── page.tsx              # new: thin Server Component shell + client MyRegistrationsList
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── event-grid.tsx            # new: client, owns search/category filter state
│   │   │   ├── event-card.tsx            # new
│   │   │   ├── event-availability-badge.tsx  # new: Open/Full/Past presentational logic
│   │   │   ├── events-empty-state.tsx    # new
│   │   │   ├── register-form.tsx         # new: client, react-hook-form + zod
│   │   │   ├── already-registered-card.tsx  # new
│   │   │   ├── cancel-registration-dialog.tsx  # new: AlertDialog confirm
│   │   │   ├── my-registrations-list.tsx # new: client, reads localStorage + refreshes event data
│   │   │   └── my-registration-list-item.tsx  # new
│   │   ├── shared/
│   │   │   └── event-thumbnail.tsx       # moved from components/admin/ (used by both admin and
│   │   │                                  #   dashboard); components/admin/event-form-dialog.tsx's
│   │   │                                  #   import path updated accordingly
│   │   ├── admin/                        # existing, unchanged except the one import path above
│   │   ├── app-sidebar.tsx               # existing, edited: add "My Registrations" nav entry to
│   │   │                                  #   attendeeNavItems
│   │   └── ui/                           # existing shadcn primitives, reused as-is (no new
│   │                                      #   primitives required — card, badge, progress, skeleton,
│   │                                      #   button, input, field, alert-dialog, sonner all exist)
│   └── lib/
│       └── my-registrations.ts           # new: localStorage read/write module (data-model.md)
└── .env                                  # edited: add NEXT_PUBLIC_API_BASE_URL alongside the
                                           #   existing server-only API_BASE_URL (research.md #2)

packages/shared/
└── src/
    ├── registration-form-schema.ts       # new: zod schema for name+email registration form values
    └── index.ts                          # edited: export the new schema/types
```

**Structure Decision**: Frontend-only addition inside the existing `apps/web` App Router structure,
using the `(dashboard)` route group already wired into `AppSidebar`'s attendee nav (`Events` →
`/events`). The prototype at `app/(dashboard)/events/page.tsx` is replaced in place rather than left
alongside a new route, and two new routes (`[eventId]` detail, `my-registrations`) are added under
the same group. `components/admin/event-thumbnail.tsx` is promoted to `components/shared/` since both
the admin and dashboard surfaces now need it — a small refactor, not a new pattern. The only
`packages/shared` change is additive (one new schema module, mirroring `event-form-schema.ts`),
leaving `apps/api` fully untouched. One new environment variable is required —
`NEXT_PUBLIC_API_BASE_URL` — because `/my-registrations` must read `localStorage` and therefore fetch
from a Client Component, where the existing server-only `lib/api-client.ts`/`API_BASE_URL` are not
usable (research.md #2).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Full-list fetch + client-side search/category filter instead of server-side filtering (Efficient Data and API Interaction principle) | `GET /events` (spec `001-event-registration-api`) has no query params today; this is a UI-only feature that must not change that tested, contract-defined endpoint. | Adding server-side filtering requires changing `apps/api`'s route/service and its OpenAPI contract — out of scope for a portal-only feature. Client-side filtering over the full fetched array meets SC-001's 30-second discovery target at current event volumes; flagged in `research.md` #5 as a follow-up recommendation if event volume grows well beyond a few hundred. |
| Per-entry `GET /events/:eventId` refresh on `/my-registrations` instead of one batched registrations query (Efficient Data and API Interaction principle) | `apps/api` has no endpoint to list registrations (or fetch several events) by `attendeeRef`/id batch; each locally-stored registration must be refreshed individually to show current capacity/date and detect deletion. | Adding a batch/list-by-attendee endpoint is an `apps/api` contract change — out of scope here. A visitor's locally-stored registration count is expected to stay small (human-scale, not hundreds), so N sequential/parallel `GET /events/:eventId` calls stay well within SC-004's 30-second cancel-flow budget; flagged in `research.md` #6 as a backend follow-up if this ever needs to scale. |
