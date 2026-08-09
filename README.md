# Event Management

A pnpm/Turborepo monorepo for event and attendee registration management.

- `apps/api` — Node.js/TypeScript, Express, Prisma, SQLite. Backend REST API (no auth/authz).
- `apps/web` — Next.js (App Router, TypeScript, Tailwind) frontend: a public registration portal
  and an admin event-management UI.
- `packages/shared` — Zod schemas and types shared between `apps/api` and `apps/web`.

## Prerequisites

- **Node.js** >= 20
- **pnpm** — this repo pins its version via the `packageManager` field in `package.json`. If you
  have [Corepack](https://nodejs.org/api/corepack.html) enabled (`corepack enable`), the correct
  pnpm version is used automatically. Otherwise install pnpm yourself (e.g. `npm i -g pnpm`).

## 1. Install dependencies

Run this once from the **repo root** — never run `npm`/`yarn install`, and never install inside
`apps/*` individually (this is a pnpm workspace with a single root lockfile):

```bash
pnpm install
```

## 2. Configure environment variables

Each app reads its own `.env` file. Copy the provided examples and adjust if needed (the defaults
work out of the box for local development):

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

| App | Var | Default | Notes |
|---|---|---|---|
| `apps/api` | `DATABASE_URL` | `file:./prisma/dev.db` | SQLite file, created by the migrate step below. |
| `apps/api` | `PORT` | `3000` | |
| `apps/api` | `NODE_ENV` | `development` | |
| `apps/api` | `CORS_ALLOWED_ORIGINS` | `http://localhost:3001` | Origins allowed to call the API from a browser (must match `apps/web`'s dev URL). |
| `apps/web` | `API_BASE_URL` | `http://localhost:3000` | Used server-side (Server Components/Actions). |
| `apps/web` | `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3000` | Used client-side (browser fetches, e.g. My Registrations). |

## 3. Set up the database

From the repo root, targeting the `@event-management/api` workspace:

```bash
pnpm --filter @event-management/api run prisma:generate     # generate the Prisma client
pnpm --filter @event-management/api run prisma:migrate:dev  # create the SQLite db + apply migrations
pnpm --filter @event-management/api run prisma:db:seed      # seed sample events for local testing
```

This creates `apps/api/prisma/dev.db` and populates it with a handful of sample events (a mix of
upcoming, near-capacity, and past events) so the UI has something to show immediately.

## 4. Run the app

From the repo root:

```bash
pnpm dev
```

This runs both apps in parallel via Turborepo:

- API: [http://localhost:3000](http://localhost:3000) (health check at `/health`)
- Web: [http://localhost:3001](http://localhost:3001)

To run just one app, use `pnpm --filter <name> dev` (package names: `@event-management/api`,
`@event-management/web`), or `cd` into `apps/api` / `apps/web` and run `pnpm dev` there.

## Other useful commands

```bash
pnpm build              # build all apps
pnpm start              # run built apps (run `pnpm build` first)
pnpm test                # run apps/api's test suite (unit + contract)
pnpm lint / lint:fix     # lint all apps
pnpm format              # format the whole repo with Prettier

# Single test file / single test (from apps/api):
cd apps/api && npx vitest run tests/unit/event.service.test.ts
cd apps/api && npx vitest run -t "test name substring"
```

## Troubleshooting

- **Port already in use**: the API defaults to `:3000` and the web app to `:3001`. Stop whatever
  else is using those ports, or change `PORT` in `apps/api/.env` (and update `API_BASE_URL` /
  `NEXT_PUBLIC_API_BASE_URL` in `apps/web/.env` to match).
- **"My Registrations" shows events as unavailable**: make sure `apps/api/.env`'s
  `CORS_ALLOWED_ORIGINS` includes the exact origin `apps/web` is served from.
- **Prisma client errors after pulling new changes**: re-run
  `pnpm --filter @event-management/api run prisma:generate`.
