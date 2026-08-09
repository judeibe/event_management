# Implementation Plan: Registration Portal Bug Fixes

**Branch**: `006-fix-registration-bugs` | **Date**: 2026-08-08 | **Spec**: `/specs/006-fix-registration-bugs/spec.md`

**Input**: Feature specification from `/specs/006-fix-registration-bugs/spec.md`

## Summary

Six defects found during manual QA of the event registration portal (`004-event-registration-portal`),
spanning both `apps/api` and `apps/web`, are fixed in place — no new features, no schema changes to
the `Event`/`Attendee` shape. All six root causes were confirmed by reading the relevant code and,
where a defect was visual/runtime in nature, by running both apps locally and reproducing the bug
(HTTP status codes, DOM measurements, and browser console output) rather than guessing:

1. **Cancel-then-re-register blocked** (P1): `Registration`'s DB-level `@@unique([eventId, attendeeId])`
   constraint fires regardless of `status`, so re-registering after a cancel always hits Prisma error
   `P2002` and is misreported as "already registered." Fix: reactivate the existing (cancelled) row
   instead of inserting a new one, only when no *active* registration exists.
2. **"My Registrations" always shows active events as unavailable** (P2): `apps/api` has no CORS
   configuration; `MyRegistrationsList`'s browser-side `fetch()` to `apps/api` is blocked by the
   browser (confirmed via live network trace — server return 200, browser reports the response
   blocked), collapses into the same `null` used for "genuinely deleted," and the UI reports
   "no longer available" for a perfectly live event. Fix: add scoped CORS on `apps/api`, and stop
   conflating "unreachable" with "deleted" client-side.
3. **Invalid event link shows a clipped card and a 200 status** (P3): the not-found branch of
   `/events/[eventId]`'s wrapper `<div>` is missing `w-full` (confirmed by measuring its rendered
   width at 40–88px against the sibling success-path wrapper's correct 672px), and the page never
   calls Next's `notFound()`, so it always returns HTTP 200 (confirmed via `curl`). Fix: extract the
   not-found card into a new `not-found.tsx` route-segment file (built with `w-full` from the start),
   call `notFound()` from `page.tsx`, and route the "syntactically odd ID" edge case (a 400 from the
   API, not a 404) through the same treatment.
4. **Generic browser tab title** (P4): `apps/web/src/app/layout.tsx` still ships the
   `create-next-app` scaffold `metadata` (confirmed live — tab title reads "Create Next App"). Fix:
   replace with portal-identifying metadata.
5. **Misleading Image URL required-message** (P5): `packages/shared/src/event-form-schema.ts`'s
   `imageUrl` field is `z.string().trim().url(...)` with no `.min(1, ...)` step, so an empty value
   fails the URL check and shows "Enter a valid image URL." instead of a required-field message. Fix:
   add the same `requiredText`-style min-length check other fields already use, ahead of `.url()`.
6. **One-time console error on revisiting a registered event / opening My Registrations** (linked to
   US1): confirmed live — a genuine hydration-mismatch exception is thrown. Both
   `RegistrationPanel` and `MyRegistrationsList` pass the *same* real-localStorage-reading function as
   both the `getSnapshot` and `getServerSnapshot` arguments to `useSyncExternalStore`; `getServerSnapshot`
   also runs in the browser during hydration (not only on the actual server), so it reads live
   localStorage instead of reproducing what the server actually rendered (which always assumes "no
   registration," since `window` is undefined in real SSR). Fix: `getServerSnapshot` returns a fixed
   placeholder, never reads storage.

## Technical Context

**Language/Version**: TypeScript (strict) across both workspaces — Node.js/Express (`apps/api`),
Next.js 16 (App Router) / React 19 (`apps/web`). Unchanged by this feature.

**Primary Dependencies**: `apps/api` — Express, Prisma (SQLite), Zod, `express-rate-limit`, `helmet`;
this feature adds one new dependency, `cors` (Express CORS middleware), to fix defect #2. `apps/web` —
unchanged (shadcn/ui, `react-hook-form` + `@hookform/resolvers/zod`, `sonner`); `packages/shared`'s
`event-form-schema.ts` gets a one-line rule change, no new dependency.

**Storage**: SQLite via Prisma (`apps/api/prisma/schema.prisma`). No schema/migration change — the
`@@unique([eventId, attendeeId])` constraint on `Registration` is kept as-is; defect #1 is fixed by
changing *how* the service uses the existing row (reactivate in place) rather than the constraint
itself, since the constraint correctly still needs to prevent two concurrent active rows for the same
attendee/event pair.

**Testing**: `apps/api` — Vitest unit tests (`tests/unit/registration.service.test.ts`) and contract
tests (`tests/contract/registrations.api.test.ts`, `tests/contract/events.api.test.ts`) against the
fakes/real test DB already in place; both get new cases for the fixed behaviors (reactivation, CORS
headers present on relevant responses) rather than a new test framework. `apps/web` — still no
automated frontend suite (per `CLAUDE.md`/`004`'s precedent); `quickstart.md` provides the executable
manual validation, now re-run against all five spec.md user stories plus the linked console-error
defect.

**Target Platform**: Same as `004` — `apps/web` on `:3001`, `apps/api` on `:3000`, browser-facing.

**Project Type**: Web application — this feature touches both `apps/api` (registration
service/repository, CORS) and `apps/web` (four separate UI fixes) plus one shared validation rule in
`packages/shared`. No new routes, no new entities.

**Performance Goals**: No new performance budget; defect #2's fix (CORS) removes work that was
previously wasted (every "My Registrations" entry doing a doomed fetch that always failed), which is
a strict improvement, not a new target.

**Constraints**: Must not change `apps/api`'s existing response wire-shapes (`openapi.yaml` from
`001-event-registration-api` is unchanged — only new response *headers* are added for CORS, and only
for cross-origin requests). Must not weaken the duplicate-active-registration protection (FR-002,
acceptance scenario 3). Must not open `apps/api` to arbitrary origins — CORS is scoped to the
configured web app origin(s), consistent with `apps/api` having no auth and therefore needing to stay
deliberate about what it exposes cross-origin (Delivery Standards: "security and input validation are
mandatory for all externally reachable routes").

**Scale/Scope**: Six targeted defects, five files in `apps/api` (schema untouched;
`registration.repository.ts`, `registration.service.ts`, `app.ts`, `config/env.ts`,
`config/abuse-policy.ts` or a new small `config/cors-policy.ts`) + one new dependency, four files in
`apps/web` (`app/layout.tsx`, `app/(dashboard)/events/[eventId]/page.tsx`,
`app/(dashboard)/events/[eventId]/registration-panel.tsx`,
`components/dashboard/my-registrations-list.tsx`, `components/dashboard/my-registration-list-item.tsx`)
+ one file in `packages/shared` (`event-form-schema.ts`). No new routes, components, or dependencies
beyond `cors`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Pre-Phase 0 Gate Check:

- **Code Quality First**: PASS — every fix is a small, localized change to the module that already
  owns the behavior (repository/service for #1, `app.ts`/config for #2, the existing page/component
  for #3/#4/#6, the existing shared schema for #5). No new abstractions, no dead code left behind (the
  now-unreachable "reactivate never happens, so falls through to create" path is removed, not
  duplicated alongside the old one).
- **Functional Correctness**: PASS — this is the entire point of the feature. Each fix traces to a
  specific FR/acceptance scenario in `spec.md`, and none of the fixes changes behavior FR-002 (still
  reject duplicate *active* registrations), the OpenAPI response shape, or currently-passing tests are
  meant to change without an updated, still-passing test.
- **User Experience by Contract**: PASS — `contracts/api-contract-delta.md` and
  `contracts/ui-contract-delta.md` fix exactly what changes (new CORS headers; the My-Registrations
  fetch's three-state result instead of a collapsed boolean; the not-found page's HTTP status). Error
  codes/response shapes are otherwise unchanged, keeping the contract `001`/`004` already established
  intact.
- **Efficient Data and API Interaction**: PASS — defect #2's fix removes wasted, always-failing
  network calls (every My Registrations entry was fetching and then discarding the response); no new
  over-fetching is introduced. CORS is scoped to configured origins rather than `*`, and to the
  methods `apps/api` actually exposes, not a blanket allow-all.
- **Delivery Standards**: PASS — the new `CORS_ALLOWED_ORIGINS` env var is validated by `env.ts`'s
  existing Zod schema (same pattern as every other config value) and documented; no new secret or
  credential is introduced. Structured logging (`shared/logger.ts`) is unaffected; no new externally
  reachable route is added, so no new input-validation surface is created.

Post-Phase 1 Gate Check:

- PASS — `research.md` records the confirmed root cause and chosen fix for all six defects (each
  reproduced live before being fixed, not assumed), `data-model.md` documents the one intentional
  behavior change (`Registration.status` gains a `CANCELLED → ACTIVE` transition, amending
  `004-event-registration-portal/data-model.md`'s prior "no such transition" note — an explicitly
  documented and justified change per the Functional Correctness principle), and both contract deltas
  are scoped to exactly the six defects with no incidental scope creep. No Complexity Tracking entries
  are needed — every fix stays inside the module that already owned the behavior.

## Project Structure

### Documentation (this feature)

```text
specs/006-fix-registration-bugs/
├── plan.md                        # This file (/speckit-plan command output)
├── research.md                    # Phase 0 output (/speckit-plan command)
├── data-model.md                  # Phase 1 output (/speckit-plan command)
├── quickstart.md                  # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── api-contract-delta.md      # Phase 1 output (/speckit-plan command)
│   └── ui-contract-delta.md       # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md            # /speckit-specify output
└── tasks.md                       # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/api/
├── src/
│   ├── app.ts                                  # edited: mount CORS middleware (defect #2)
│   ├── config/
│   │   ├── env.ts                              # edited: add CORS_ALLOWED_ORIGINS
│   │   └── cors-policy.ts                      # new: derives allowed-origins list from env,
│   │                                            #   mirrors abuse-policy.ts's pattern
│   └── modules/registrations/
│       ├── registration.repository.ts          # edited: add findRegistrationByEventAndAttendee
│       │                                        #   + reactivateRegistration (defect #1)
│       └── registration.service.ts             # edited: reactivate-or-create branch (defect #1)
├── package.json                                 # edited: add `cors` + `@types/cors`
└── tests/
    ├── unit/registration.service.test.ts        # edited: reactivation cases
    └── contract/registrations.api.test.ts       # edited: cancel→re-register case; CORS header case

apps/web/
└── src/
    ├── app/
    │   └── layout.tsx                                        # edited: portal metadata (defect #4)
    └── (dashboard)/events/[eventId]/
        ├── page.tsx                                           # edited: call notFound() (defect #3)
        ├── not-found.tsx                                      # new: not-found card w/ w-full, styled
        │                                                       #   consistent with the site (defect #3)
        └── registration-panel.tsx                             # edited: fixed getServerSnapshot (defect #6)
    components/dashboard/
    ├── my-registrations-list.tsx                              # edited: fixed getServerSnapshot (defect #6)
    │                                                           #   + tri-state fetch result (defect #2)
    └── my-registration-list-item.tsx                          # edited: consume tri-state liveEvent (defect #2)

packages/shared/
└── src/
    └── event-form-schema.ts                     # edited: required-before-url check on imageUrl (defect #5)
```

**Structure Decision**: No new routes, components, or workspaces. Every change lands inside a file
that already owns the relevant behavior — `apps/api`'s registration module and a new small CORS
config module, `apps/web`'s existing event-detail/my-registrations surfaces from `004`, and
`packages/shared`'s existing form-schema module. The only structurally new file is
`apps/api/src/config/cors-policy.ts`, added because `apps/api/CLAUDE.md`'s convention ("never read
`process.env` directly outside `env.ts`," policy objects derived in `config/`) already has a precedent
(`abuse-policy.ts`) for exactly this shape of small derived-policy module.

## Complexity Tracking

*No entries — no Constitution Check violation requires justification. Every fix is the minimal,
in-place change to existing, already-owning code.*
