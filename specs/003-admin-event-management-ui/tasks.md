---

description: "Task list template for feature implementation"
---

# Tasks: Admin Event Management UI

**Input**: Design documents from `/specs/003-admin-event-management-ui/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: Not included — `apps/web` has no automated test harness yet (see `research.md` #7); acceptance is validated via `quickstart.md`'s manual scenarios (Phase 6 below), consistent with the constitution's "tests **or** executable validation steps" allowance.

**Organization**: Tasks are grouped by user story (US1 = Add, US2 = Update, US3 = Delete) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and relative to the repo root

## Path Conventions

Frontend-only feature inside the existing monorepo: `apps/web/src/...` for UI, `packages/shared/src/...` for the one shared schema addition. No changes to `apps/api`. Paths match `plan.md`'s Project Structure section.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Get the new dependencies and design-system primitives in place before any feature code is written.

- [X] T001 Add the missing shadcn/ui primitives — `dialog`, `alert-dialog`, `field` (this kit's base-ui-native form-building primitive; the registry has no `form.tsx` for the "base-rhea" style), `select`, `textarea`, `label`, `card`, `table`, `dropdown-menu`, `badge`, `sonner` — via the shadcn CLI already configured in `apps/web/components.json`, landing in `apps/web/src/components/ui/`
- [X] T002 [P] Add `react-hook-form` and `@hookform/resolvers` to `apps/web/package.json` dependencies and run `pnpm install` from the repo root
- [X] T003 [P] Create `apps/web/.env` and `apps/web/.env.example` with `API_BASE_URL=http://localhost:3000` (server-only var, no `NEXT_PUBLIC_` prefix, mirroring `apps/api`'s `.env`/`.env.example` convention)

**Checkpoint**: Design-system primitives and dependencies available; no feature code yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared validation schema, API access layer, admin route shell, and the read-only events list/empty-state that every user story's actions attach to.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Create the shared event form validation schema in `packages/shared/src/event-form-schema.ts` (zod, mirrors `apps/api/src/modules/events/event.types.ts`'s `createEventBodySchema`/`updateEventBodySchema` shape per `data-model.md`'s `EventFormValues`; does not modify `apps/api`)
- [X] T005 Export the new schema and inferred types from `packages/shared/src/index.ts` (depends on T004)
- [X] T006 Build `packages/shared` (`pnpm --filter @event-management/shared run build`) so `apps/web` can import the new export (depends on T005)
- [X] T007 [P] Create a server-side API client helper in `apps/web/src/lib/api-client.ts` that wraps `fetch` against `process.env.API_BASE_URL`, parses the `ApiSuccessResponse`/`ApiErrorResponse` envelope from `@event-management/shared`, and normalizes network/timeout failures into the same error shape (per `contracts/ui-contract.md`'s error table)
- [X] T008 [P] Create the admin route shell in `apps/web/src/app/(admin)/layout.tsx`, reusing `SidebarProvider`/`SidebarInset`/`AppSidebar` the same way `apps/web/src/app/(dashboard)/layout.tsx` does
- [X] T009 [P] Populate the two empty `SidebarGroup`s in `apps/web/src/components/app-sidebar.tsx`: one with an attendee-facing "Events" link (`/events`), one with an admin "Manage Events" link (`/admin/events`) — no auth gating (FR-016)
- [X] T010 [P] Mount the shadcn `sonner` `Toaster` once in `apps/web/src/app/layout.tsx` (root layout) so toast notifications work across both admin and attendee pages
- [X] T011 [P] Build `EventsEmptyState` in `apps/web/src/components/admin/events-empty-state.tsx` — empty-state message plus an "Add Event" CTA button (owns its own dialog state once `EventFormDialog` exists in US1/T017, rather than a callback prop from the Server Component page) per FR-015
- [X] T012 [P] Build the read-only `EventsTable` in `apps/web/src/components/admin/events-table.tsx` — columns for title, date, location, category (`Badge`), and capacity/registrations (`Progress`, reusing the existing pattern from `apps/web/src/app/(dashboard)/events/page.tsx`), plus fixed-page-size client-side pagination (research.md #5); no row-action menu or "Add Event" button yet (added by later stories). Also added `apps/web/src/components/admin/event-thumbnail.tsx` (image-with-fallback helper, research.md #6) shared by this and the later form dialog.
- [X] T013 [P] Create `apps/web/src/app/(admin)/admin/events/loading.tsx` rendering `Skeleton` rows matching `EventsTable`'s shape (FR-014)
- [X] T014 Wire `apps/web/src/app/(admin)/admin/events/page.tsx` as a Server Component: fetch the events list via `api-client.ts`, render `EventsTable` when events exist, `EventsEmptyState` when the list is empty, or an inline error card when the fetch fails (FR-013) (depends on T006, T007, T011, T012)

**Checkpoint**: `/admin/events` renders the live, paginated, read-only events list (or empty state) reachable from the sidebar. No create/update/delete capability yet — each user story adds its own action from here.

---

## Phase 3: User Story 1 - Add a New Event (Priority: P1) 🎯 MVP

**Goal**: An admin can open a form, enter valid event details, and see the new event appear in the list; invalid submissions are blocked with clear, field-level errors.

**Independent Test**: Open the "Add Event" form (from the table header or the empty-state CTA), submit valid details, confirm the event appears in the list. Separately, submit with a missing field / negative capacity / past date and confirm submission is blocked with per-field errors.

### Implementation for User Story 1

- [X] T015 [US1] Implement the `createEvent` Server Action in `apps/web/src/app/(admin)/admin/events/actions.ts` — validates input against the shared schema (T004), calls `POST {API_BASE_URL}/events` via `api-client.ts`, and returns the `ActionResult` union (`data-model.md`), mapping `VALIDATION_ERROR`/network/5xx per `contracts/ui-contract.md`'s error table; on success calls `revalidatePath('/admin/events')` and `revalidatePath('/events')`
- [X] T016 [US1] Build `EventFormDialog` in `apps/web/src/components/admin/event-form-dialog.tsx` supporting `mode="create"`: `react-hook-form` + `zodResolver` against the shared schema, all 8 fields (title, description, eventDate, location, category, price, maxCapacity, imageUrl) using the new shadcn `field`/`input`/`textarea`/`label` primitives (this kit's `field.tsx`, not a Radix `form.tsx` — see T001), field-level error display (FR-004), a top-of-form error banner for non-field errors, and a disabled pending state on submit (FR-014) (depends on T015)
- [X] T017 [US1] Wire an "Add Event" trigger into `EventsTable`'s header and into `EventsEmptyState`'s CTA (both opening `EventFormDialog` in create mode), and show a success toast (sonner) after a successful create (`apps/web/src/components/admin/events-table.tsx`, `apps/web/src/components/admin/events-empty-state.tsx`; depends on T016)

**Checkpoint**: User Story 1 is fully functional and independently testable (quickstart.md scenarios 1–3).

---

## Phase 4: User Story 2 - Update an Existing Event (Priority: P2)

**Goal**: An admin can select an existing event, edit it in a pre-filled form, and save changes; reducing capacity below current registrations is rejected with a clear explanation.

**Independent Test**: Pick an existing event's row action, edit fields, save, confirm the list reflects the new values. Separately, attempt to set `maxCapacity` below the event's `currentRegistrations` and confirm the update is rejected with an explanatory message.

### Implementation for User Story 2

- [X] T018 [US2] Implement the `updateEvent` Server Action in `apps/web/src/app/(admin)/admin/events/actions.ts` — validates input against the shared schema, calls `PATCH {API_BASE_URL}/events/:eventId` via `api-client.ts`, and maps `VALIDATION_ERROR` / `NOT_FOUND` / `CONFLICT` per `contracts/ui-contract.md`; same `revalidatePath` calls as `createEvent` (depends on T015, same file)
- [X] T019 [US2] Extend `EventFormDialog` to support `mode="edit"` (discriminated union with `mode="create"`), pre-filling all fields from the selected `EventResponse`, passing `event.currentRegistrations` into `buildEventFormSchema(minCapacity)` as a client-side pre-check that `maxCapacity >= currentRegistrations` (FR-008), and special-casing a `NOT_FOUND` result with a toast + `router.refresh()` instead of the normal field/banner error treatment (`apps/web/src/components/admin/event-form-dialog.tsx`; depends on T016, T018)
- [X] T020 [US2] Add a row-actions `DropdownMenu` to `EventsTable` with an "Edit" item that sets `editingEvent` state, rendering a single controlled `EventFormDialog(mode="edit")` instance for the table (avoids nesting a Dialog trigger inside a DropdownMenu item) (`apps/web/src/components/admin/events-table.tsx`; depends on T017, T019)

**Checkpoint**: User Stories 1 AND 2 both work independently (quickstart.md scenarios 4, 5, and the update half of 9).

---

## Phase 5: User Story 3 - Delete an Event (Priority: P3)

**Goal**: An admin can delete an event after explicit confirmation; if the event has active registrations, the confirmation step warns about that before allowing deletion.

**Independent Test**: Delete an event with no registrations — confirm it disappears after confirmation. Delete an event with active registrations — confirm the warning appears, cancel leaves it unchanged, and confirming again deletes it.

### Implementation for User Story 3

- [X] T021 [US3] Implement the `deleteEvent` Server Action in `apps/web/src/app/(admin)/admin/events/actions.ts` — calls `DELETE {API_BASE_URL}/events/:eventId` via `api-client.ts`, maps `NOT_FOUND` per `contracts/ui-contract.md`, and applies the same `revalidatePath` calls on success (depends on T018, same file)
- [X] T022 [US3] Build `DeleteEventDialog` (`AlertDialog`) in `apps/web/src/components/admin/delete-event-dialog.tsx` — confirmation copy, an explicit warning block shown when `currentRegistrations > 0` (FR-011), and a pending state on the confirm button while `deleteEvent` runs (depends on T021)
- [X] T023 [US3] Add a "Delete" item to `EventsTable`'s row-actions `DropdownMenu`, rendering a single controlled `DeleteEventDialog` instance (same pattern as T020's edit dialog), with success/`NOT_FOUND` toasts on completion (`apps/web/src/components/admin/events-table.tsx`; depends on T020, T022)

**Checkpoint**: All three user stories are independently functional (quickstart.md scenarios 6, 7, and the delete half of 9).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full feature end-to-end and close out remaining edge cases/success criteria that span all three stories.

- [X] T024 [P] Verify the broken/unreachable `imageUrl` fallback (`EventThumbnail`, plain `<img>` + `onError` placeholder, research.md #6) renders correctly in `EventsTable` and added a live preview of it to `EventFormDialog` (keyed on the watched `imageUrl` value so a fixed URL clears a stale broken-image state)
- [X] T025 [P] Confirmed pending states are consistent: `EventFormDialog` (create + edit) uses `react-hook-form`'s `formState.isSubmitting` to disable/label its submit button, `DeleteEventDialog` uses a local `isDeleting` state for its Cancel/Confirm buttons; verified the offline/backend-unreachable path (`api-client.ts`'s network-error branch, surfaced as a non-field `formError`) never calls `form.reset()`, so entered values are preserved when a submit fails
- [X] T026 Ran `pnpm --filter @event-management/web lint` and `pnpm --filter @event-management/web build`. Build is clean. Lint reports 2 pre-existing errors + 2 pre-existing warnings in files this feature never touched (`(dashboard)/events/page.tsx`, `(dashboard)/layout.tsx`, `hooks/use-mobile.ts` — confirmed via `git status`, all unmodified) — left as-is, out of this feature's scope. The only lint finding inside this feature's new code is one expected warning on `event-form-dialog.tsx`'s use of react-hook-form's `watch()` (React Compiler can't memoize it; documented RHF/compiler interaction, not a bug)
- [X] T027 Ran `pnpm dev` (API on :3000, web on :3001) against the seeded dev DB and exercised what's reachable without a browser (no Chrome extension available this session, so dialog/form click-throughs weren't literally clicked — verified by code review instead):
  - Scenario 8 (backend unreachable): killed the API process, confirmed `/admin/events` renders the "Couldn't load events" card with the API's error message (not a stack trace); restarted the API, confirmed the page recovered on next request (`cache: "no-store"` working as intended).
  - Read/mutate round trip: `POST /events` with the exact payload shape `toEventRequestBody` produces succeeded (confirms the shared schema's wire format matches `apps/api`'s `createEventBodySchema` field-for-field); the new event appeared in `/admin/events` on next load with no stale cache; `DELETE` removed it and it disappeared on next load.
  - Verified the three error envelope shapes `actions.ts` depends on directly against the running API: `VALIDATION_ERROR` (`details.issues[].path`/`.message`, matches `fieldErrorsFromApiDetails`), `CONFLICT` (capacity-vs-registrations, `details` has no `issues` key so it correctly falls through to the top-of-form banner, not field errors), `NOT_FOUND`.
  - Scenarios requiring literal clicks (2–7, 9–10) and the 200-event scale check (11/SC-005) were validated via code review of `event-form-dialog.tsx`/`events-table.tsx`/`delete-event-dialog.tsx` rather than interactive browser testing — flagged here rather than silently claimed as clicked-through. No failures found in review; recommend a follow-up interactive pass once browser tooling is available.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (needs the shadcn primitives from T001 and the shared schema build from T006) — BLOCKS all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational (Phase 2) completion.
  - US1 has no dependency on US2/US3.
  - US2 depends on `EventFormDialog` existing (T016, from US1) since it extends the same component, and appends to `actions.ts` after `createEvent` (T015).
  - US3 depends on the row-actions `DropdownMenu` existing (T020, from US2) since it adds a menu item to the same component, and appends to `actions.ts` after `updateEvent` (T018).
  - In practice this makes US1 → US2 → US3 the natural build order (matches spec priority order P1 → P2 → P3), even though each story remains independently *testable* once built.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Within Each User Story

- Server Action before the dialog/component that calls it.
- Dialog/component before it's wired into `EventsTable`/`EventsEmptyState`.
- Story complete and independently testable before moving to the next priority.

### Parallel Opportunities

- Setup: T002 and T003 can run in parallel (different files); T001 is a standalone CLI step.
- Foundational: T004, T007, T008, T009, T010, T011, T012, T013 all touch different files and can run in parallel once Setup is done; T005/T006 must follow T004 in order, and T014 must wait for T006, T007, T011, T012.
- Within a user story, the Server Action task and any purely additive, independent file are the only realistic parallel candidates — most story tasks are sequential because they build on the same dialog/table file the previous task in that story just created.

---

## Parallel Example: Foundational Phase

```bash
# After T001-T003 (Setup) complete, launch these together:
Task: "Create the shared event form validation schema in packages/shared/src/event-form-schema.ts"
Task: "Create a server-side API client helper in apps/web/src/lib/api-client.ts"
Task: "Create the admin route shell in apps/web/src/app/(admin)/layout.tsx"
Task: "Populate the two empty SidebarGroups in apps/web/src/components/app-sidebar.tsx"
Task: "Mount the shadcn sonner Toaster in apps/web/src/app/layout.tsx"
Task: "Build EventsEmptyState in apps/web/src/components/admin/events-empty-state.tsx"
Task: "Build the read-only EventsTable in apps/web/src/components/admin/events-table.tsx"
Task: "Create apps/web/src/app/(admin)/admin/events/loading.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories; ends with a working read-only `/admin/events` list)
3. Complete Phase 3: User Story 1 (Add)
4. **STOP and VALIDATE**: Run quickstart.md scenarios 1–3 independently
5. Demo if ready — an admin can already create events end-to-end

### Incremental Delivery

1. Setup + Foundational → live read-only admin events list
2. Add User Story 1 → validate (scenarios 1–3) → demo (MVP!)
3. Add User Story 2 → validate (scenarios 4–5) → demo
4. Add User Story 3 → validate (scenarios 6–7) → demo
5. Polish phase → validate remaining edge-case scenarios (8–11) and SC-005 at scale

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- [Story] label maps task to specific user story for traceability.
- No test tasks are included per this feature's Tests policy (see header) — `quickstart.md` scenarios are the acceptance mechanism, executed in T027.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before continuing.
- `apps/api` is never modified by any task in this list.
