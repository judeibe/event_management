# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

pnpm/Turborepo monorepo for event and attendee registration management:

- `apps/api` — Node.js/TypeScript, Express, Prisma, SQLite. Backend API only, no auth/authz (explicitly out of scope per spec).
- `apps/web` — Next.js (App Router, TypeScript, Tailwind, Turbopack) frontend. New, largely unbuilt beyond the `create-next-app` scaffold — expect to add real pages/data-fetching here.

There is no shared `packages/*` yet. If `apps/web` needs types/schemas that mirror `apps/api`'s zod schemas (`event.types.ts`, `registration.types.ts`), consider extracting a `packages/shared` rather than duplicating them.

## Commands

Run from the repo root (delegates to the right workspace via Turborepo); use `pnpm --filter <name> <script>` or `cd apps/<app>` to target one app. Package names: `@event-management/api`, `@event-management/web`.

```bash
pnpm install                  # install once from the root — never run npm/yarn install, and never install inside apps/*

pnpm dev                      # turbo run dev — api on :3000, web on :3001, in parallel
pnpm build                    # turbo run build
pnpm start                    # turbo run start (run build first)
pnpm typecheck                # turbo run typecheck (api + packages/shared — see note below; web has no typecheck script)
pnpm lint / lint:fix          # turbo run lint / lint:fix
pnpm format / format:check    # prettier over the whole repo (not turbo — single pass at the root)
pnpm test / test:watch        # turbo run test (api only — web has no tests yet)

pnpm --filter @event-management/api run prisma:generate     # regenerate Prisma client after schema.prisma changes
pnpm --filter @event-management/api run prisma:migrate:dev  # create/apply a dev migration
pnpm --filter @event-management/api run db:seed

pnpm --filter @event-management/api run validate:api -- --base-url=http://localhost:3000 [--mode=full|functional|security] [--output=human|json]

cd apps/api && npx vitest run tests/unit/event.service.test.ts   # single test file
cd apps/api && npx vitest run -t "test name substring"           # single test by name
```

`apps/web` has no `typecheck` script by design: Next.js's ambient types (e.g. `LayoutProps<...>` in `layout.tsx`) come from `.next/types`, generated only by `next dev`/`next build`, so a standalone `tsc --noEmit` fails on a clean checkout. Type errors in `apps/web` surface via `next build` (which runs its own TS check) or the editor once `.next/types` exists from a dev run.

`apps/api`'s `dev`/`start`/`db:seed` scripts load env vars via node's `--env-file=.env` flag (not dotenv, not automatic) — keep that flag if you touch those scripts, and note `.env` lives in `apps/api/`, not the repo root.

`validate:api` is a standalone black-box runner (`apps/api/scripts/validate-api.ts`) that hits a *running* server over HTTP and checks functional + security behavior; it does not import app code directly. Start the API first (`pnpm --filter @event-management/api dev`) before running it.

## Monorepo mechanics

- Package manager is **pnpm** via `pnpm-workspace.yaml` (`apps/*`, `packages/*`); there is a single root `pnpm-lock.yaml` — don't add per-app lockfiles.
- `turbo.json` defines the task graph. `dev`/`start` are `persistent`/uncached (long-running servers); `build`/`lint`/`typecheck`/`test` depend on `^build` (upstream workspace deps' build output) so this is ready once shared `packages/*` exist.
- `apps/web`'s dev/start scripts are pinned to `-p 3001` (`next dev -p 3001`, `next start -p 3001`) specifically because both apps default to port 3000 — Next would otherwise silently fall back to a random port when it loses the race with the API, making `pnpm dev` non-deterministic. Keep them on different explicit ports if you touch these scripts.
- `pnpm-workspace.yaml` also carries an `allowBuilds` map (pnpm's postinstall-script allowlist). `prisma`, `@prisma/client`, `@prisma/engines`, `esbuild`, and `unrs-resolver` are set to `true` — needed for `prisma generate` (via `@prisma/client`'s postinstall) to actually produce the client. If `pnpm install` starts skipping a package's build script, check this map before debugging further.
- Root `package.json` only holds `turbo` and `prettier` as devDependencies plus repo-wide scripts; app-specific tooling (`eslint`, `vitest`, `typescript`, etc.) lives in each app's own `package.json`.
- `apps/api` uses the legacy `.eslintrc.cjs` format and is pinned to `eslint@8` for that reason; `apps/web` uses ESLint 9 flat config (`eslint.config.mjs`) from `eslint-config-next`. These are independent per-package devDependencies — don't try to unify them onto one shared eslint version without migrating `apps/api` to flat config first.

## apps/api architecture

Layered, module-per-domain structure under `apps/api/src/modules/<domain>/`, each with the same file set:

- `*.routes.ts` — Express `Router`, wires `validateRequest(zodSchema)` middleware + controller methods.
- `*.controller.ts` — `RequestHandler`s only: parse params (zod), call service, map to HTTP response/status, `catch (error) { next(error) }`. No business logic.
- `*.service.ts` — business rules (capacity checks, conflict detection, date checks). Takes a repository via constructor injection.
- `*.repository.ts` — the only layer that touches Prisma. Defines a `TransactionRepository` interface for operations that must run inside `prisma.$transaction`.
- `*.types.ts` — zod schemas for request bodies/params (`create*BodySchema`, `*ParamsSchema`) + response mapper functions (`mapXToResponse`) + inferred TS types.
- `index.ts` — barrel export.

Currently: `modules/events`, `modules/registrations` (registrations are nested under an event: routes mounted at `/events/:eventId/registrations` in `src/app.ts`).

Wiring is manual, not via a DI container: each controller module instantiates its own service/repository at the bottom of the file (e.g. `export const eventController = new EventController(new EventService(new PrismaEventRepository()))`).

### Request flow

`src/app.ts` (`createApp`) → helmet → `requestSizeMiddleware` → `rateLimitMiddleware` → domain routers → `notFoundHandler` → `errorHandler`.

### Errors

All thrown errors should be an `AppError` subclass from `src/shared/errors.ts` (`ValidationError` 400, `NotFoundError` 404, `ConflictError` 409, `PayloadTooLargeError` 413, `RateLimitError` 429, `InternalServerError` 500). `src/middleware/error-handler.ts` catches `AppError`, `ZodError` (→ 400), and the `entity.too.large` body-parser error (→ 413), and normalizes everything else to a 500. Response shape: `{ error: { code, message, details } }` on failure, `{ data: ... }` on success. Controllers never format error responses themselves — they always `next(error)`.

### Validation

Request bodies are validated by the `validateRequest(schema)` middleware (`src/middleware/request-validation.ts`), applied per-route in `*.routes.ts`. Path params (e.g. `eventId`) are parsed inside the controller with a dedicated zod schema (see `parseEventId` in `event.controller.ts`) since they aren't covered by the body middleware.

### Data model (Prisma, `apps/api/prisma/schema.prisma`, SQLite)

`Event` 1—N `Registration` N—1 `Attendee`. `Registration` has a unique `(eventId, attendeeId)` constraint (used to detect duplicate registrations via Prisma error code `P2002`) and a `status` field (`"ACTIVE"` / cancelled). `Event.currentRegistrations` is a denormalized counter kept in sync inside the registration/unregistration transactions (capacity checks compare it against `maxCapacity`); it is never trusted without the transactional guard in `RegistrationService`.

Note: the SQLite db files (`prisma/prisma/dev.db`, `prisma/prisma/test.db`) live nested one level deeper than you'd expect — Prisma resolves `DATABASE_URL`'s relative path against `schema.prisma`'s own directory, not the process cwd, so `file:./prisma/dev.db` in `schema.prisma`'s folder resolves to `apps/api/prisma/prisma/dev.db`.

### Config

`src/config/env.ts` validates `process.env` with zod at import time and throws on startup if invalid (`DATABASE_URL`, `PORT`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `MAX_REQUEST_SIZE`). `src/config/abuse-policy.ts` derives the rate-limit/request-size policy from `env`. Never read `process.env` directly outside `env.ts`.

### Logging

Use `src/shared/logger.ts` (structured logger) everywhere instead of `console.*`.

## Testing (apps/api)

- `tests/unit/` — service-layer tests against fakes/mocks of the repository interface (no DB).
- `tests/contract/` — supertest tests against `createApp()` hitting a real SQLite test DB (`file:./prisma/test.db`, resolved as noted above).
- `tests/validation/` — tests for the `scripts/validate-api.ts` runner itself.

Contract tests set `process.env` (`NODE_ENV`, `DATABASE_URL`, rate-limit/size overrides) and then dynamically `import()` `src/db/client.ts` / `src/app.ts` in `beforeAll`, so env vars are applied before those modules are loaded — don't switch these to static top-level imports. Each `beforeEach` clears tables via `prisma.registration/attendee/event.deleteMany()` for isolation.

`vitest.config.ts` sets `fileParallelism: false` — test files share the on-disk SQLite test DB and must run serially, not in parallel.

## Governance

`.specify/memory/constitution.md` is the authoritative engineering policy (four principles: Code Quality First, Functional Correctness, User Experience by Contract, Efficient Data and API Interaction, plus Delivery Standards and mandatory PR constitution-compliance review). This repo uses the spec-kit workflow: features live under `specs/<NNN-feature-name>/` (spec.md, plan.md, tasks.md, data-model.md, quickstart.md, contracts/), and `.specify/feature.json` tracks the active feature directory. Check the relevant `specs/*/spec.md` and `plan.md` before changing behavior in an area that has one. These predate the monorepo split and describe `apps/api`'s behavior; there is no spec for `apps/web` yet.
