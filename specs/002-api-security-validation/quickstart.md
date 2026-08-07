# Quickstart: API Validation and Security Check Runner

This guide validates the end-to-end behavior of the API validation/security runner workflow.

## Prerequisites

- Node.js 20+
- npm
- API service available locally

## Setup

1. Install dependencies:
   - `npm install`
2. Ensure database and API baseline are ready:
   - `npm run prisma:generate`
   - `npm run dev`
3. Confirm API health endpoint responds:
   - `curl http://localhost:3000/health`

## Contract and Model References

- Runner contract: `specs/002-api-security-validation/contracts/validation-runner.yaml`
- Data model: `specs/002-api-security-validation/data-model.md`
- Feature requirements: `specs/002-api-security-validation/spec.md`

## Validation Scenarios

1. **Functional check execution**
   - Run validation command in normal conditions.
   - Confirm functional checks execute and are included in summary.

2. **Security check execution**
   - Trigger negative scenarios (abuse/input protection checks).
   - Confirm security check outcomes are included in summary.

3. **Failure reporting**
   - Introduce one failing check condition.
   - Confirm output includes failed check reason and non-success overall result.

4. **Prerequisite failure behavior**
   - Run against unavailable API endpoint.
   - Confirm runner fails fast with corrective guidance.

## Validation Commands

- Run complete project tests:
  - `npm test`
- Run type checks:
  - `npm run typecheck`
- Run runner command:
  - `npm run validate:api`
- Run functional-only mode:
  - `npm run validate:api -- --base-url=http://localhost:3000 --mode=functional`
- Run JSON output mode:
  - `npm run validate:api -- --base-url=http://localhost:3000 --output=json`

## Expected Outcomes

- Output includes grouped functional/security summaries and a clear overall status.
- Any required check failure yields non-success process outcome.
- Missing prerequisites return explicit error outcome and guidance.
- Human output lists per-group check results and reasons for non-pass checks.
- JSON output includes `run` and `summary` objects matching `validation-runner.yaml`.
