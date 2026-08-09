# Phase 0 Research: Registration Portal Bug Fixes

Each defect below was reproduced live (both apps running via `pnpm dev`) before a root cause was
accepted, not inferred from reading code alone — status codes, DOM measurements, and browser console
output are quoted where they were the deciding evidence.

## 1. Cancel-then-re-register is permanently blocked (FR-001, FR-002; User Story 1)

**Root cause confirmed**: `Registration` has `@@unique([eventId, attendeeId])`
(`apps/api/prisma/schema.prisma:43`) with no `status` component, so exactly one row can ever exist per
attendee/event pair, active or not. `RegistrationService.createRegistrationInTransaction`
(`registration.service.ts:47-97`) correctly checks `findActiveRegistration` and finds none after a
cancel — but then calls `repository.createRegistration(...)`, a plain Prisma `create`
(`registration.repository.ts:107-115`), which throws `P2002` against the surviving *cancelled* row.
The outer `catch` in `createRegistration` (`registration.service.ts:24-36`) treats any `P2002` as
"Attendee is already registered," which is correct for a genuine active duplicate but wrong here.

**Decision**: When no active registration exists, look up *any* registration for that
`(eventId, attendeeId)` pair via the existing unique index (`client.registration.findUnique({ where:
{ eventId_attendeeId: { eventId, attendeeId } } } })`). If one exists (necessarily cancelled, since
the active case was already handled), reactivate it in place (`status: 'ACTIVE', cancelledAt: null`)
instead of inserting a new row. Only insert a new row when no registration of any status exists yet.
This keeps the unique constraint doing its real job — preventing two *concurrent active* rows for the
same pair — while letting the same pair be reused indefinitely across cancel/re-register cycles (spec
Edge Cases: "cancel → re-register → cancel → re-register again ... must keep working every time").

**Rationale**: Requires no migration (the constraint is already correct; only its *consequence* inside
the service was wrong) and touches only the module that owns this behavior. Reusing the existing
compound-unique index for the lookup is O(1), no new index needed.

**Alternatives considered**:
- *Drop the unique constraint / redefine it as `@@unique([eventId, attendeeId, status])` or a partial
  index scoped to `status = 'ACTIVE'`* — would let cancelled history accumulate as separate rows,
  which is closer to a literal audit trail, but requires a migration, and SQLite/Prisma has no native
  partial-unique-index declaration in schema (would need a raw-SQL migration) for real correctness;
  rejected as unnecessary complexity for a bug fix with no requirement for cancellation history.
- *Catch `P2002` in the service and retry as an update* — functionally similar outcome but re-derives
  "is this attendee/event pair already present" from a thrown error instead of an explicit lookup,
  which is harder to read and race-prone in the same ways `findActiveRegistration` already avoids;
  rejected in favor of the explicit lookup-then-branch the surrounding code already uses as its style.
- *Frontend-only fix (retry with a different local key)* — the bug is server-side and 100% reproducible
  independent of any client state; a frontend workaround would not fix the API contract itself and
  would leave any other API consumer broken. Rejected.

**Frontend impact**: none required. `apps/web`'s `addMyRegistration` (`lib/my-registrations.ts:107-111`)
already dedupes by `registrationId` before pushing, so a reactivated row (same `id` as before) simply
replaces the stale local `CANCELLED` entry with the fresh `ACTIVE` one — the existing local-storage
contract already tolerates this. `004-event-registration-portal/data-model.md`'s note "There is no
`CANCELLED → ACTIVE` transition ... since the API has no 'reactivate' operation" is superseded by this
feature (see `data-model.md`).

## 2. "My Registrations" always reports active events as unavailable (FR-004, FR-005; User Story 2)

**Root cause confirmed live**: `apps/api` has no CORS middleware anywhere in `src/app.ts` and no
`cors` dependency in `package.json`. `curl -H "Origin: http://localhost:3001"` against
`GET /events/:id` returns `200` with no `Access-Control-Allow-Origin` header. In the actual browser,
navigating to `/my-registrations` and inspecting network + console showed the request to
`http://localhost:3000/events/:id` reaching the server (confirmed via the API's own structured debug
log: `"Evaluating request against rate limit policy"` + the Prisma query executing) but the browser
reporting the response back to the page as a failure — which `MyRegistrationsList`'s `fetchEvent`
(`my-registrations-list.tsx:18-27`) catches and returns `null` for, identically to a real 404. The
consumer, `MyRegistrationListItem` (`my-registration-list-item.tsx:32`), treats `liveEvent === null`
as `isDeleted` — so *every* entry, regardless of whether the event is alive, shows "No longer
available," matching the reported symptom exactly ("always shows ... even when the event still
exists").

**Decision**: Add scoped CORS support to `apps/api` (new `cors` dependency, mounted in `app.ts`),
restricted to an explicit allow-list of origins read from a new validated env var
(`CORS_ALLOWED_ORIGINS`, comma-separated, default `http://localhost:3001` for local dev — the same
default `apps/web`'s dev server already uses per `CLAUDE.md`). Separately, fix `fetchEvent` to
distinguish three outcomes instead of collapsing two of them: a confirmed `404` (`NOT_FOUND`, genuinely
deleted), any other failure (non-2xx status, network error, CORS failure, timeout — "unreachable,"
unknown state), and success. Only the confirmed-404 case may mark an entry "no longer available";
every other case falls back to the entry's locally-stored `eventSnapshot`, satisfying FR-005 and the
"no connectivity" edge case (User Story 2, Scenario 3) in the same fix.

**Rationale**: The CORS gap is the actual reason every request fails, so it must be fixed for the
feature to work end-to-end (contract tests could only prove the server-side behavior; the bug is
specifically about *browser* consumption, which needed the browser reproduction above to catch — no
server-side test would have caught this). Fixing only the client-side null-collapsing without also
fixing CORS would still show every event as "unreachable" (now correctly *not* marked deleted, but
also never showing live details) — both halves are required. Restricting the origin allow-list (rather
than `*`) matches `apps/api`'s explicit "no auth" posture: with no auth, the API should still not
advertise itself as open to arbitrary cross-origin JS, only to the portal's own frontend.

**Alternatives considered**:
- *Proxy the my-registrations event refresh through a Next.js Route Handler / Server Action instead of
  a direct browser fetch* — would avoid needing CORS at all (server-to-server calls aren't subject to
  it, same as `lib/api-client.ts`'s existing calls), but is a larger architectural change to a pattern
  `004-event-registration-portal/research.md` #6 deliberately chose (direct browser fetch, to avoid
  adding a new Route Handler surface); rejected as disproportionate to a bug fix, though flagged as a
  reasonable follow-up if CORS scope needs to grow later.
- *Wildcard CORS (`origin: '*'`)* — simplest, but conflicts with Delivery Standards' "security ... 
  mandatory for all externally reachable routes" given `apps/api` has zero auth; an explicit allow-list
  costs one env var and closes that gap. Rejected.
- *Only fix the null-collapsing bug, leave CORS unfixed* — would still leave every entry perpetually
  "unreachable"/stuck on the stale snapshot, never showing live capacity/date updates FR-004 requires;
  rejected as an incomplete fix.

## 3. Invalid event link: clipped card + 200 status (FR-006, FR-007; User Story 3)

**Root cause confirmed live, two independent bugs in the same branch**:

- *Clipped/unreadable card*: `EventDetailPage`'s not-found branch wrapper
  (`app/(dashboard)/events/[eventId]/page.tsx:32`) is
  `className="mx-auto mt-12 max-w-md p-4 text-center lg:p-6"` — missing `w-full`, present on the
  success-path wrapper one branch below it (`"mx-auto flex w-full max-w-2xl flex-col gap-4 p-4
  lg:p-6"`, line 49). `SidebarInset`'s `<main>` is a column flex container; a flex item with `mx-auto`
  (auto margins on the cross axis) but no explicit `width`/`w-full` does not stretch to the container's
  width — it shrinks to a small intrinsic size instead. Measured live via computed styles: the
  not-found wrapper rendered at **88px** wide (card content further clipped to ~40px) against a
  1354px-wide `<main>`, while the success-path wrapper (which has `w-full`) correctly rendered at
  **672px** (`max-w-2xl`). This is why the card reads as "unreadable, clipped" — the text isn't
  garbled, the box holding it is a sliver.
- *Wrong status code*: neither this page nor any `not-found.tsx` in this route segment calls Next's
  `notFound()`. Confirmed via `curl -o /dev/null -w '%{http_code}'`: both a well-formed-but-nonexistent
  UUID and a not-a-UUID path return `200` from the Next server, never `404`.

**Decision**: Call Next's `notFound()` (from `next/navigation`) in `page.tsx` when the API result is
not `ok`, for *both* `error.code === 'NOT_FOUND'` (a real 404 from `apps/api`) and any other non-ok
result reachable only via a bad `eventId` — the API's `parseEventId` (`event.controller.ts:8-17`)
rejects non-UUID path params with a `400 VALIDATION_ERROR` before ever reaching the not-found check,
so a "syntactically odd ID" (spec Edge Cases) is a `400`, not a `404`, from `apps/api`. Per that edge
case ("must be handled the same as any other not-found ID, without crashing"), the page treats both as
not-found for display and status-code purposes. Calling `notFound()` **replaces** the inline
render — it throws internally, so no JSX after the call ever renders — which means the current inline
not-found card must move into a new sibling file, `app/(dashboard)/events/[eventId]/not-found.tsx`,
the Next.js-convention boundary `notFound()` renders automatically. That new file is built with the
`w-full` fix from the start (matching the success-path wrapper's proven-correct
`"mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 lg:p-6"` pattern), so both bugs in this branch are
fixed together: the card is legible because its file was never wrong, and the status is 404 because
`notFound()` sets it.

**Rationale**: `notFound()` is the framework-native way to make a Server Component page report itself
as not found (correct status code, correct `<meta name="robots">` treatment, works with
bookmarking/sharing/tooling per FR-007's stated reasons) rather than manually setting response status,
which App Router Server Components don't do directly. Extracting a `not-found.tsx` is not optional
once `notFound()` is used: `apps/web` has no route-segment or root `app/not-found.tsx` today (verified
— none exists anywhere under `apps/web/src/app/`), so calling `notFound()` without adding one would
fall back to Next's generic, unstyled default 404 page, failing FR-006's "styled consistent with the
rest of the site" requirement. Placing the file at the `[eventId]` segment (not a shared/root location)
keeps `SiteHeader` + `Card` markup colocated with the one route that needs this specific copy.

**Alternatives considered**:
- *Only fix the width, leave the 200 status* — addresses the visual half of FR-006 but leaves FR-007
  and SC-003 ("correctly identified as not found") unmet; rejected as incomplete.
- *Keep the inline branch, don't call `notFound()`, manually widen the existing div* — fixes FR-006
  alone (as scenario 7's width bug) but leaves the page permanently returning `200`, since Server
  Component page functions have no other framework-supported way to report a 404; rejected as
  incomplete, same reason as the bullet above.
- *A root `app/not-found.tsx` instead of a route-segment one* — would also catch genuinely unmatched
  URLs (a path Next can't route at all), which is a slightly broader concern than this feature's scope
  (a *valid* route with an *invalid* `eventId`). A root file remains a reasonable future addition, not
  built now; rejected as broader than this defect requires.
- *Show a distinct "invalid link" message for the 400/malformed-ID case vs. "event not found" for the
  404 case* — the spec's edge case explicitly asks for identical handling ("the same as any other
  not-found ID"), so a second message would add complexity the spec doesn't ask for; rejected.

**Implementation-time discovery — the response status stays `200` even with `notFound()` called,
because `loading.tsx` exists for this route**: this route segment (and its parent, `(dashboard)/events/`)
each have a `loading.tsx`. Per Next.js's own documented behavior (`node_modules/next/dist/docs/.../file-conventions/loading.md`,
"Status Codes" section — true generally for App Router streaming, not specific to this Next version),
a segment with `loading.tsx` in its ancestor chain is implicitly wrapped in
`<Suspense fallback={<Loading/>}>`; the async page component suspends at its first `await` (the
`apiClient.get` call here), which starts the response streaming as `200` *before* `notFound()` can
run — "the response headers have already been sent to the client, [so] the status code ... cannot be
updated." Confirmed empirically: removing this segment's own `loading.tsx` did not change the result,
because the *parent* segment's `loading.tsx` (`(dashboard)/events/loading.tsx`, serving the `/events`
grid's loading UX) still wraps the `[eventId]` child and triggers the same early stream.

**Decision (revised)**: Keep both `loading.tsx` files (removing the parent one would regress the
`/events` grid's loading UX for an unrelated route) and accept the resulting **soft 404**: HTTP status
`200`, but with Next's own `<meta name="robots" content="noindex">` tag (confirmed present in the
response) and the dedicated `not-found.tsx` UI — Next's own canonical signal that a page is not found,
used broadly across production Next.js apps for exactly this streaming tradeoff. `curl`-level status
checks and the letter of "any tooling that checks page status" (spec User Story 3's rationale) are only
partially satisfied by this — `noindex` correctly keeps the page out of search results, but a tool that
strictly greps for HTTP `404` would still see `200`.

**Alternatives considered (revised)**:
- *A `proxy` (middleware) pre-check that fetches the event and rewrites/responds 404 before the route
  streams* — the officially-documented way to get a literal 404 status under this constraint. Rejected
  for this feature: it duplicates the exact fetch `page.tsx` already performs (an extra network round
  trip on *every* event-detail request, violating the Efficient Data and API Interaction principle for
  a benefit — a literal status code vs. an already-correct `noindex` soft-404 — that's marginal for a
  human-facing bug fix with no stated SEO/tooling-integration requirement beyond "no clipped/overlapping
  text" and "not indexed as a real page." A disproportionate architecture addition for this feature's
  scope; flagged as a follow-up if a concrete external tool ever requires the literal status.
- *Remove `loading.tsx` from both `[eventId]` and its parent `events/` segment* — would produce a true
  blocking `404`, but regresses the `/events` grid's loading skeleton (an established, working UX from
  `004`) for a defect that has nothing to do with that route; rejected as disproportionate collateral
  damage.

## 4. Generic browser tab title (FR-008; User Story 4)

**Root cause confirmed live**: `apps/web/src/app/layout.tsx:19-22` still exports the
`create-next-app` scaffold's `metadata` object verbatim (`title: "Create Next App"`,
`description: "Generated by create next app"`). Every route inherits this since no route segment
overrides `metadata`/`generateMetadata`. Confirmed via a live tab: title read exactly "Create Next
App" on `/events/[eventId]`.

**Decision**: Replace the root `metadata` with portal-identifying values (e.g. `title: "Event
Registration Portal"` and a short matching `description`). Per spec Assumptions ("a single,
portal-wide identifying title; distinct per-page titles are not required"), no per-route
`generateMetadata` is added — the root layout's static `metadata` is sufficient and is the minimal
fix.

**Rationale**: Root-layout `metadata` is the correct, single place this inherits from for every route
today; no route currently overrides it, so fixing it there satisfies FR-008/SC-004 for 100% of pages
in one change.

**Alternatives considered**:
- *Per-route dynamic titles (e.g. `"${event.title} · Event Portal"` on the detail page)* — nicer, but
  explicitly out of scope per spec Assumptions; noted as a natural follow-up, not built now.

## 5. Misleading Image URL required-message (FR-009, FR-010; User Story 5)

**Root cause confirmed by inspection**: `packages/shared/src/event-form-schema.ts:30`:
`imageUrl: z.string().trim().url('Enter a valid image URL.')`. Every other field uses the
`requiredText` helper (`.min(1, '${label} is required.')`) as its first check
(`event-form-schema.ts:8-9, 17-24`); `imageUrl` skips straight to `.url(...)`, so an empty string
(which fails `.url()`) surfaces "Enter a valid image URL." instead of a required-field message — this
is a direct code-reading confirmation (Zod's `.url()` check on `''` deterministically fails with its
own message; no runtime ambiguity to verify live), consistent with the spec's exact description.

**Decision**: Change the field to
`z.string().trim().min(1, 'Image URL is required.').url('Enter a valid image URL.')`. Zod evaluates
chained string checks in order and stops at the first failure, so an empty value now fails `.min(1,
...)` first ("Image URL is required."), while a non-empty, non-URL value passes `.min(1)` and fails
`.url(...)` ("Enter a valid image URL.") — satisfying FR-009 and FR-010 with one line, no behavior
change for any already-valid input.

**Rationale**: Matches the exact pattern (`requiredText`) already used by every sibling field in the
same schema — no new validation style introduced, and the fix is a single-line, additive change to
`packages/shared`, consumed identically by both the "Add Event" and "Edit Event" forms (they share this
schema via `buildEventFormSchema`), satisfying FR-009's "matching the phrasing of the form's other
required-field messages" for free.

**Alternatives considered**:
- *A custom `.refine()` with conditional messaging* — functionally equivalent but more code than the
  simple `.min(1, ...)` chain Zod already supports natively for this exact "required, then also
  well-formed" shape; rejected as unnecessary.

## 6. One-time console error on revisiting a registered event / opening My Registrations (linked to FR-003; User Story 1, Scenario 4)

**Root cause confirmed live**: reproduced by registering for an event through the UI, then doing a
full navigation (not a client-side `router.refresh()`) back to that event's detail page. The browser
console showed a genuine React hydration-mismatch exception (not a warning) with a diff showing the
server rendered `RegisterForm` ("Register for this event") while the client immediately swapped in
`AlreadyRegisteredCard`. The same exception, with the same shape, also fires on `/my-registrations`
whenever at least one record exists (`MyRegistrationsList`'s empty-state icon vs. list content
diverging the same way) — the description's "when opening an event page you're already registered
for" is the specific repro the spec's author hit, but the underlying defect is not scoped to that one
component.

Both `RegistrationPanel` (`registration-panel.tsx:18-22`) and `MyRegistrationsList`
(`my-registrations-list.tsx:30-34`) call `useSyncExternalStore(subscribe, getSnapshot,
getServerSnapshot)` with **the same closure** passed as both the second (`getSnapshot`, client) and
third (`getServerSnapshot`) arguments — e.g. `() => getMyRegistrationForEvent(event.id)` for both. The
inline comment in `my-registrations.ts` explains the *intent* correctly (every read is
`typeof window === 'undefined'`-guarded so it's "SSR-safe"), but that guard only protects against
literally running in Node — it does not make `getServerSnapshot` return the *server's actual rendered
value* when React invokes it in the browser. React calls `getServerSnapshot()` during the client's
first (hydration) render specifically to reproduce what the server sent, so it can compare against the
real DOM without a mismatch; here, that call happens in the browser, where `window` *is* defined, so it
reads real `localStorage` instead of standing in for "whatever the actual Node process saw" (which was
always "no data," since `window` is genuinely undefined during real SSR). The two diverge exactly when
local storage has a registration the server never saw — precisely the "already registered" scenario.

**Decision**: Change the `getServerSnapshot` argument in both components to a function that
unconditionally returns the same "no data yet" placeholder the real server always produces —
`() => undefined` for `RegistrationPanel` (matching `getMyRegistrationForEvent`'s `undefined`-when-
absent return), and `() => []` for `MyRegistrationsList` (a stable empty array constant, matching
`getMyRegistrations`'s empty-array-when-absent return; the existing `cachedRecords` module-level
constant already provides a stable empty-array reference for exactly this, avoiding a new infinite-
loop risk from allocating a fresh `[]` per call). `getSnapshot` (the client-only argument) is
unchanged — it keeps reading live storage, which is correct and is what re-renders the UI correctly
immediately after hydration completes.

**Rationale**: This is the textbook-correct signature for `useSyncExternalStore` with a browser-only
store (React docs: "if you don't support server rendering, ... `getServerSnapshot" should throw or
return an initial placeholder value"). It fixes the defect with no loss of the "reactive to
localStorage" behavior the component already relies on post-hydration — `getSnapshot` still runs on
every store update via the existing `subscribe`/`notify` pair, so the correct "already registered" UI
still appears, just one tick after hydration instead of (incorrectly) during it.

**Alternatives considered**:
- *`useEffect` + local `mounted` state, dropping `useSyncExternalStore`* — the very anti-pattern this
  code's own comments say the project's lint rule (`react-hooks/set-state-in-effect`) flags; rejected,
  would reintroduce a flagged pattern to fix an unrelated bug.
- *Suppress the warning via `suppressHydrationWarning`* — hides the console error without fixing the
  actual mismatch (the DOM would still flicker from one tree to another on hydration); rejected, it's
  a cosmetic patch over a real correctness bug in the SSR/CSR contract.
