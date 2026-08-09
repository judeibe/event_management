---

description: "Task list template for feature implementation"
---

# Tasks: Event Registration Portal

**Input**: Design documents from `/specs/004-event-registration-portal/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: Not included — `apps/web` has no automated test harness yet (see `research.md` #9); acceptance is validated via `quickstart.md`'s manual scenarios (Phase 6 below), consistent with the constitution's "tests **or** executable validation steps" allowance.

**Organization**: Tasks are grouped by user story (US1 = Browse, US2 = Register, US3 = Cancel) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and relative to the repo root

## Path Conventions

Frontend-only feature inside the existing monorepo: `apps/web/src/...` for UI, `packages/shared/src/...` for the one shared schema addition. No changes to `apps/api`. Paths match `plan.md`'s Project Structure section.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the one new environment variable this feature needs. No new dependencies or design-system primitives are required — everything else (`react-hook-form`, `zod`, `sonner`, `lucide-react`, all needed shadcn primitives) is already present per `research.md`.

- [X] T001 [P] Add `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000` to `apps/web/.env` and `apps/web/.env.example`, alongside the existing `API_BASE_URL` (plan.md Project Structure, research.md #2 — required because `/my-registrations` fetches from a Client Component, where the server-only `API_BASE_URL` isn't readable)

**Checkpoint**: Environment ready; no feature code yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared registration validation schema and the one component both browsing and registration need (`EventThumbnail`), used across every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Create the shared registration form validation schema in `packages/shared/src/registration-form-schema.ts` (zod: `registrationFormValuesSchema` with `name`/`email`, `toRegistrationRequestBody` mapping `email` → `attendeeRef`, per `data-model.md`'s `RegistrationFormValues`; does not modify `apps/api`)
- [X] T003 Export the new schema and inferred types from `packages/shared/src/index.ts` (depends on T002)
- [X] T004 Build `packages/shared` (`pnpm --filter @event-management/shared run build`) so `apps/web` can import the new export (depends on T003)
- [X] T005 [P] Promote `apps/web/src/components/admin/event-thumbnail.tsx` to `apps/web/src/components/shared/event-thumbnail.tsx` and update its one import site in `apps/web/src/components/admin/event-form-dialog.tsx` (plan.md Project Structure — both admin and dashboard surfaces need this component now) — also updated `events-table.tsx`'s import (not anticipated in the task description, but the same file referenced the old path)

**Checkpoint**: Shared schema and thumbnail component available; no dashboard route code yet.

---

## Phase 3: User Story 1 - Browse Available Events (Priority: P1) 🎯 MVP

**Goal**: A visitor can view a card grid of events with search/category filtering, see clear Open/Full/Past availability states, and open an event to see its full detail (including description). No registration capability yet — that's US2.

**Independent Test**: Load `/events` with a mix of open, full, and past events; confirm each card shows title/date/location/category/price/availability and that full/past events are visually distinguished. Select an event and confirm the detail page shows the full description in addition to the summary fields.

### Implementation for User Story 1

- [X] T006 [P] [US1] Build `EventAvailabilityBadge` in `apps/web/src/components/dashboard/event-availability-badge.tsx` — exports both the component (Open → `Progress` showing "X/Y spots"; Full → `Badge variant="destructive"`; Past → `Badge variant="outline"`) and a pure `getEventAvailability(event: EventResponse)` helper (`{ remainingCapacity, isFull, isPast }`, research.md #8) that US2 will reuse for registration gating
- [X] T007 [P] [US1] Build `EventCard` in `apps/web/src/components/dashboard/event-card.tsx` — `EventThumbnail` (16:9, `object-cover`), title, muted date/location line, category `Badge`, formatted price, `EventAvailabilityBadge`, wrapped in a `Link` to `/events/[eventId]`, `opacity-60` styling applied when past (depends on T005, T006)
- [X] T008 [P] [US1] Build `EventsEmptyState` in `apps/web/src/components/dashboard/events-empty-state.tsx` — visitor-facing "No events are available right now" copy, no CTA (unlike the admin version)
- [X] T009 [US1] Build `EventGrid` client component in `apps/web/src/components/dashboard/event-grid.tsx` — responsive `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`, owns search-by-title input + category `Select` filter state over the full event array (research.md #5), renders `EventCard`s or `EventsEmptyState` (depends on T007, T008)
- [X] T010 [P] [US1] Create `apps/web/src/app/(dashboard)/events/loading.tsx` — grid of `Skeleton` cards matching `EventCard`'s shape (FR-014)
- [X] T011 [US1] Replace `apps/web/src/app/(dashboard)/events/page.tsx` (removing the raw-fetch prototype): Server Component using `apiClient.get<EventResponse[]>("/events")`, renders `EventGrid` on success or an inline error card with retry guidance on failure (FR-014) (depends on T009)
- [X] T012 [P] [US1] Create `apps/web/src/app/(dashboard)/events/[eventId]/loading.tsx` — `Skeleton` detail layout
- [X] T013 [US1] Create `apps/web/src/app/(dashboard)/events/[eventId]/page.tsx`: Server Component using `apiClient.get<EventResponse>("/events/:eventId")`, renders full detail (thumbnail, title, description, date, location, category, price, `EventAvailabilityBadge`); shows a clear "event not found / no longer available" state on `NOT_FOUND` instead of Next's generic 404 (FR-002; registration section is a placeholder here, filled in by US2) (depends on T005, T006)

**Checkpoint**: User Story 1 is fully functional and independently testable (quickstart.md scenarios 1–3).

---

## Phase 4: User Story 2 - Register for an Event (Priority: P2)

**Goal**: A visitor can submit name + email to register for an open event, see an inline confirmation, and see their existing registration status instead of the form when revisiting; full/past events block registration with a clear reason; server-side conflicts (full, past, duplicate) are surfaced verbatim.

**Independent Test**: On an open event's detail page, submit valid name/email and confirm an inline success confirmation appears and remaining availability decreases by one. Revisit the same event and confirm the registration form is replaced by an "already registered" status. Separately, confirm a full or past event shows a disabled/blocked registration state with a clear reason.

### Implementation for User Story 2

- [X] T014 [P] [US2] Create `apps/web/src/lib/my-registrations.ts` — `MyRegistrationRecord` type and the `localStorage`-backed module (`getMyRegistrations`, `getMyRegistrationForEvent`, `addMyRegistration`, `markMyRegistrationCancelled`, `removeMyRegistration`) under key `event-portal:my-registrations:v1`, each function SSR-guarded (`typeof window === 'undefined'`) and wrapped in try/catch per `data-model.md`
- [X] T015 [US2] (built together with T019 — same file, same edit — since both actions need to exist for `actions.ts` to compile against its own exports cleanly) Implement the `registerForEvent` Server Action in `apps/web/src/app/(dashboard)/events/[eventId]/actions.ts` — validates input against the shared schema (T002/T004), calls `POST {API_BASE_URL}/events/:eventId/registrations` with `{ attendeeRef: values.email }` via `api-client.ts`, returns the `RegisterResult` union (`data-model.md`), mapping `VALIDATION_ERROR`/`NOT_FOUND`/`CONFLICT`/network per `contracts/ui-contract.md`'s error table verbatim (research.md #7); on success calls `revalidatePath('/events')` and `revalidatePath('/events/${eventId}')`
- [X] T016 [US2] Build `RegisterForm` client component in `apps/web/src/components/dashboard/register-form.tsx` — `react-hook-form` + `zodResolver(registrationFormValuesSchema)`, Name/Email fields via the existing `Field`/`Input`/`Label` primitives, calls `registerForEvent`, on success calls `addMyRegistration` (T014) and renders an inline success panel + `sonner` toast, disables submit while pending (FR-005, FR-006, FR-014) (depends on T014, T015)
- [X] T017 [P] [US2] Build `AlreadyRegisteredCard` in `apps/web/src/components/dashboard/already-registered-card.tsx` — shows the local record's status, `attendeeName`, and `attendeeRef` (depends on T014). Deviation from plan: built with its cancel action (T020/T021) already wired in rather than deferred to US3 — a `RegistrationPanel` render tree with a dangling "no cancel yet" state would need `CancelRegistrationDialog` to exist as a no-op placeholder anyway, so it was simpler and no less correct to build the real one now; functionally equivalent to doing it in two passes
- [X] T018 [US2] Wire `apps/web/src/app/(dashboard)/events/[eventId]/page.tsx` to render exactly one of `RegisterForm` (open, no local record for this event), `AlreadyRegisteredCard` (an `ACTIVE` local record exists), or a disabled "registration closed" notice (full or past, using `getEventAvailability` from T006) — computed via `getMyRegistrationForEvent(eventId)` (T014) (FR-004, FR-007) (depends on T013, T014, T016, T017). Implementation note not anticipated in the plan: the page itself is a Server Component and can't read `localStorage`, so the branching lives in a new client component, `apps/web/src/app/(dashboard)/events/[eventId]/registration-panel.tsx` (mounts, reads `getMyRegistrationForEvent`, then renders one of the three states — a brief `Skeleton` shows pre-mount to avoid an SSR/CSR mismatch), which the page renders instead of branching inline

**Checkpoint**: User Stories 1 AND 2 both work independently (quickstart.md scenarios 4–9).

---

## Phase 5: User Story 3 - Cancel a Registration (Priority: P3)

**Goal**: A visitor can open "My Registrations" (device-local list) and cancel an active registration; sees a clear empty state when none exist; can still cancel a past event's registration; a registration already cancelled elsewhere is handled gracefully rather than as a generic error.

**Independent Test**: Register for an event, open `/my-registrations`, confirm it's listed with a cancel option; cancel it and confirm it's marked cancelled and the event's displayed availability increases by one. Separately, confirm `/my-registrations` shows a clear empty state with no prior registrations on the device.

### Implementation for User Story 3

- [X] T019 [US3] Implement the `cancelRegistration` Server Action in `apps/web/src/app/(dashboard)/events/[eventId]/actions.ts` — calls `DELETE {API_BASE_URL}/events/:eventId/registrations/:attendeeRef` via `api-client.ts`, returns the `CancelResult` union, mapping the two distinct `NOT_FOUND` cases (deleted event vs. already-cancelled registration) per `contracts/ui-contract.md`; same `revalidatePath` calls as `registerForEvent` (depends on T015, same file) — built alongside T015 (see note above)
- [X] T020 [US3] Build `CancelRegistrationDialog` (`AlertDialog`) in `apps/web/src/components/dashboard/cancel-registration-dialog.tsx` — confirmation copy, calls `cancelRegistration`, on success **or** on an already-cancelled `404` calls `markMyRegistrationCancelled` (T014) to sync local state (research.md #7), `sonner` toast, pending state on confirm (depends on T014, T019) — built alongside T017 (see note above); also added a self-contained "Registration cancelled" success state to `AlreadyRegisteredCard` (mirrors `RegisterForm`'s own self-contained "confirmed" state) rather than requiring the page to re-branch between `RegisterForm`/`AlreadyRegisteredCard` client-side after a cancel
- [X] T021 [US3] Wire `CancelRegistrationDialog` into `AlreadyRegisteredCard` (`apps/web/src/components/dashboard/already-registered-card.tsx`) so the detail page's cancel action works end-to-end; not gated on `eventDate` (edge case: cancelling a past event's registration is allowed) (depends on T017, T020) — built alongside T017 (see note above)
- [X] T022 [P] [US3] Build `MyRegistrationListItem` in `apps/web/src/components/dashboard/my-registration-list-item.tsx` — renders one record's `eventSnapshot` (or live-refreshed data when available), status badge, and reuses `CancelRegistrationDialog` (T020)
- [X] T023 [US3] Build `MyRegistrationsList` client component in `apps/web/src/components/dashboard/my-registrations-list.tsx` — reads `getMyRegistrations()` (T014) on mount, refreshes each entry via a client-side `GET {NEXT_PUBLIC_API_BASE_URL}/events/:eventId` (T001), treats a `404` as "no longer available" and offers `removeMyRegistration`, renders `MyRegistrationListItem`s (T022) or a clear empty state (FR-009, FR-010) (depends on T014, T022)
- [X] T024 [US3] Create `apps/web/src/app/(dashboard)/my-registrations/page.tsx` — thin Server Component shell (`SiteHeader title="My Registrations"`) wrapping `MyRegistrationsList` (depends on T023)
- [X] T025 [P] [US3] Add a `"My Registrations"` entry (`url: "/my-registrations"`, a `Ticket` icon from `lucide-react`) to `attendeeNavItems` in `apps/web/src/components/app-sidebar.tsx`

**Checkpoint**: All three user stories are independently functional (quickstart.md scenarios 10–13).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full feature end-to-end and close out remaining edge cases/success criteria that span all three stories.

- [X] T026 [P] Verify the deleted-event edge cases end-to-end: registering for an event deleted mid-view (quickstart scenario 14) on the detail page (T013/T018), and `/my-registrations`' stale-entry handling (T023) when a stored event has been deleted. Verified live against the running dev servers: created a temp event via `POST /events`, confirmed its detail page rendered normally (`Register for this event` form present), deleted it via `DELETE /events/:id`, confirmed the detail page then rendered "Event not found" / "was not found" (the API's own message) instead of a broken form; also confirmed the deleted event correctly disappeared from `/events`' list (`cache: "no-store"` working). `/my-registrations`' per-entry 404→stale-entry path (`MyRegistrationsList`'s `fetchEvent` returning `null`) was verified by code review only — exercising it live requires a browser to actually populate `localStorage` first
- [X] T027 [P] Verify backend-unreachable loading/error states across `/events`, `/events/[eventId]`, and `/my-registrations` (quickstart scenario 15) — clear loading state, then a clear, retry-capable error, never a blank/broken page. Verified live: killed the API dev process, confirmed `/events` renders "Couldn't load events" / "Couldn't reach the server..." (not a blank page) and `/events/[id]` renders the same message; caught a real bug this way — the detail page's error card always said "Event not found" regardless of cause, which was misleading for a network failure, fixed to branch on `result.error.code` ("Event not found" only for `NOT_FOUND`, "Couldn't load this event" otherwise). Restarted the API and re-verified both the fixed not-found path and the full/past-event states were unaffected, then rebuilt clean
- [X] T028 Run `pnpm --filter @event-management/web lint` and `pnpm --filter @event-management/web build`; fix any new issues introduced by this feature (pre-existing, unrelated findings may be left as-is per `003`'s precedent). Build is clean. Lint initially flagged 2 new errors from this feature (`react-hooks/set-state-in-effect` in `registration-panel.tsx` and `my-registrations-list.tsx`, from a `useEffect`+`setState` "sync from localStorage" pattern) — fixed by refactoring `lib/my-registrations.ts` into a proper external store (cached-by-raw-string snapshots + subscribe/notify) and switching consumers to `useSyncExternalStore`, which is also SSR/hydration-safe without a manual "mounted" flag. This simplified `AlreadyRegisteredCard`/`CancelRegistrationDialog`/`MyRegistrationListItem` too (store notifications replaced most of the manual `onCancelled`/`onRemove` callback threading). Remaining lint output is only the 1 pre-existing error (`hooks/use-mobile.ts`, unmodified, unrelated) and 2 pre-existing warnings, all present before this feature (verified via `git stash`)
- [X] T029 Run `pnpm dev` against a seeded dev DB and execute `quickstart.md` scenarios 1–15; record results (what was click-verified vs. code-reviewed if browser tooling is unavailable), including the SC-001/SC-002/SC-004 timing checks and SC-006's "100% of blocked actions show a specific reason" check. No Chrome browser extension was available this session, so click-through scenarios (register/cancel form submission, dialogs, toasts, category filter, localStorage persistence) were verified by code review rather than literally clicked — flagged here rather than silently claimed. Verified live via `curl` against the running dev servers (API on :3000, web on :3001, seeded via `prisma:db:seed` plus one manually-filled event for a full-capacity case):
  - Scenario 1 (empty state): code-reviewed only (`EventsEmptyState` — same pattern as `003`'s reviewed/shipped `admin/events-empty-state.tsx`).
  - Scenario 2 (browse, mixed states): live — `/events` SSR HTML contains all 3 seeded event titles, exactly one "Full" badge (3/3 capacity event), one "Past event" badge (event dated before today), one "spots filled" progress row (the open event).
  - Scenario 3 (full detail description): live — description text renders on `/events/[id]` in addition to the summary fields.
  - Scenario 4 (register happy path): code-reviewed (`RegisterForm` → `registerForEvent` → `addMyRegistration`); the underlying `POST .../registrations` call it makes was live-verified directly (below).
  - Scenario 5 (already registered): code-reviewed (`RegistrationPanel`'s `useSyncExternalStore` branch).
  - Scenario 6 (validation errors): code-reviewed (`registrationFormValuesSchema` + `FieldError`).
  - Scenario 7 (full event blocks registration): live — `/events/[id]` for the 3/3-capacity event renders "Registration closed" / "This event has reached its maximum capacity." with no form.
  - Scenario 8 (past event blocks registration): live — same detail page for the seeded past event renders "Registration closed" / "This event has already happened...".
  - Scenario 9 (duplicate registration, 2nd device): live — `POST` the same `attendeeRef` twice returned `409 CONFLICT "Attendee is already registered for this event."` on the 2nd call.
  - Scenario 10 (my-registrations empty state): live — `/my-registrations` (no browser localStorage via curl) renders "No registrations found on this device".
  - Scenario 11 (view/cancel, availability sync): code-reviewed for the UI; the underlying cancel call was live-verified (below) and confirmed `currentRegistrations` decremented correctly server-side.
  - Scenario 12 (cancel already-cancelled): live — cancelling the same registration twice returned `404 NOT_FOUND "No active registration exists for this attendee and event."` on the 2nd call, which `CancelRegistrationDialog` treats as confirmation and syncs local state to cancelled (code-reviewed).
  - Scenario 13 (cancel a past event's registration): code-reviewed — `CancelRegistrationDialog`/`AlreadyRegisteredCard` never check `eventDate`, only local `status`.
  - Scenario 14 (deleted event): live, see T026.
  - Scenario 15 (backend unreachable): live, see T027.
  - Also live-verified: registering for a past event returns `409 "Cannot register for past events."`; admin `/admin/events` still returns `200` after this feature's changes (regression check for the `EventThumbnail` move).
  - SC-001/SC-002/SC-004 (time budgets) and SC-003/SC-006 (specific-error coverage) were assessed by design/code review against the verified error strings above, not stopwatch-timed live clicks.
  - Dev DB was re-seeded (`prisma:db:seed`) after testing to leave a clean baseline.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (needs the shared schema built in T004 and the promoted `EventThumbnail` from T005).
- **User Stories (Phase 3–5)**: All depend on Foundational (Phase 2) completion.
  - US1 has no dependency on US2/US3.
  - US2 depends on `EventGrid`/detail page existing (T013, from US1) since it extends the same detail page, and reuses `getEventAvailability` from `EventAvailabilityBadge` (T006, from US1).
  - US3 depends on `AlreadyRegisteredCard` existing (T017, from US2) since it wires a cancel action into that same component, and appends to `actions.ts` after `registerForEvent` (T015, from US2).
  - In practice this makes US1 → US2 → US3 the natural build order (matches spec priority order P1 → P2 → P3), even though each story remains independently *testable* once built.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Within Each User Story

- Server Action before the component that calls it.
- Component before it's wired into the page that renders it.
- Story complete and independently testable before moving to the next priority.

### Parallel Opportunities

- Setup: T001 is a standalone step.
- Foundational: T002 and T005 can run in parallel (different files); T003/T004 must follow T002 in order.
- US1: T006, T008 can run in parallel with each other; T007 depends on T005/T006; T010, T012 (loading skeletons) can run in parallel with everything else in the phase; T009 depends on T007/T008; T011 depends on T009; T013 depends on T005/T006.
- US2: T014 and T017 can start in parallel once Foundational is done (T017 only needs the type from T014, not its implementation, but treat as sequential for safety); T015 depends on T014; T016 depends on T014/T015; T018 is the integration point and comes last.
- US3: T022 can run in parallel with T019/T020; the rest of US3 is largely sequential (same-file/dependency chain), same shape as `003`'s CRUD stories.

---

## Parallel Example: Foundational Phase

```bash
# After T001 (Setup) completes, launch these together:
Task: "Create the shared registration form validation schema in packages/shared/src/registration-form-schema.ts"
Task: "Promote apps/web/src/components/admin/event-thumbnail.tsx to apps/web/src/components/shared/event-thumbnail.tsx"
```

## Parallel Example: User Story 1

```bash
# Once Foundational is done, launch these together:
Task: "Build EventAvailabilityBadge in apps/web/src/components/dashboard/event-availability-badge.tsx"
Task: "Build EventsEmptyState in apps/web/src/components/dashboard/events-empty-state.tsx"
Task: "Create apps/web/src/app/(dashboard)/events/loading.tsx"
Task: "Create apps/web/src/app/(dashboard)/events/[eventId]/loading.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Browse)
4. **STOP and VALIDATE**: Run quickstart.md scenarios 1–3 independently
5. Demo if ready — visitors can already discover events end-to-end, even without registration

### Incremental Delivery

1. Setup + Foundational → shared schema and thumbnail ready
2. Add User Story 1 → validate (scenarios 1–3) → demo (MVP!)
3. Add User Story 2 → validate (scenarios 4–9) → demo
4. Add User Story 3 → validate (scenarios 10–13) → demo
5. Polish phase → validate remaining edge-case scenarios (14–15) and the SC timing/accuracy checks

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- [Story] label maps task to specific user story for traceability.
- No test tasks are included per this feature's Tests policy (see header) — `quickstart.md` scenarios are the acceptance mechanism, executed in T029.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before continuing.
- `apps/api` is never modified by any task in this list.
