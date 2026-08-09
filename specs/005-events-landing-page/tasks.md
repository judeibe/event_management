---

description: "Task list for Events Landing Page"
---

# Tasks: Events Landing Page

**Input**: Design documents from `/specs/005-events-landing-page/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Not requested in the feature spec — no automated test framework is configured for `apps/web` (see root `CLAUDE.md`); validation is done via the `quickstart.md` scenarios instead, tracked as tasks in the Polish phase below.

**Organization**: This feature has a single user story (P1). There are no Setup or Foundational tasks: the app, dependencies, and routing infrastructure already exist, and this feature is a single-file change with no new infrastructure, shared models, or blocking prerequisites for other work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

---

## Phase 1: User Story 1 - Events list as the first thing visitors see (Priority: P1) 🎯 MVP

**Goal**: Visitors who open the site's base address (`/`) see the events list immediately, with the same layout, sidebar active-state, and empty/error handling as `/events` today — with `/events` itself untouched and still working.

**Independent Test**: Start `pnpm dev`, open `http://localhost:3001/` in a browser with no prior navigation, and confirm the events list renders (not the `create-next-app` placeholder) with the "Events" sidebar item active; then open `http://localhost:3001/events` directly and confirm it still works.

### Implementation for User Story 1

- [X] T001 [US1] In `apps/web/src/app/page.tsx`, remove the `create-next-app` scaffold markup and its `next/image` usage, and replace the component body with a server-side `redirect("/events")` (imported from `next/navigation`), per the approach documented in `plan.md` / `research.md` Decision 1. Do not modify `apps/web/src/app/(dashboard)/events/page.tsx`, `apps/web/src/app/(dashboard)/layout.tsx`, or `apps/web/src/components/app-sidebar.tsx` — this task relies on their existing, unchanged behavior (data fetching, empty/error states, and `pathname === "/events"` sidebar active-state check) to satisfy FR-001 through FR-006.

**Checkpoint**: User Story 1 is fully functional and independently testable — the base address shows the events list, and `/events` is unaffected.

---

## Phase 2: Polish & Cross-Cutting Concerns

**Purpose**: Validate the feature end-to-end and clean up assets the scaffold left behind.

- [X] T002 [P] Remove the now-unused scaffold assets `apps/web/public/next.svg` and `apps/web/public/vercel.svg` (only referenced from the removed scaffold markup in T001; confirm with a repo-wide search before deleting).
- [X] T003 Run `quickstart.md` Scenarios 1–4 (base address load, `/events` still works, refresh behavior, empty/error states) against a local `pnpm dev` run, per `specs/005-events-landing-page/quickstart.md`.
- [X] T004 Run `quickstart.md` Scenario 5 — the Chrome browser automation check — navigating to `http://localhost:3001/`, confirming it resolves to the events list at `/events` with no console errors, and confirming `http://localhost:3001/events` still renders correctly directly. This validates SC-004.

---

## Dependencies & Execution Order

### Phase Dependencies

- **User Story 1 (Phase 1)**: No dependencies — can start immediately.
- **Polish (Phase 2)**: Depends on Phase 1 (T001) being complete — T002 is cleanup of assets T001 stops using; T003/T004 validate T001's behavior.

### Within Phase 2

- T002 is independent of T003/T004 (different concern: dead-asset cleanup vs. behavioral validation) and can run in parallel with them.
- T003 should run before T004 (T004's browser-automation pass covers the same ground as T003 plus the console-error check — running T003 first surfaces obvious issues faster and manually).

### Parallel Opportunities

- T002 can be done in parallel with T003/T004 (marked `[P]`).
- T001 is a single-file change with no internal parallelism.

---

## Implementation Strategy

### MVP First (and only) Scope

1. Complete T001 — this alone delivers the full feature (User Story 1 is the entire spec's scope).
2. Complete T003 and T004 to validate against `spec.md`'s acceptance scenarios and SC-004 before considering the feature done.
3. Complete T002 as low-risk cleanup (can be done anytime after T001, including in the same commit).

---

## Notes

- This feature has only one user story, so there is no incremental multi-story rollout — T001 is the whole implementation.
- [P] tasks = different files, no dependencies.
- Verify `quickstart.md` scenarios pass before considering the feature complete (T003, T004).
- Commit after T001 (and optionally T002) as a logical group.
