# Tasks: Event and Registration Management

**Input**: Design documents from `/specs/001-event-registration-api/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Unit tests for business logic are required by the spec; contract/API tests are included to validate endpoint behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Task can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`) for story-phase tasks only
- Every task includes an explicit file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize TypeScript/Express/Prisma project scaffold and baseline tooling.

- [X] T001 Initialize project manifest and scripts in package.json
- [X] T002 Install runtime and dev dependencies and lock versions in package.json
- [X] T003 Configure strict TypeScript compiler options in tsconfig.json
- [X] T004 [P] Configure lint/format scripts in package.json and .eslintrc.cjs
- [X] T005 [P] Create source/test folder scaffolding with module entry files under src/ and tests/
- [X] T006 Initialize Prisma baseline files in prisma/schema.prisma and .env.example

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build core app/runtime capabilities required by all user stories.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T007 Implement Express bootstrap and server startup in src/app.ts and src/server.ts
- [X] T008 Implement environment configuration parsing in src/config/env.ts
- [X] T009 Implement Prisma client singleton and lifecycle hooks in src/db/client.ts
- [X] T010 Define shared domain/http error classes in src/shared/errors.ts
- [X] T011 [P] Implement structured logger utility in src/shared/logger.ts
- [X] T012 Implement centralized HTTP error middleware in src/middleware/error-handler.ts
- [X] T013 Implement request payload validation middleware in src/middleware/request-validation.ts
- [X] T014 Implement abuse policy + middleware in src/config/abuse-policy.ts, src/middleware/rate-limit.ts, and src/middleware/request-size.ts
- [X] T015 Define core Prisma models and migration for Event, Attendee, and Registration in prisma/schema.prisma
- [X] T016 Wire global middleware chain and health route in src/app.ts

**Checkpoint**: Foundation is complete; user-story delivery can begin.

---

## Phase 3: User Story 1 - Create and Manage Events (Priority: P1) 🎯 MVP

**Goal**: Deliver event create/read/update/delete capabilities with consistent validation and error contracts.

**Independent Test**: Create an event, list/get it, update it, and delete it through API endpoints while validating status codes and response shapes.

### Tests for User Story 1

- [X] T017 [P] [US1] Implement event contract tests for CRUD endpoints in tests/contract/events.api.test.ts
- [X] T018 [P] [US1] Implement event service unit tests for create/update/delete and capacity constraints in tests/unit/event.service.test.ts

### Implementation for User Story 1

- [X] T019 [P] [US1] Define event request/response types and validators in src/modules/events/event.types.ts
- [X] T020 [US1] Implement event data access methods in src/modules/events/event.repository.ts
- [X] T021 [US1] Implement event CRUD business logic in src/modules/events/event.service.ts
- [X] T022 [US1] Implement event HTTP handlers in src/modules/events/event.controller.ts
- [X] T023 [US1] Implement event routes (GET/POST/PATCH/DELETE) in src/modules/events/event.routes.ts
- [X] T024 [US1] Mount event routes and map domain errors to HTTP responses in src/app.ts

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Register for an Event (Priority: P2)

**Goal**: Allow attendee registration with past-event, capacity, duplicate, and abuse guardrail enforcement.

**Independent Test**: Register an attendee to a future event, then verify duplicate, full-capacity, past-event, throttled, and oversized-payload attempts are rejected correctly.

### Tests for User Story 2

- [X] T025 [P] [US2] Implement registration contract tests for POST /events/:eventId/registrations in tests/contract/registrations.api.test.ts
- [X] T026 [P] [US2] Implement registration service unit tests for past-event, capacity, and duplicate rules in tests/unit/registration.service.test.ts

### Implementation for User Story 2

- [X] T027 [P] [US2] Define registration request/response types and validators in src/modules/registrations/registration.types.ts
- [X] T028 [US2] Implement attendee lookup/create and registration queries in src/modules/registrations/registration.repository.ts
- [X] T029 [US2] Implement transactional registration business logic in src/modules/registrations/registration.service.ts
- [X] T030 [US2] Implement registration create handler in src/modules/registrations/registration.controller.ts
- [X] T031 [US2] Implement registration create route in src/modules/registrations/registration.routes.ts
- [X] T032 [US2] Mount registration routes and enforce middleware ordering for validation and abuse controls in src/app.ts

**Checkpoint**: User Stories 1 and 2 are independently functional and testable.

---

## Phase 5: User Story 3 - Cancel Event Registration (Priority: P3)

**Goal**: Let attendees unregister and ensure occupancy/state are updated correctly.

**Independent Test**: Register an attendee, unregister them, verify occupancy decreases, and confirm non-existent unregister attempts return the expected error outcome.

### Tests for User Story 3

- [X] T033 [P] [US3] Extend registration contract tests for DELETE /events/:eventId/registrations/:attendeeRef in tests/contract/registrations.api.test.ts
- [X] T034 [P] [US3] Extend registration service unit tests for unregister state transitions in tests/unit/registration.service.test.ts

### Implementation for User Story 3

- [X] T035 [US3] Implement unregister data access updates in src/modules/registrations/registration.repository.ts
- [X] T036 [US3] Implement unregister business logic and occupancy reconciliation in src/modules/registrations/registration.service.ts
- [X] T037 [US3] Implement unregister handler in src/modules/registrations/registration.controller.ts
- [X] T038 [US3] Implement unregister route in src/modules/registrations/registration.routes.ts

**Checkpoint**: All user stories are independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final contract alignment, observability, and end-to-end validation.

- [X] T039 [P] Add seed utility for local validation data in src/db/seed.ts
- [X] T040 [P] Add request and abuse-event logging hooks in src/middleware/rate-limit.ts and src/middleware/request-size.ts
- [X] T041 Reconcile endpoint/error contract details in specs/001-event-registration-api/contracts/openapi.yaml
- [X] T042 Update run/validation guidance and command expectations in specs/001-event-registration-api/quickstart.md
- [X] T043 Execute full test suite and fix regressions in tests/unit/ and tests/contract/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: starts immediately.
- **Phase 2 (Foundational)**: depends on Phase 1; blocks all user stories.
- **Phase 3 (US1)**: depends on Phase 2; MVP entry point.
- **Phase 4 (US2)**: depends on Phase 2 and uses event capabilities from US1.
- **Phase 5 (US3)**: depends on Phase 2 and registration flows from US2.
- **Phase 6 (Polish)**: depends on completed stories targeted for release.

### User Story Dependencies

- **US1 (P1)**: no user-story dependency after foundation.
- **US2 (P2)**: depends on US1 event lifecycle availability.
- **US3 (P3)**: depends on US2 registration flow availability.

### Parallel Opportunities

- Setup: T004-T005 can run in parallel after T003.
- Foundational: T011 can run in parallel with T010-T013; T014 can proceed after T008.
- US1: T017/T018/T019 can run in parallel before converging on T020-T024.
- US2: T025/T026/T027 can run in parallel before converging on T028-T032.
- US3: T033/T034 can run in parallel before T035-T038.
- Polish: T039 and T040 can run in parallel before T041-T043.

---

## Parallel Execution Examples

### User Story 1

```bash
Task: "T017 [US1] contract tests in tests/contract/events.api.test.ts"
Task: "T018 [US1] unit tests in tests/unit/event.service.test.ts"
Task: "T019 [US1] event types in src/modules/events/event.types.ts"
```

### User Story 2

```bash
Task: "T025 [US2] contract tests in tests/contract/registrations.api.test.ts"
Task: "T026 [US2] unit tests in tests/unit/registration.service.test.ts"
Task: "T027 [US2] registration types in src/modules/registrations/registration.types.ts"
```

### User Story 3

```bash
Task: "T033 [US3] unregister contract tests in tests/contract/registrations.api.test.ts"
Task: "T034 [US3] unregister unit tests in tests/unit/registration.service.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate US1 independently before expanding scope.

### Incremental Delivery

1. Deliver US1 (event CRUD) as MVP.
2. Add US2 (registration with abuse guardrails).
3. Add US3 (unregister flow).
4. Finish with Phase 6 polish and full validation.

### Team Parallelization

1. Team aligns on Phase 1-2 together.
2. Then split: one owner per story phase (US1/US2/US3) while honoring dependencies.
