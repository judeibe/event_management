# Implementation Plan: Events Landing Page

**Branch**: `005-events-landing-page` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-events-landing-page/spec.md`

## Summary

Today `apps/web`'s base address (`/`) renders the unmodified `create-next-app` scaffold instead of any product content. The fix is to make the base address show the events list — the same content, layout, and sidebar navigation state a visitor gets today at `/events` — with zero extra clicks, and without breaking the existing `/events` address. Technical approach: replace the scaffold `page.tsx` at the app root with a server-side redirect to the existing `/events` route, which already has full data-fetching, empty/error-state handling, and sidebar-active-state logic. This reuses `/events` as-is (no duplication, no new components) and satisfies every functional requirement and edge case in the spec without introducing new surface area.

## Technical Context

**Language/Version**: TypeScript, Next.js 16.3.0 (App Router), React 19.2.8

**Primary Dependencies**: `next/navigation` (`redirect`), existing `apps/web/src/app/(dashboard)/events/page.tsx` (unchanged), existing `AppSidebar` nav (unchanged)

**Storage**: N/A — no data model or persistence change; the events list continues to come from the existing `@event-management/api` `/events` endpoint via `apiClient`

**Testing**: `apps/web` has no automated test runner configured (per repo convention — see root `CLAUDE.md`); validation is via the `quickstart.md` manual/browser-automation checks in this plan, run against a locally running `pnpm dev`

**Target Platform**: Web browser, served by the Next.js app on `:3001` (per `pnpm dev`)

**Project Type**: Web application (monorepo: `apps/api` backend unaffected, `apps/web` frontend — single-route change)

**Performance Goals**: No new network calls introduced; a redirect response adds a single extra round-trip before the existing `/events` page load (already the app's normal navigation path), so no measurable regression versus visiting `/events` directly today

**Constraints**: Must not change `apps/api` or any API contract; must not change the `/events` page's existing behavior (data fetching, empty/error states, sidebar highlighting) since it is being reused as-is; no authentication exists and none is introduced

**Scale/Scope**: One file changed (`apps/web/src/app/page.tsx`); no new routes, components, or data entities

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality First** — PASS. The change is a single, minimal, self-explanatory redirect; no duplicated logic is introduced (the existing `/events` page is reused, not copied).
- **II. Functional Correctness** — PASS. Every acceptance scenario in `spec.md` is traceable to a concrete step in `quickstart.md`, including a browser-automation check (SC-004).
- **III. User Experience by Contract** — PASS (N/A for API surface — this feature does not touch `apps/api` or any request/response contract). Frontend navigation stays consistent: sidebar active-state, empty/error states, and layout are all inherited unchanged from the existing `/events` page.
- **IV. Efficient Data and API Interaction** — PASS. No new API calls are added; the events list is still fetched exactly once, by the existing `/events` page.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-events-landing-page/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory is generated for this feature: it changes frontend routing only and introduces no new API endpoint, request/response shape, or other external interface. The existing `/events` API contract (`apps/api`) is unchanged.

### Source Code (repository root)

```text
apps/web/src/app/
├── page.tsx                        # MODIFIED — scaffold content replaced with redirect("/events")
├── layout.tsx                      # Unchanged — root html/body shell
└── (dashboard)/
    ├── layout.tsx                  # Unchanged — sidebar shell
    └── events/
        └── page.tsx                # Unchanged — existing events list page, reused as the redirect target
```

**Structure Decision**: No new directories or route groups. The only change is to `apps/web/src/app/page.tsx` (the existing root page file), which currently renders the `create-next-app` scaffold and will instead perform a server-side redirect to the existing `apps/web/src/app/(dashboard)/events/page.tsx` route. This fits the monorepo's existing `apps/api` (backend, untouched) / `apps/web` (frontend) split with no structural changes.

## Complexity Tracking

*No violations — table not needed.*
