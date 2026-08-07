# Data Model: API Validation and Security Check Runner

## Entity: Validation Run

**Purpose**: Represents a complete execution of the validation workflow.

### Fields

- `runId` (string): Unique identifier for the execution instance.
- `startedAt` (datetime): Start timestamp.
- `endedAt` (datetime): End timestamp.
- `overallStatus` (enum: `PASS`, `FAIL`, `ERROR`): Final run outcome.
- `prerequisiteStatus` (enum: `READY`, `MISSING`): Pre-run readiness result.
- `groups` (array of Validation Group Result): Grouped check outcomes.

### Validation Rules

- `overallStatus` is `PASS` only when all required checks pass.
- `overallStatus` is `FAIL` when any required check fails.
- `overallStatus` is `ERROR` when execution cannot complete due to runtime/precondition issues.

## Entity: Validation Group Result

**Purpose**: Captures outcomes for a check category.

### Fields

- `groupName` (enum: `functional`, `security`): Check grouping.
- `required` (boolean): Whether group contributes to mandatory pass/fail.
- `totalChecks` (integer): Count of checks attempted.
- `passedChecks` (integer): Count of passing checks.
- `failedChecks` (integer): Count of failing checks.
- `status` (enum: `PASS`, `FAIL`, `SKIPPED`): Group-level status.
- `checks` (array of Validation Check): Itemized checks.

### Validation Rules

- `failedChecks + passedChecks` must equal `totalChecks` for executed groups.
- Required groups cannot be `SKIPPED` without setting run `overallStatus` to `ERROR`.

## Entity: Validation Check

**Purpose**: Represents one assertion executed by the runner.

### Fields

- `checkId` (string): Stable check identifier.
- `groupName` (enum: `functional`, `security`): Group membership.
- `description` (string): Human-readable check description.
- `status` (enum: `PASS`, `FAIL`, `ERROR`): Check outcome.
- `failureReason` (string nullable): Diagnostic reason when not passing.
- `durationMs` (integer): Execution duration for the check.

### Validation Rules

- `failureReason` is required when status is `FAIL` or `ERROR`.
- `durationMs` must be non-negative.

## Entity: Validation Summary

**Purpose**: Developer-facing final report.

### Fields

- `overallStatus` (enum: `PASS`, `FAIL`, `ERROR`)
- `totalChecks` (integer)
- `passedChecks` (integer)
- `failedChecks` (integer)
- `functionalStatus` (enum: `PASS`, `FAIL`, `SKIPPED`)
- `securityStatus` (enum: `PASS`, `FAIL`, `SKIPPED`)
- `nextAction` (string): Recommended next step when non-passing.

### Validation Rules

- Summary totals must reconcile with all grouped results.
- Non-pass summary must include at least one actionable next step.

## Relationships

- One **Validation Run** contains multiple **Validation Group Result** entries.
- One **Validation Group Result** contains multiple **Validation Check** entries.
- One **Validation Summary** is derived from one **Validation Run**.

## State Transitions

- `Validation Run`: `READY` → `RUNNING` → (`PASS` | `FAIL` | `ERROR`).
- `Validation Check`: `PENDING` → (`PASS` | `FAIL` | `ERROR`).
