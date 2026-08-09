# Quickstart: Event Registration Portal

Manual validation scenarios for this feature (serves as the executable acceptance validation — see
`research.md` #9 on why `apps/web` has no automated test suite yet).

## Prerequisites

```bash
pnpm install
pnpm --filter @event-management/api run prisma:generate
pnpm --filter @event-management/api run prisma:migrate:dev   # if not already applied
pnpm --filter @event-management/api run prisma:db:seed              # seed sample events (mix of upcoming/full/past recommended)
```

Ensure `apps/web/.env` has both `API_BASE_URL` and the new `NEXT_PUBLIC_API_BASE_URL` set to the same
value (e.g. `http://localhost:3000`) per `plan.md`'s Project Structure.

## Run

```bash
pnpm dev   # api on :3000, web on :3001, in parallel
```

Navigate to `http://localhost:3001/events`.

## Validation scenarios

Each scenario references the functional requirement(s)/success criteria it validates. Use a fresh
browser profile or clear `localStorage` between scenarios that depend on "no prior registrations on
this device."

### 1. Empty state (edge cases)

1. Ensure no events exist (fresh DB).
2. Load `/events`.
3. **Expect**: a clear empty-state message, no broken grid.

### 2. Browse events (FR-001, FR-003, SC-001)

1. Seed a mix: an upcoming event with open capacity, an upcoming full event, and a past event.
2. Load `/events`.
3. **Expect**: each card shows title, date, location, category, price, and availability; the full
   event is clearly marked "Full"; the past event is clearly marked "Past" and visually recedes
   (reduced opacity); finding a specific open event takes under 30 seconds.

### 3. View event detail (FR-002)

1. From `/events`, select an open event.
2. **Expect**: the detail page shows the full description in addition to the summary fields already
   seen on the card.

### 4. Register — happy path (FR-005, FR-006, SC-002, SC-005)

1. On an open event's detail page, fill in name and a valid email, submit.
2. **Expect**: an inline success confirmation appears, a toast confirms registration, the displayed
   remaining availability decreases by one immediately, and the whole flow (select event → confirmed)
   takes under 1 minute.

### 5. Already registered on this device (FR-007)

1. Immediately after scenario 4, revisit the same event's detail page.
2. **Expect**: instead of the registration form, the page shows the existing registration status and
   a cancel option; submitting a second registration is not possible from this screen.

### 6. Registration validation errors (FR-006)

1. On an open event's detail page, submit with an empty name and an invalid email (e.g. `not-an-email`).
2. **Expect**: submission is blocked; each invalid field shows its own actionable message; no
   registration is created.

### 7. Full event blocks registration (FR-004, edge case: capacity reached mid-view)

1. Register attendees (via the portal or `POST /events/:eventId/registrations` directly) until an
   event reaches `maxCapacity`.
2. Load that event's detail page (or keep it open across the last registration).
3. **Expect**: registration is disabled with a clear "this event is full" message; attempting to
   submit anyway (e.g. via a stale open form) surfaces the API's `409` message verbatim.

### 8. Past event blocks registration (FR-004)

1. Load a past event's detail page.
2. **Expect**: registration is disabled with a clear "this event has already happened" style message.

### 9. Duplicate registration from a second device/browser (FR-007, edge case: double-submit)

1. Register for an event using one browser profile.
2. Using a different browser/profile (or after clearing `localStorage`), submit a registration with
   the **same email** for the same event.
3. **Expect**: the server rejects the second registration with a clear "already registered" message
   (`409`) rather than creating a duplicate or showing a generic error.

### 10. My registrations — empty state (FR-010)

1. In a fresh browser profile (no local registrations), open `/my-registrations`.
2. **Expect**: a clear empty-state message explaining none were found on this device.

### 11. My registrations — view and cancel (FR-009, FR-011, FR-012, SC-004)

1. Register for an event (scenario 4), then open `/my-registrations`.
2. **Expect**: the event appears with its status and a cancel option, locatable in under 30 seconds
   without re-entering any event details.
3. Cancel it.
4. **Expect**: a confirmation appears, the item is marked cancelled (or removed from the active list,
   per implementation), and the event's displayed remaining availability increases by one on
   `/events`/the detail page.

### 12. Cancelling an already-cancelled registration (FR-013, edge case: cancelled in another tab)

1. Register for an event, then open the same event/registration in two tabs.
2. Cancel it from tab A.
3. In tab B, attempt to cancel the same registration again.
4. **Expect**: a clear "already cancelled" message rather than a generic error, and tab B's local
   state syncs to cancelled rather than continuing to offer a cancel action that will always fail.

### 13. Cancelling a past event's registration (edge case)

1. Register for an event, then let it pass (or seed one already in the past with an active
   registration tied to your device).
2. Cancel it from `/my-registrations`.
3. **Expect**: cancellation succeeds; it is not blocked just because the event date has passed.

### 14. Registering for a deleted event (edge case)

1. Open an event's detail page.
2. In a separate action (e.g. `curl -X DELETE http://localhost:3000/events/<id>`), delete that event.
3. Submit the registration form.
4. **Expect**: a clear "event not found / no longer available" message, not a broken form or generic
   error.

### 15. Backend unreachable (edge case)

1. Stop the API server while the web app keeps running.
2. Load `/events`, then attempt to load an event detail page.
3. **Expect**: a clear loading state followed by a clear, retry-capable error message — not a blank or
   broken page.

## Notes

- All scenarios assume no authentication, reachable directly at the URLs above.
- Scenario 9 depends on being able to submit the same `attendeeRef` (email) from two separate
  `localStorage` contexts, since duplicate-detection lives on the server, not the client.
- Scenarios 10–13 depend on `localStorage` state; use your browser's dev tools (Application →
  Local Storage → key `event-portal:my-registrations:v1`) to inspect or reset it directly if needed.
