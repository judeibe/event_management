# Quickstart: Registration Portal Bug Fixes

Manual validation scenarios for this feature — serves as the executable acceptance validation
(`004-event-registration-portal/research.md` #9: no automated `apps/web` test suite exists yet, so
this is the constitution's "tests **or** executable validation steps" allowance). Every scenario below
was reproduced *before* the fix as part of `research.md`; re-running the same steps after implementing
is what proves the fix, and together they are the SC-005 "automated end-to-end check ... zero
unexpected errors" gate (run manually, browser DevTools console open throughout every scenario).

## Prerequisites

```bash
pnpm install
pnpm --filter @event-management/api run prisma:generate
pnpm --filter @event-management/api run prisma:migrate:dev   # if not already applied
pnpm --filter @event-management/api run prisma:db:seed
```

`apps/web/.env` needs `API_BASE_URL` and `NEXT_PUBLIC_API_BASE_URL` both set (e.g.
`http://localhost:3000`), per `004`'s quickstart. If a new `CORS_ALLOWED_ORIGINS` var is added to
`apps/api/.env`, leave it unset to exercise the documented default (`http://localhost:3001`) — that
default must already match `apps/web`'s dev port.

## Run

```bash
pnpm dev   # api on :3000, web on :3001, in parallel
```

Keep the browser DevTools console open for every scenario — several fixes are specifically about
eliminating a console error, not just changing visible UI.

## Validation scenarios

### 1. Cancel → re-register succeeds (FR-001; User Story 1, Scenario 2) — the P1 fix

1. On an open event's detail page, register with a name/email.
2. Open `/my-registrations`, cancel that registration.
3. Return to the same event's detail page (a full navigation, not just staying on a client-rendered
   state) — it should offer the registration form again, spot count back up by one.
4. Submit the registration form again with the **same name/email**.
5. **Expect**: registration succeeds — the normal "You're registered" confirmation appears, not an
   "already registered" error. No console error either.
6. Repeat steps 2–5 once more (cancel → re-register a second time).
7. **Expect**: still succeeds (spec Edge Cases: must keep working every time, not just the first).

### 2. Active registration still correctly rejects a true duplicate (FR-002; User Story 1, Scenario 3)

1. While actively (not cancelled) registered for an event from scenario 1, submit the registration
   form again for that same event/attendee without cancelling first.
2. **Expect**: rejected with the existing "Attendee is already registered for this event." message —
   this protection must be unchanged by the fix.

### 3. Revisiting a registered event produces no console error (User Story 1, Scenario 4; linked defect)

1. Immediately after registering for an event (scenario 1, step 1), do a full page reload (not a
   client-side navigation) of that same event's detail page.
2. **Expect**: the page correctly shows "You're registered" — and the browser console shows **no**
   hydration-mismatch (or any other) error.

### 4. "My Registrations" shows a live, active event correctly (FR-004; User Story 2, Scenario 1) — the P2 fix

1. Register for an upcoming, non-full event.
2. Open `/my-registrations`.
3. **Expect**: the entry shows as **active**, with accurate current date/location (not just the
   snapshot taken at registration time), and a working "Cancel registration" action — **not** a "No
   longer available" badge. Check the console: no errors.

### 5. "My Registrations" still correctly flags a genuinely deleted event (FR-005; User Story 2, Scenario 2)

1. Register for an event.
2. Delete that event via the admin panel (`/admin/events`) or `DELETE {API_BASE_URL}/events/:id`
   directly.
3. Reload `/my-registrations`.
4. **Expect**: only that entry shows "No longer available," with a "Remove" action for the stale local
   entry — any other, still-live entries on the same page must keep showing as active (not flip to
   unavailable as a side effect).

### 6. "My Registrations" degrades gracefully when the API is unreachable (User Story 2, Scenario 3)

1. Register for an event.
2. Stop `apps/api` (e.g. `Ctrl+C` its dev process) while `apps/web` keeps running.
3. Reload `/my-registrations`.
4. **Expect**: the entry falls back to its last-known snapshot details — it must **not** show "No
   longer available." Restart `apps/api` before continuing to the next scenario.

### 7. Invalid event link — readable message and correct status (FR-006, FR-007; User Story 3) — the P3 fix

1. Visit `/events/00000000-0000-0000-0000-000000000000` (a well-formed but nonexistent event id).
2. **Expect**: a fully readable, normally-sized "Event not found" card (not clipped/squeezed into a
   sliver of the page width) styled consistent with the rest of the site.
3. Check for Next's not-found signal: `curl -s
   http://localhost:3001/events/00000000-0000-0000-0000-000000000000 | grep -o '<meta name="robots"[^>]*>'`
   → **expect** `<meta name="robots" content="noindex"/>` to be present. The wire-level HTTP status
   stays `200` — this route's `loading.tsx` makes Next stream the response before `notFound()` can
   change the status, which is standard Next.js App Router behavior (research.md #3) — but the
   `noindex` tag and the dedicated not-found UI are Next's own canonical "this page is not found"
   signal, and are what this fix actually delivers.

### 8. Syntactically odd event ID — same treatment, no crash (edge case)

1. Visit `/events/not-a-uuid-at-all` and, separately, a very long garbage string.
2. **Expect**: same readable not-found treatment as scenario 7 (including the `noindex` tag), no
   crash, no framework error overlay.

### 9. Browser tab title identifies the portal (FR-008; User Story 4) — the P4 fix

1. Open any route (`/events`, `/events/[eventId]`, `/my-registrations`, `/admin/events`).
2. **Expect**: the browser tab title identifies the event registration portal, not "Create Next App."

### 10. Admin form — empty Image URL shows a required message (FR-009; User Story 5) — the P5 fix

1. Open `/admin/events`, click "Add Event."
2. Leave every field empty (including Image URL) and submit.
3. **Expect**: the Image URL field's error message reads like "Image URL is required." — matching the
   phrasing style of the other empty-field errors (e.g. "Title is required.") — not "Enter a valid
   image URL."

### 11. Admin form — malformed (non-empty) Image URL still shows the URL-format message (FR-010)

1. In the same form, enter a title/description/etc. and put `not-a-url` in Image URL, submit.
2. **Expect**: the Image URL error now reads "Enter a valid image URL." (unchanged from before this
   fix) — this message must still appear for genuinely invalid, non-empty input.

### 12. Regression: `004`'s existing flows still pass

Re-run `004-event-registration-portal/quickstart.md` scenarios 2–3, 6–9, and 12–13 (browse, detail
view, validation errors, full/past-event blocking, second-device duplicate rejection, already-
cancelled-elsewhere sync, past-event cancellation) unmodified — none of this feature's fixes should
change their outcome.

## Automated coverage (`apps/api`)

```bash
cd apps/api
npx vitest run tests/unit/registration.service.test.ts
npx vitest run tests/contract/registrations.api.test.ts
npx vitest run tests/contract/events.api.test.ts
```

**Expect**: all pass, including the new reactivation and CORS-header cases added for this feature
(see `tasks.md` for the specific new test cases).
