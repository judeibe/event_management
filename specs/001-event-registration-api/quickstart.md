# Quickstart: Event and Registration Management API Validation

This guide validates the feature end-to-end against the contract and business rules.

## Prerequisites

- Node.js 20+
- npm
- Local SQLite file access

## Setup

1. Install dependencies:
   - `npm install`
2. Generate Prisma client:
   - `npx prisma generate`
3. Apply database schema:
   - `npx prisma migrate dev --name init`
4. Start API:
   - `npm run dev`

## Contract Reference

- API contract: `specs/001-event-registration-api/contracts/openapi.yaml`
- Data model: `specs/001-event-registration-api/data-model.md`

## Validation Scenarios

1. **Event lifecycle**
   - Create event with valid payload.
   - List and fetch event by ID.
   - Update title/date/capacity.
   - Delete event.
   - Expected: status codes and payload shapes match contract.

2. **Business rules**
   - Register attendee for future event.
   - Attempt duplicate registration for same attendee/event.
   - Fill event to capacity, then attempt one more registration.
   - Attempt registration for a past event.
   - Expected: valid flow succeeds; rule violations return documented conflict/error outcomes.

3. **Unregister flow**
   - Unregister existing attendee registration.
   - Attempt to unregister non-existent registration.
   - Expected: first succeeds; second returns documented not-found/conflict outcome.

4. **Abuse guardrails**
   - Send burst traffic beyond per-client threshold.
   - Send payload larger than configured limit.
   - Expected: throttled requests return `429`; oversize payload returns `413`.

## Test Commands

- Run unit tests (business logic):
  - `npm test -- --runInBand`
- Run targeted contract/API tests:
  - `npm test -- tests/contract`

## Expected Outcomes

- Event and registration flows satisfy all functional requirements in `spec.md`.
- Contract tests align with `openapi.yaml`.
- Abuse controls are enforced with explicit error outcomes.
