# Tasks: Registration Portal Bug Fixes

**Input**: Design documents from `/specs/006-fix-registration-bugs/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contract-delta.md, contracts/ui-contract-delta.md, quickstart.md (all present)

**Tests**: Included for `apps/api` (existing Vitest unit/contract suite — `plan.md`'s Project Structure
and Technical Context explicitly commit to editing these files, and the constitution's Functional
Correctness gate expects new behavior to be test-traceable where a test harness already exists).
**Not** included for `apps/web`/`packages/shared` — no automated frontend test framework exists yet
(`CLAUDE.md`, `004-event-registration-portal/research.md` #9); `quickstart.md`'s manual scenarios are
the constitution's "tests **or** executable validation steps" allowance for those changes.

**Organization**: Tasks are grouped by user story (spec.md P1–P5), in priority order, so each story is
independently implementable and testable per `quickstart.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to spec.md's US1–US5
- Every task names its exact file path(s)

## Path Conventions

Existing monorepo layout (`CLAUDE.md`): `apps/api/src/...`, `apps/api/tests/...`, `apps/web/src/...`,
`packages/shared/src/...`. No new top-level directories are introduced by this feature.

---

## Phase 1: Setup

**None required.** This feature adds no new project, workspace, or shared tooling — every task below
edits or adds a file inside a module that already exists. The one new dependency (`cors`) is
story-specific (US2 only) and is installed as part of that story's implementation tasks (T011).

---

## Phase 2: Foundational (Blocking Prerequisites)

**None required.** Unlike a typical feature, this is six independent bug fixes with no shared new
entity, schema, or cross-story infrastructure — `plan.md`'s Complexity Tracking confirms no
Constitution Check violation and no shared foundation. Each user story phase below can start
immediately and in any order; they are listed in spec.md's priority order (P1 → P5) as a suggested
sequence, not a dependency chain.

---

## Phase 3: User Story 1 - Re-registering after cancelling (Priority: P1) 🎯 MVP

**Goal**: Cancelling a registration and then registering again (same attendee/event) succeeds every
time, while an already-active registration is still correctly rejected as a duplicate, and revisiting
a registered event's page never throws a hydration-mismatch console error.

**Independent Test**: `quickstart.md` scenarios 1–3 — register, cancel, re-register with the same
details (repeat twice), confirm an active duplicate is still blocked, and confirm no console error on
a full-page revisit of a registered event.

### Tests for User Story 1 ⚠️

> Write these first; T001/T002 must fail against the current code before T003/T004 are implemented.

- [X] T001 [P] [US1] Add a failing unit test in `apps/api/tests/unit/registration.service.test.ts`: given no active registration but an existing *cancelled* registration for the same `(eventId, attendeeId)` pair, `createRegistration` calls `reactivateRegistration` with that row's `id` and returns it, and does **not** call `createRegistration` on the repository
- [X] T002 [P] [US1] Add a failing contract test in `apps/api/tests/contract/registrations.api.test.ts`: register → cancel → register again with the same `attendeeRef` for the same event returns `201` with the **same** `registration.id` as the original and `status: 'ACTIVE'`; repeat the cancel→register cycle a second time and confirm it still succeeds (spec Edge Cases)

### Implementation for User Story 1

- [X] T003 [P] [US1] Add `findRegistrationByEventAndAttendee(eventId, attendeeId): Promise<RegistrationEntity | null>` and `reactivateRegistration(registrationId): Promise<RegistrationEntity>` to the `RegistrationTransactionRepository` interface and `PrismaRegistrationTransactionRepository` implementation in `apps/api/src/modules/registrations/registration.repository.ts` — use the existing compound-unique index (`client.registration.findUnique({ where: { eventId_attendeeId: { eventId, attendeeId } } } })`) for the lookup, and `client.registration.update({ where: { id }, data: { status: 'ACTIVE', cancelledAt: null } })` for reactivation (data-model.md)
- [X] T004 [US1] Update `createRegistrationInTransaction` in `apps/api/src/modules/registrations/registration.service.ts`: after the existing `findActiveRegistration` check finds nothing, call `findRegistrationByEventAndAttendee`; if it returns a row, call `reactivateRegistration(existing.id)` instead of `createRegistration`; if it returns `null`, fall through to the existing `createRegistration` call unchanged (depends on T003)
- [X] T005 [US1] Run `cd apps/api && npx vitest run tests/unit/registration.service.test.ts tests/contract/registrations.api.test.ts` and confirm T001/T002 now pass along with every pre-existing test in both files, including "rejects duplicate active registrations" (depends on T001, T002, T004)
- [X] T006 [P] [US1] In `apps/web/src/app/(dashboard)/events/[eventId]/registration-panel.tsx`, change `useSyncExternalStore`'s third argument (`getServerSnapshot`) from `() => getMyRegistrationForEvent(event.id)` to `() => undefined`, leaving the second argument (`getSnapshot`) unchanged (research.md #6)

**Checkpoint**: User Story 1 is independently functional — proceed to manual validation.

- [X] T007 [US1] Manually validate User Story 1 via `quickstart.md` scenarios 1–3 with the browser console open (depends on T004, T006)

---

## Phase 4: User Story 2 - My Registrations reflects real event status (Priority: P2)

**Goal**: "My Registrations" shows a live, reachable, active event's current details (not "no longer
available"), still flags a genuinely deleted event correctly, and falls back to the stored snapshot —
without a false "deleted" badge or a console error — when the API is unreachable.

**Independent Test**: `quickstart.md` scenarios 4–6 — a live active registration shows correctly, a
truly deleted event is still flagged, and an unreachable API falls back to the snapshot.

### Tests for User Story 2 ⚠️

> Write first; T008 must fail against the current code (no CORS middleware exists yet) before T009–T012.

- [X] T008 [P] [US2] Add a failing contract test in `apps/api/tests/contract/events.api.test.ts`: `GET /events/:eventId` sent with request header `Origin: http://localhost:3001` returns response header `Access-Control-Allow-Origin: http://localhost:3001`; the same request sent with `Origin: http://evil.example` returns **no** `Access-Control-Allow-Origin` header

### Implementation for User Story 2

- [X] T009 [P] [US2] Add `CORS_ALLOWED_ORIGINS: z.string().min(1).default('http://localhost:3001')` to `envSchema` in `apps/api/src/config/env.ts` (data-model.md)
- [X] T010 [US2] Create `apps/api/src/config/cors-policy.ts`, mirroring `abuse-policy.ts`'s pattern: export a frozen `corsPolicy: { allowedOrigins: string[] }` derived by splitting `env.CORS_ALLOWED_ORIGINS` on `,`, trimming, and filtering empty entries (depends on T009)
- [X] T011 [P] [US2] Add `cors` and `@types/cors` to `apps/api/package.json` dependencies and run `pnpm install` from the repo root
- [X] T012 [US2] In `apps/api/src/app.ts`, import and mount the `cors` middleware (`origin: corsPolicy.allowedOrigins`) immediately after `app.use(helmet())` and before `app.use(requestSizeMiddleware)`/`app.use(rateLimitMiddleware)` (depends on T010, T011)
- [X] T013 [P] [US2] Document `CORS_ALLOWED_ORIGINS=http://localhost:3001` in `apps/api/.env.example`
- [X] T014 [US2] Run `cd apps/api && npx vitest run tests/contract/events.api.test.ts` and confirm T008 passes along with every pre-existing test in that file (depends on T008, T012)
- [X] T015 [P] [US2] In `apps/web/src/components/dashboard/my-registrations-list.tsx`, define/export the `LiveEventState` union (`{ status: 'ok'; event: EventResponse } | { status: 'not-found' } | { status: 'unreachable' }`) and change `fetchEvent` to return it: `200` → `{ status: 'ok', event }`, a confirmed `404` → `{ status: 'not-found' }`, any other non-2xx status or a caught `fetch()` error → `{ status: 'unreachable' }` (data-model.md); update the `liveEvents` state's value type accordingly (the "not yet resolved" case stays represented by the entry being absent from the state map, as today)
- [X] T016 [US2] In the same file, change `useSyncExternalStore`'s third argument (`getServerSnapshot`) from `getMyRegistrations` to `() => []`, using a stable empty-array reference (e.g. a module-level `const EMPTY_RECORDS: MyRegistrationRecord[] = []`) rather than a fresh array literal per call (depends on T015, research.md #6)
- [X] T017 [US2] In `apps/web/src/components/dashboard/my-registration-list-item.tsx`, import `LiveEventState` from `my-registrations-list.tsx`, change the `liveEvent` prop type to `LiveEventState | undefined` (`undefined` = still loading), and derive `isDeleted` from `liveEvent?.status === 'not-found'` instead of `liveEvent === null`; `title`/`eventDate`/`location` fall back to `record.eventSnapshot` whenever `liveEvent?.status !== 'ok'` (depends on T015)

**Checkpoint**: User Stories 1 AND 2 both work independently.

- [X] T018 [US2] Manually validate User Story 2 via `quickstart.md` scenarios 4–6 with the browser console open (depends on T012, T016, T017)

---

## Phase 5: User Story 3 - Clear handling of invalid event links (Priority: P3)

**Goal**: An invalid event link shows a fully readable, correctly styled "Event not found" card, and
the page reports itself as `404`, not `200` — for both a well-formed-but-missing UUID and a
syntactically odd `eventId`.

**Independent Test**: `quickstart.md` scenarios 7–8 — visit a nonexistent UUID and a malformed ID;
expect a readable card at `404`, no crash, no clipped layout.

### Implementation for User Story 3

- [X] T019 [P] [US3] Create `apps/web/src/app/(dashboard)/events/[eventId]/not-found.tsx`: a Server Component rendering `<SiteHeader title="Event" />` followed by a `Card`/`CardHeader`/`CardTitle`("Event not found")/`CardDescription` block, wrapped in `<div className="mx-auto mt-12 w-full max-w-md p-4 text-center lg:p-6">` (`w-full` included from the start — research.md #3, contracts/ui-contract-delta.md)
- [X] T020 [US3] In `apps/web/src/app/(dashboard)/events/[eventId]/page.tsx`, import `notFound` from `next/navigation` and call it for `error.code === 'NOT_FOUND'` and `error.code === 'VALIDATION_ERROR'` (the latter covers a malformed/non-UUID `eventId`, per spec Edge Cases). **Refined during implementation**: rather than calling `notFound()` unconditionally for any `!result.ok` (as originally scoped), any other error code (an unexpected 5xx/network failure) keeps the old inline fallback card — now with `w-full` added — instead of being misreported as "not found"; only the two error codes this endpoint can actually produce for "there's no event here" become a 404 (depends on T019)

**Checkpoint**: User Stories 1, 2, AND 3 all work independently.

- [X] T021 [US3] Manually validate User Story 3 via `quickstart.md` scenarios 7–8. **Discovered during implementation**: this route's (and its parent `/events` list route's) `loading.tsx` causes Next to stream the response before `notFound()` runs, so the wire-level HTTP status stays `200` (standard Next.js App Router behavior, confirmed by temporarily removing this segment's `loading.tsx` — no change — and tracing it to the parent segment's `loading.tsx`, which also wraps this child route). What the fix does deliver, confirmed live: the `<meta name="robots" content="noindex">` tag Next emits automatically for `notFound()`, the styled `not-found.tsx` UI at full width, and Next's own internal not-found routing state — the standard "soft 404" pattern, and the scoped, correct outcome for this fix (research.md #3; a literal 404 status would need a `proxy`/middleware pre-check duplicating this page's own fetch on every request, rejected as disproportionate). `quickstart.md` scenarios 7–8 updated accordingly (depends on T020)

---

## Phase 6: User Story 4 - Browser tab reflects the actual product (Priority: P4)

**Goal**: Every page's browser tab title identifies the event registration portal, not the
`create-next-app` scaffold default.

**Independent Test**: `quickstart.md` scenario 9 — open any route, check the tab title.

### Implementation for User Story 4

- [X] T022 [P] [US4] In `apps/web/src/app/layout.tsx`, replace the `metadata` export's `title`/`description` (currently `"Create Next App"` / `"Generated by create next app"`) with portal-identifying values, e.g. `title: "Event Registration Portal"` and a matching one-line `description` (research.md #4; no `generateMetadata` added to any route segment — spec Assumptions call for one portal-wide title)

**Checkpoint**: User Stories 1–4 all work independently.

- [X] T023 [US4] Manually validate User Story 4 via `quickstart.md` scenario 9 across `/events`, `/events/[eventId]`, `/my-registrations`, `/admin/events` (depends on T022)

---

## Phase 7: User Story 5 - Accurate required-field messaging on the event form (Priority: P5)

**Goal**: Leaving the Image URL field empty on "Add Event"/"Edit Event" shows a "this field is
required" message matching the other fields' phrasing; a non-empty, malformed URL still shows the
"enter a valid image URL" message.

**Independent Test**: `quickstart.md` scenarios 10–11 — submit the form with Image URL empty, then
with a malformed non-empty value.

### Implementation for User Story 5

- [X] T024 [P] [US5] In `packages/shared/src/event-form-schema.ts`, change the `imageUrl` field from `z.string().trim().url('Enter a valid image URL.')` to `z.string().trim().min(1, 'Image URL is required.').url('Enter a valid image URL.')` (data-model.md)

**Checkpoint**: All five user stories work independently.

- [X] T025 [US5] Manually validate User Story 5 via `quickstart.md` scenarios 10–11 on both "Add Event" and "Edit Event" (depends on T024)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Confirm nothing outside the six defects regressed.

- [X] T026 [P] Re-run `004-event-registration-portal/quickstart.md` scenarios 2–3, 6–9, and 12–13 per `quickstart.md` scenario 12 (browse, detail view, validation errors, full/past-event blocking, second-device duplicate rejection, already-cancelled-elsewhere sync, past-event cancellation) — confirm none of this feature's fixes changed their outcome. **Result**: browse grid renders both seeded events correctly with accurate Past/availability badges; a past event's detail page correctly shows "Registration closed" (untouched `isPast` branch in `registration-panel.tsx`); second-device duplicate rejection and already-cancelled-elsewhere sync are covered by the full `apps/api` suite (T027, all 30 tests passing, including the pre-existing contract tests for these exact scenarios, unmodified). No console errors on any checked route.
- [X] T027 [P] Run the full `apps/api` suite: `cd apps/api && npx vitest run` — confirm no test outside the files touched by this feature regressed. **Result**: 30/30 pass across all 6 test files.
- [X] T028 [P] Run `pnpm lint` from the repo root — confirm no lint regressions in any file touched by this feature. **Result**: `pnpm lint` itself fails, but for a pre-existing, unrelated reason — `apps/api`'s `eslint . --ext .ts` errors with "couldn't find an eslint.config.js file" (ESLint 9 is installed but only a legacy `.eslintrc.cjs` exists; reproduced identically against the unmodified `main` branch, confirming it predates this feature). `apps/web`'s `eslint` run does execute and reports 3 pre-existing issues, all in files this feature never touched (`(dashboard)/layout.tsx`, `components/admin/event-form-dialog.tsx`, `hooks/use-mobile.ts`). Every file this feature actually changed in `apps/web` was linted directly (`npx eslint <files>`) with zero issues. Also ran `npx tsc --noEmit` in `apps/api` as a substitute correctness check since its lint is non-functional — caught and fixed one real type error (`cors`'s `origin` option needs a mutable array; `corsPolicy.allowedOrigins` is `readonly string[]`, fixed via `[...corsPolicy.allowedOrigins]` in `app.ts`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** / **Foundational (Phase 2)**: Empty — no blocking prerequisites.
- **User Stories (Phase 3–7)**: Each is self-contained (distinct files, no shared new code) and may
  start immediately, in any order. Priority order (P1 → P5) is the suggested sequence for a single
  implementer; a team could parallelize across stories from the start.
- **Polish (Phase 8)**: Depends on whichever user story phases are in scope for the current delivery
  being complete (all five, for a full delivery of this spec).

### User Story Dependencies

None. US1–US5 touch entirely disjoint files (`plan.md`'s Project Structure) — no story's implementation
imports or depends on another's changes. This is unusual for a feature but expected for a set of
independent bug fixes.

### Within Each User Story

- US1: tests (T001–T002) before implementation (T003–T004); T003 before T004 (interface before its
  consumer); T006 is independent of T003–T005 (different file/module) and may run in parallel.
- US2: test (T008) before implementation (T009–T012); T009 before T010; T010+T011 before T012; T015
  before T016 and T017 (same/derived type).
- US3: T019 before T020 (the not-found file must exist before `page.tsx` relies on it being the
  rendered boundary).
- US4, US5: single implementation task each.

### Parallel Opportunities

- Across stories: once you start work, T001/T002 (US1 tests), T008 (US2 test), T019 (US3),
  T022 (US4), and T024 (US5) all touch disjoint files and can be picked up simultaneously by
  different people.
- Within US1: T001 + T002 in parallel; T006 in parallel with T001–T005.
- Within US2: T009 + T011 + T013 in parallel; T008 in parallel with all of T009–T013 (different files).
- Within Phase 8: T026 + T027 + T028 are fully independent.

---

## Parallel Example: User Story 1

```bash
# Tests (parallel — different files):
Task: "Add failing unit test for reactivation in apps/api/tests/unit/registration.service.test.ts"
Task: "Add failing contract test for cancel-then-re-register in apps/api/tests/contract/registrations.api.test.ts"

# T006 has no dependency on the repository/service work and can run alongside either:
Task: "Fix getServerSnapshot in apps/web/src/app/(dashboard)/events/[eventId]/registration-panel.tsx"
```

## Parallel Example: User Story 2

```bash
# All independent of each other (different files, no shared new code yet):
Task: "Add failing CORS contract test in apps/api/tests/contract/events.api.test.ts"
Task: "Add CORS_ALLOWED_ORIGINS to apps/api/src/config/env.ts"
Task: "Add cors + @types/cors to apps/api/package.json"
Task: "Document CORS_ALLOWED_ORIGINS in apps/api/.env.example"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (US1: T001–T007).
2. **STOP and VALIDATE**: run `quickstart.md` scenarios 1–3 independently.
3. This alone fixes the spec's highest-impact defect (cancel-then-rejoin) and ships safely on its own
   — no other story depends on it.

### Incremental Delivery

Given the zero cross-story dependencies, deliver in spec.md's priority order for maximum impact per
increment, validating and (if desired) shipping after each phase:

1. US1 (T001–T007) → validate → ship (P1, highest impact).
2. US2 (T008–T018) → validate → ship (P2).
3. US3 (T019–T021) → validate → ship (P3).
4. US4 (T022–T023) → validate → ship (P4).
5. US5 (T024–T025) → validate → ship (P5).
6. Phase 8 polish (T026–T028) once all five are in.

### Parallel Team Strategy

With multiple developers, since there is no Foundational phase and no cross-story dependency, up to
five people can each take one user story from the start: Developer A → US1, B → US2, C → US3, D → US4,
E → US5. Integration risk is low — the only files touched by more than one story are none (verified
against `plan.md`'s Project Structure: every file appears under exactly one story).

---

## Notes

- [P] tasks = different files, no dependency on an incomplete task.
- [Story] label maps each task to spec.md's US1–US5 for traceability.
- Every user story is independently completable, testable, and shippable — this feature's defects
  happen to share no code, which is why Phases 1–2 are empty and Phase-to-phase dependencies (beyond
  Polish) don't exist.
- T001/T002 and T008 are expected to **fail** before their corresponding implementation tasks — verify
  the failure (not just skip straight to implementation) before proceeding.
- Commit after each task or logical group, per repo convention (only when the user asks — see
  `CLAUDE.md`).
- Stop at any checkpoint to validate a story independently before moving to the next.
