# Phase 0 Research: Event and Registration Management

## Decision 1: Runtime and language baseline

- **Decision**: Use Node.js 20 LTS with strict TypeScript.
- **Rationale**: Aligns with requested stack, supports mature tooling, and improves correctness via
  compile-time guarantees for API and domain rules.
- **Alternatives considered**:
  - JavaScript without strict typing: rejected due to higher runtime defect risk.
  - Newer Node non-LTS release: rejected for lower stability guarantees.

## Decision 2: Web framework and API composition

- **Decision**: Use Express with modular route/controller/service layering.
- **Rationale**: Keeps dependency footprint low while enabling clear HTTP handling and separation of
  business logic from transport concerns.
- **Alternatives considered**:
  - Full batteries-included frameworks: rejected to preserve minimal-library goal.
  - Single-file route handlers: rejected due to maintainability and testing friction.

## Decision 3: Persistence and ORM strategy

- **Decision**: Use SQLite for local storage and Prisma for schema, migrations, and typed data access.
- **Rationale**: Meets local database requirement, provides reliable relational constraints, and
  enables fast typed iteration.
- **Alternatives considered**:
  - In-memory only persistence: rejected because current planning scope requires SQLite + Prisma.
  - Raw SQL without ORM: rejected due to higher schema drift and type-safety overhead.

## Decision 4: Event and registration consistency rules

- **Decision**: Enforce uniqueness on `(eventId, attendeeIdentifier)` and use transactional service
  logic for registration, unregistration, and capacity checks.
- **Rationale**: Prevents duplicate registration at both application and database levels and avoids
  race-condition violations of capacity constraints.
- **Alternatives considered**:
  - App-level checks only: rejected due to concurrency race risk.
  - Capacity tracked only as mutable counter: rejected due to possible drift without reconciliation.

## Decision 5: Abuse protection policy for unauthenticated API

- **Decision**: Implement basic abuse guardrails with per-client rate limiting, request payload size
  limits, and explicit `429`/`413` responses.
- **Rationale**: Matches clarified scope, protects service reliability, and keeps implementation
  operationally simple.
- **Alternatives considered**:
  - No throttling: rejected due to abuse and accidental overload risk.
  - Strong lockout/challenge systems: rejected as out-of-scope complexity for v1.

## Decision 6: Validation and error contract

- **Decision**: Validate all request payloads at route boundaries and return a consistent error shape
  for validation, business-rule, not-found, and abuse outcomes.
- **Rationale**: Improves API predictability and supports testable contract assertions.
- **Alternatives considered**:
  - Ad hoc per-handler validation: rejected due to inconsistency risk.
  - Unstructured error bodies: rejected due to poor client experience.

## Decision 7: Test strategy

- **Decision**: Prioritize unit tests for event and registration business logic; add targeted contract
  tests for API responses and abuse scenarios.
- **Rationale**: Meets spec emphasis on business-rule correctness while verifying externally visible
  behavior.
- **Alternatives considered**:
  - Integration-only testing: rejected because business-rule regressions become harder to isolate.
  - Unit-only testing: rejected because HTTP contract behavior would be under-validated.
