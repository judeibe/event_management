# Implementation Plan: Admin Event Management UI

**Branch**: `003-admin-event-management-ui` | **Date**: 2026-08-07 | **Spec**: `/specs/003-admin-event-management-ui/spec.md`

**Input**: Feature specification from `/specs/003-admin-event-management-ui/spec.md`

## Summary

Add an admin-facing screen (`/admin/events`) in `apps/web` where an admin can add, update, and delete
events served by `apps/api`'s existing `Event` endpoints. Built with the project's already-scaffolded
shadcn/ui ("base-rhea" style, `@base-ui/react` primitives) + Tailwind CSS v4 kit: a `Table` list with
client-side pagination, a shared create/edit `Dialog` form (`react-hook-form` + a zod schema newly
shared via `packages/shared`), and an `AlertDialog` delete confirmation that warns when an event has
active registrations. Mutations are Next.js Server Actions that call `apps/api` directly and
`revalidatePath` both the admin and attendee-facing event lists. No auth/authz is introduced,
consistent with the project's current no-auth scope.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16 (App Router), React 19

**Primary Dependencies**: Next.js Server Components + Server Actions, shadcn/ui ("base-rhea" style,
`@base-ui/react` primitives — already scaffolded in `apps/web`), Tailwind CSS v4, `react-hook-form` +
`@hookform/resolvers/zod`, `zod` (schema shared via `packages/shared`), `lucide-react` (icons), shadcn
`sonner` (toast notifications)

**Storage**: N/A — this feature has no direct storage; it consumes `apps/api`'s existing REST endpoints
(`GET/POST/PATCH/DELETE /events`, spec `001-event-registration-api`) over HTTP. No Prisma/schema
changes.

**Testing**: No automated frontend test suite exists in `apps/web` yet (per `CLAUDE.md`); acceptance
criteria are validated via the manual, executable scenarios in `quickstart.md` (research.md #7).
`apps/api`'s existing unit/contract tests are unaffected since this feature does not modify `apps/api`.

**Target Platform**: Web browser, served by `apps/web`'s Next.js dev/prod server on `:3001`,
desktop-first responsive layout (admin tool, not optimized for small screens as a P1 concern).

**Project Type**: Web application — frontend addition inside the existing pnpm/Turborepo monorepo,
plus a small additive export in `packages/shared`.

**Performance Goals**: Events list renders and is interactive on local dev in well under 2s with the
seed-scale dataset; SC-005 requires the list to stay usable at 200+ events via client-side pagination
(research.md #5). Form/dialog interactions (open, validate, submit-pending) feel instant (no
avoidable added latency beyond the underlying API round-trip).

**Constraints**: No auth/authz (matches `apps/api`'s explicit out-of-scope stance, spec FR-016); must
not change `apps/api`'s tested contract/behavior; must reuse the existing shadcn base-rhea kit rather
than introducing a second component library; `imageUrl` is a URL reference only (no file upload,
spec Assumptions); `GET /events` has no server-side pagination today and is not being changed by this
feature (research.md #5, Complexity Tracking below).

**Scale/Scope**: One new admin route + ~4 new client components (`EventsTable`, `EventFormDialog`,
`DeleteEventDialog`, `EventsEmptyState`) + 3 Server Actions + ~10 new shadcn primitives added via CLI +
one small additive schema module in `packages/shared`. No new routes/entities beyond what's in
`contracts/ui-contract.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Pre-Phase 0 Gate Check:

- **Code Quality First**: PASS — new admin UI code is split into focused components (table, form
  dialog, delete dialog, empty state) and Server Actions, following the same colocation pattern
  already used elsewhere in `apps/web`; the shared validation schema removes a duplication risk
  between `apps/api` and `apps/web`.
- **Functional Correctness**: PASS, with a documented gap — `apps/web` has no automated test harness
  yet, so acceptance criteria are validated via `quickstart.md`'s executable manual scenarios rather
  than automated tests (constitution allows "tests **or** executable validation steps"). Standing up a
  frontend test framework is flagged as a follow-up, not silently dropped (research.md #7).
- **User Experience by Contract**: PASS — `contracts/ui-contract.md` fixes how each API error code
  (`VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, etc.) maps to a specific, actionable UI treatment, so
  error handling is consistent across create/update/delete rather than ad hoc per call site.
- **Efficient Data and API Interaction**: CONCERN, justified — `GET /events` has no server-side
  pagination; this feature fetches the full list and paginates client-side. See Complexity Tracking.
- **Delivery Standards**: PASS — Server Action inputs are validated (shared zod schema) before any
  network call; errors are surfaced to the admin with meaningful context (not raw exceptions); no new
  environment/config surface beyond a server-only API base URL, which will be documented in `.env`.

Post-Phase 1 Gate Check:

- PASS — `research.md`, `data-model.md`, `contracts/ui-contract.md`, and `quickstart.md` resolve every
  Technical Context item, define the error/loading contract explicitly, and the one constitutional
  concern (list pagination) is documented with rationale and a scoped alternative in Complexity
  Tracking below rather than left implicit.

## Project Structure

### Documentation (this feature)

```text
specs/003-admin-event-management-ui/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── ui-contract.md   # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/
│   │   └── (admin)/
│   │       ├── layout.tsx                  # new: admin shell (reuses AppSidebar/SiteHeader)
│   │       └── admin/
│   │           └── events/
│   │               ├── page.tsx            # new: Server Component, fetches events, renders EventsTable
│   │               ├── loading.tsx         # new: Skeleton table for FR-014
│   │               └── actions.ts          # new: createEvent / updateEvent / deleteEvent Server Actions
│   ├── components/
│   │   ├── admin/
│   │   │   ├── events-table.tsx            # new
│   │   │   ├── event-form-dialog.tsx       # new
│   │   │   ├── delete-event-dialog.tsx     # new
│   │   │   └── events-empty-state.tsx      # new
│   │   ├── app-sidebar.tsx                 # existing, edited: populate the two empty SidebarGroups
│   │   │                                   #   (attendee nav "Events" + admin nav "Manage Events")
│   │   └── ui/                             # existing shadcn primitives + new ones added via CLI:
│   │                                       #   dialog, alert-dialog, form, select, textarea, label,
│   │                                       #   card, table, dropdown-menu, badge, sonner
│   └── lib/
│       └── api-client.ts                   # new: small server-side fetch wrapper for apps/api base URL
└── .env                                    # new: API_BASE_URL=http://localhost:3000 (server-only, no NEXT_PUBLIC_ prefix)

packages/shared/
└── src/
    ├── event-form-schema.ts                # new: zod schema for create/update event form values
    └── index.ts                            # edited: export the new schema/types
```

**Structure Decision**: Frontend-only addition inside the existing `apps/web` App Router structure,
using the already-scaffolded (and currently empty) `src/app/(admin)/` route group for the new
`/admin/events` screen, and the existing `src/app/(dashboard)/events/` route for the attendee-facing
list (unchanged by this feature beyond benefiting from `revalidatePath` after admin mutations). New
shadcn primitives are added to the existing `src/components/ui/` directory via the CLI already
configured in `components.json`, keeping one design system rather than forking a second. The one
non-UI change is additive-only in `packages/shared` (a new validation schema module), leaving
`apps/api` fully untouched.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Full-list fetch + client-side pagination instead of server-side pagination (Efficient Data and API Interaction principle) | `GET /events` (spec `001-event-registration-api`) has no pagination/query params today; this is a UI-only feature that must not change that tested, contract-defined endpoint. | Adding server-side pagination requires changing `apps/api`'s route/service/repository and its OpenAPI contract — out of scope for "UI for an Admin to Add, Update and Delete Events." Client-side pagination over the full fetched array meets SC-005's 200-event usability target without touching the backend; flagged in `research.md` #5 as a follow-up recommendation for the API if event volume grows well beyond that. |
