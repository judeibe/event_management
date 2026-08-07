# Tasks: API Validation and Security Check Runner

**Input**: Design documents from `/specs/002-api-security-validation/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are required for this feature because the specification explicitly requests API-call and security validation.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable task (different files, no unmet dependency)
- **[Story]**: User story label for story-phase tasks (`[US1]`, `[US2]`, `[US3]`)
- Every task references explicit file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare runner entrypoint and execution wiring.

- [X] T001 Add validation runner script entry in package.json
- [X] T002 Create runner folder and base executable stub in scripts/validate-api.ts
- [X] T003 [P] Create validation test folder scaffold in tests/validation/validate-api.runner.test.ts
- [X] T004 [P] Add shared validation result types file in src/shared/validation-types.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build core runner plumbing used by all stories.

**⚠️ CRITICAL**: User-story tasks should not start before this phase is done.

- [X] T005 Implement CLI argument parsing and mode/output validation in scripts/validate-api.ts
- [X] T006 Implement prerequisite checks (API reachability and input validation) in scripts/validate-api.ts
- [X] T007 Implement normalized check/result aggregation utilities in src/shared/validation-types.ts
- [X] T008 Implement grouped summary formatter (human + JSON output) in scripts/validate-api.ts
- [X] T009 [P] Add runner contract parity notes to specs/002-api-security-validation/contracts/validation-runner.yaml

**Checkpoint**: Foundation complete; story-level work can begin.

---

## Phase 3: User Story 1 - Run Full API Validation (Priority: P1) 🎯 MVP

**Goal**: Execute functional API checks through a single runner command.

**Independent Test**: Run the command against a reachable API and verify functional checks execute with deterministic pass/fail output.

### Tests for User Story 1

- [X] T010 [P] [US1] Implement functional-runner unit tests for execution flow in tests/validation/validate-api.runner.test.ts
- [X] T011 [P] [US1] Implement command-level functional contract test in tests/validation/validate-api.runner.test.ts

### Implementation for User Story 1

- [X] T012 [US1] Implement functional check executor integration in scripts/validate-api.ts
- [X] T013 [US1] Implement per-check status mapping and failure reason capture in scripts/validate-api.ts
- [X] T014 [US1] Wire overall non-success process exit for functional failures in scripts/validate-api.ts
- [X] T015 [US1] Update functional validation scenario guidance in specs/002-api-security-validation/quickstart.md

**Checkpoint**: US1 validation command works independently for functional checks.

---

## Phase 4: User Story 2 - Validate Security Controls (Priority: P2)

**Goal**: Add security-check execution and enforcement in the same runner workflow.

**Independent Test**: Execute the runner with security scenarios and verify abuse/input protection outcomes are evaluated and reported.

### Tests for User Story 2

- [X] T016 [P] [US2] Add security-check success/failure cases in tests/validation/validate-api.runner.test.ts
- [X] T017 [P] [US2] Add prerequisite-error and unreachable-API cases in tests/validation/validate-api.runner.test.ts

### Implementation for User Story 2

- [X] T018 [US2] Implement security check executor integration in scripts/validate-api.ts
- [X] T019 [US2] Implement required security group enforcement and status rules in scripts/validate-api.ts
- [X] T020 [US2] Implement fail-fast behavior for missing prerequisites with corrective messages in scripts/validate-api.ts
- [X] T021 [US2] Align security failure semantics with runner contract in specs/002-api-security-validation/contracts/validation-runner.yaml

**Checkpoint**: US1 and US2 both pass independent validation criteria.

---

## Phase 5: User Story 3 - Produce Actionable Validation Output (Priority: P3)

**Goal**: Deliver concise grouped summaries and actionable failure output.

**Independent Test**: Execute passing and failing runs and verify grouped totals, failure details, and overall status are clear and consistent.

### Tests for User Story 3

- [X] T022 [P] [US3] Add summary-format assertions for human output in tests/validation/validate-api.runner.test.ts
- [X] T023 [P] [US3] Add summary-format assertions for JSON output in tests/validation/validate-api.runner.test.ts

### Implementation for User Story 3

- [X] T024 [US3] Implement final summary composition with grouped totals in scripts/validate-api.ts
- [X] T025 [US3] Implement actionable next-step messaging for non-pass outcomes in scripts/validate-api.ts
- [X] T026 [US3] Update quickstart output expectations in specs/002-api-security-validation/quickstart.md

**Checkpoint**: All stories are independently testable and produce actionable outcomes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize docs, contract consistency, and end-to-end validation.

- [X] T027 [P] Reconcile plan/spec references to runner behavior in specs/002-api-security-validation/plan.md and specs/002-api-security-validation/spec.md
- [X] T028 [P] Add final contract examples for pass/fail/error outputs in specs/002-api-security-validation/contracts/validation-runner.yaml
- [X] T029 Run full test suite and fix regressions in tests/validation/ tests/contract/ and tests/unit/
- [X] T030 Run quickstart validation flow and confirm expected outcomes in specs/002-api-security-validation/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: no dependencies.
- **Phase 2 (Foundational)**: depends on Phase 1; blocks all stories.
- **Phase 3 (US1)**: depends on Phase 2.
- **Phase 4 (US2)**: depends on Phase 3.
- **Phase 5 (US3)**: depends on Phase 4.
- **Phase 6 (Polish)**: depends on completed story phases.

### User Story Dependencies

- **US1 (P1)**: first deliverable after foundation.
- **US2 (P2)**: extends US1 runner with required security checks.
- **US3 (P3)**: depends on outputs from US1 and US2 for grouped reporting.

### Parallel Opportunities

- Phase 1: T003 and T004 can run in parallel after T001/T002.
- Phase 2: T009 can run in parallel while T005-T008 are implemented.
- US1: T010 and T011 can run in parallel before T012-T015.
- US2: T016 and T017 can run in parallel before T018-T021.
- US3: T022 and T023 can run in parallel before T024-T026.
- Polish: T027 and T028 can run in parallel before T029-T030.

---

## Parallel Execution Examples

### User Story 1

```bash
Task: "T010 [US1] functional runner tests in tests/validation/validate-api.runner.test.ts"
Task: "T011 [US1] functional command contract test in tests/validation/validate-api.runner.test.ts"
```

### User Story 2

```bash
Task: "T016 [US2] security check test cases in tests/validation/validate-api.runner.test.ts"
Task: "T017 [US2] prerequisite failure test cases in tests/validation/validate-api.runner.test.ts"
```

### User Story 3

```bash
Task: "T022 [US3] human summary output assertions in tests/validation/validate-api.runner.test.ts"
Task: "T023 [US3] JSON summary output assertions in tests/validation/validate-api.runner.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Complete US1 tasks and validate functional-runner behavior.
3. Use this as first releasable increment.

### Incremental Delivery

1. Deliver US1 (functional checks).
2. Add US2 (security checks + prerequisite fail-fast).
3. Add US3 (actionable grouped output).
4. Finish with polish and full validation.

### Parallel Team Strategy

1. Team completes Phases 1-2 together.
2. Then split by story phase ownership (US1 → US2 → US3), parallelizing test-authoring tasks marked `[P]`.
