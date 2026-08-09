# Quickstart: Validate the Events Landing Page

Proves the acceptance scenarios and success criteria in `spec.md` end-to-end against a running app. No new setup beyond the repo's normal dev workflow (see root `CLAUDE.md`).

## Prerequisites

- Dependencies installed: `pnpm install` (repo root, once)
- Both apps running: `pnpm dev` (repo root) — API on `http://localhost:3000`, web on `http://localhost:3001`
- At least one event seeded, to also exercise the non-empty path: `pnpm --filter @event-management/api run db:seed`

## Scenario 1 — Base address shows the events list (FR-001, FR-002, FR-004; SC-001, SC-002)

1. Open `http://localhost:3001/` in a fresh browser session (no prior navigation).
2. **Expect**: the page renders the events list (cards/grid of events), not the `create-next-app` placeholder. The URL bar settles on `http://localhost:3001/events` after the redirect.
3. **Expect**: the sidebar's "Events" nav item is shown as the active/selected item.

## Scenario 2 — Existing `/events` address still works (FR-005; SC-003)

1. Open `http://localhost:3001/events` directly.
2. **Expect**: same events list content as Scenario 1, no redirect loop, no broken link.

## Scenario 3 — Refresh / bookmark behavior (Acceptance Scenario 3)

1. From the events list, refresh the browser.
2. **Expect**: events list still renders; no errors in the browser console.

## Scenario 4 — Empty and error states carry over (Edge cases; FR-006)

1. Empty state: with the API running but zero events seeded (fresh DB, no `db:seed`), open `http://localhost:3001/`.
   **Expect**: the same empty state `/events` already shows (no events / empty grid), not an error or the old placeholder.
2. Error state: stop the API (`apps/api` dev process) while the web app is running, then open `http://localhost:3001/`.
   **Expect**: the same "Couldn't load events" fallback card `/events` already shows.

## Scenario 5 — Automated browser check (SC-004)

Run via Claude Code's Chrome browser automation (or equivalent), against the running `pnpm dev` servers from the Prerequisites step:

1. Navigate to `http://localhost:3001/`.
2. Confirm the resulting page shows event content (not the scaffold) and the URL is `http://localhost:3001/events`.
3. Read the browser console; confirm no page errors were logged.
4. Navigate to `http://localhost:3001/events` directly and confirm it still renders correctly (Scenario 2).

**Pass condition**: all five scenarios above behave as described, with no console errors in Scenario 5.
