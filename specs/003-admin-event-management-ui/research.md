# Phase 0 Research: Admin Event Management UI

## 1. Rendering & mutation architecture

**Decision**: Server Component for the initial events list fetch (SSR, matches the existing pattern in
`src/app/(dashboard)/events/page.tsx`), paired with Next.js Server Actions (`"use server"`) for
create/update/delete mutations. Mutations call `apps/api` over HTTP the same way the existing page
does, then call `revalidatePath()` for both the admin list and the attendee-facing `/events` list so
both surfaces stay consistent after a change.

**Rationale**: Avoids standing up a client-side data-fetching library (SWR/React Query) for a single
list + three mutations. Server Actions give typed, colocated mutation functions, work with React 19's
`useActionState`/`useTransition` for pending/error state without extra dependencies, and keep the API
base URL server-only (no need to expose it via `NEXT_PUBLIC_*`). This matches the project's existing
"no extra state library" footprint (`apps/web`'s only data dependency today is a raw `fetch` in a
Server Component).

**Alternatives considered**:
- *Client-side fetching (SWR/React Query)* — adds a new dependency and client/server data-sync
  complexity for a low-traffic admin screen; rejected as unnecessary weight.
- *Route Handlers (`app/api/.../route.ts`) proxying to `apps/api`* — adds an indirection layer with no
  behavioral benefit since there's no auth/session to inject and no response shaping needed beyond
  what Server Actions already provide; rejected.

## 2. Form validation

**Decision**: `react-hook-form` + `@hookform/resolvers/zod`, validating against zod schemas that
mirror `apps/api`'s `createEventBodySchema`/`updateEventBodySchema` shape (`event.types.ts`). These
schemas are added to `packages/shared` (a new `event-form-schema.ts`, exported from `index.ts`) rather
than re-declared in `apps/web`, per this repo's stated preference (`CLAUDE.md`: "if apps/web needs
types/schemas that mirror apps/api's zod schemas, consider extracting a `packages/shared`").
`apps/api`'s own schema is left untouched — this is additive to `packages/shared`, not a refactor of
tested backend code, keeping this UI-only feature from touching `apps/api` behavior.

**Rationale**: Field-level, actionable validation errors (FR-004) need a real form library; hand-rolled
`useState` validation for 8 fields (title, description, eventDate, location, category, price,
maxCapacity, imageUrl) becomes unmaintainable. Sharing the zod schema shape (not the literal API
module) avoids the two apps silently drifting on what "valid" means for an event.

**Alternatives considered**:
- *Native HTML validation only* — insufficient for cross-field/business rules (past-date check,
  capacity-vs-registrations) and inconsistent error UX; rejected.
- *Re-declare validation ad hoc in `apps/web`* — duplicates rules that already exist in `apps/api`,
  violating the project's own duplication guidance; rejected.

## 3. Component/UI kit

**Decision**: Extend the already-scaffolded shadcn "base-rhea" kit (`@base-ui/react` primitives,
`components.json` present) rather than introducing a second component library. New primitives needed
beyond what's already installed (`button`, `input`, `progress`, `separator`, `sheet`, `sidebar`,
`skeleton`, `tooltip`): `dialog`, `alert-dialog`, `form`, `select`, `textarea`, `label`, `card`,
`table`, `dropdown-menu`, `badge`, `sonner` (toast). These are added via the `shadcn` CLI already
present as a dependency, so they land pre-wired to the project's existing tokens/style.

**Rationale**: The user explicitly asked for a shadcn/Tailwind-driven UI; the project has already
committed to shadcn's base-rhea style and base-ui primitives (not Radix) — introducing a different kit
or hand-rolled components would visually and structurally fork the design system for no benefit.

**Alternatives considered**:
- *Hand-rolled modals/forms with plain Tailwind* — more code, inconsistent with the existing
  `sheet.tsx`/`sidebar.tsx` patterns already in the codebase; rejected.

## 4. Screen structure: modal-based CRUD vs. separate routes

**Decision**: Single admin screen at `/admin/events` (Server Component) rendering a `Table` of events.
"Add Event" opens a `Dialog` with the create form; each row's overflow menu (`DropdownMenu`) offers
"Edit" (same form component, opened as a `Dialog` pre-filled via props) and "Delete" (`AlertDialog`
confirmation, warning when `currentRegistrations > 0`, per FR-011). No separate `/admin/events/new` or
`/admin/events/[id]/edit` routes.

**Rationale**: The spec's user stories describe actions on "the events management screen" (singular),
not multi-page journeys — SC-001/SC-002 targets (create <2min, edit <90s) favor a no-navigation modal
flow. It also lets the create/edit form be one shared client component (`EventFormDialog`) with a
`mode: "create" | "edit"` prop, reducing duplication.

**Alternatives considered**:
- *Dedicated pages per action* — more consistent with deep-linking/back-button semantics, but adds
  page transitions to every action and duplicates layout chrome; rejected as unnecessary for this
  scope. Deep-linkable routes can be revisited later without changing the API contract.

## 5. List scale handling (SC-005: usable at 200+ events)

**Decision**: `GET /events` (from `apps/api`, spec 001) has no pagination/query parameters and returns
the full list; that contract is out of scope to change here. The admin table paginates **client-side**
over the already-fetched array (fixed page size, e.g. 20 rows), keeping the rendered DOM small
regardless of total event count.

**Rationale**: Satisfies SC-005 (list stays responsive at 200+ events) without a backend contract
change, which would expand this feature beyond "UI for an Admin to Add, Update and Delete Events" into
API redesign. Documented as a Complexity Tracking justification against the constitution's "Efficient
Data and API Interaction" principle.

**Alternatives considered**:
- *Add server-side pagination to `GET /events`* — the "correct" long-term fix, but changes a
  contract-tested endpoint (spec 001's `contracts/openapi.yaml`) and is out of scope for a UI-only
  feature; noted as a follow-up recommendation, not built here.
- *Virtualized list (e.g. windowing library)* — adds a new dependency for a scale (hundreds, not
  thousands, of rows) that plain client-side pagination already handles adequately.

## 6. Image handling (`imageUrl` field)

**Decision**: Render event images with a plain `<img>` tag (not `next/image`), with an `onError`
handler that swaps to a static placeholder graphic.

**Rationale**: `imageUrl` is an arbitrary admin-entered URL (per spec Assumptions: URL reference, not a
file upload). `next/image` requires allow-listing remote hosts via `images.remotePatterns` in
`next.config.ts`, which is unworkable for admin-supplied arbitrary hosts without either disabling
Next's image optimization safety checks or maintaining an ever-growing allowlist. A plain `<img>` with
a graceful fallback satisfies the edge case (invalid/unreachable image → placeholder) without that
config burden.

**Alternatives considered**:
- *`next/image` with `images.remotePatterns: [{ hostname: "**" }]`* — technically works but defeats
  the purpose of the allowlist and is discouraged by Next.js docs for user-controlled URLs; rejected.

## 7. Automated testing for `apps/web`

**Decision**: No new frontend test framework is introduced in this feature. `apps/web` has no test
tooling today (per `CLAUDE.md`: "web has no tests yet"). Acceptance criteria are validated via the
manual, executable scenarios in `quickstart.md` (constitution's "tests **or** executable validation
steps" allowance under Functional Correctness).

**Rationale**: Standing up Vitest + Testing Library (or Playwright) for `apps/web` is a meaningful,
separable investment (test runner config, CI wiring, fixture/mock strategy for Server Actions) that
isn't specific to this feature's scope. Bundling it into this admin-CRUD feature would blur delivery
boundaries.

**Alternatives considered**:
- *Add component tests now* — deferred; flagged as a follow-up recommendation rather than silently
  skipped, so it's visible for future planning.
