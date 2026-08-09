# Quickstart: Admin Event Management UI

Manual validation scenarios for this feature (serves as the executable acceptance validation — see
`research.md` #7 on why `apps/web` has no automated test suite yet).

## Prerequisites

```bash
pnpm install
pnpm --filter @event-management/api run prisma:generate
pnpm --filter @event-management/api run prisma:migrate:dev   # if not already applied
pnpm --filter @event-management/api run db:seed              # optional: seed sample events
```

## Run

```bash
pnpm dev   # api on :3000, web on :3001, in parallel
```

Navigate to `http://localhost:3001/admin/events`.

## Validation scenarios

Each scenario references the functional requirement(s) it validates.

### 1. Empty state (FR-015)

1. Ensure no events exist (fresh DB, or delete all via the UI).
2. Load `/admin/events`.
3. **Expect**: an empty-state message with a clear "Add Event" call to action; no broken table/empty
   rows.

### 2. Create an event — happy path (FR-002, FR-005, SC-001)

1. Click "Add Event".
2. Fill in all fields with valid values (future date, non-negative price, positive capacity, valid
   image URL).
3. Submit.
4. **Expect**: dialog closes, success confirmation shown, the new event appears in the table with the
   entered details, and completion (open form → confirmed in list) takes under 2 minutes.

### 3. Create an event — validation errors (FR-003, FR-004, SC-003)

1. Click "Add Event".
2. Leave the title empty, set capacity to `-1`, set the event date to yesterday, submit.
3. **Expect**: submission is blocked; each invalid field shows its own actionable error message; the
   values in other, valid fields are not cleared.

### 4. Update an event — happy path (FR-006, FR-007, SC-002)

1. Pick an existing event's row action → "Edit".
2. **Expect**: the form opens pre-filled with that event's current values.
3. Change the location and price, save.
4. **Expect**: dialog closes, success confirmation shown, the table reflects the new location/price,
   and the whole flow (select → save) takes under 90 seconds.

### 5. Update an event — capacity below current registrations (FR-008, SC-003)

1. Pick an event that has at least one active registration (seed data, or register an attendee via the
   API first: `POST /events/:eventId/registrations`).
2. Edit it and set `maxCapacity` below its `currentRegistrations` value.
3. Submit.
4. **Expect**: the update is rejected with a clear message explaining capacity cannot go below current
   registrations; the dialog stays open with the admin's edits intact.

### 6. Delete an event — no registrations (FR-009, FR-010, FR-012)

1. Pick an event with zero active registrations.
2. Row action → "Delete".
3. **Expect**: a confirmation prompt appears (no warning about attendees).
4. Confirm.
5. **Expect**: the event disappears from the table with a success confirmation.

### 7. Delete an event — with active registrations (FR-011, SC-004)

1. Pick an event with at least one active registration.
2. Row action → "Delete".
3. **Expect**: the confirmation prompt explicitly warns that the event has active registrations.
4. Cancel.
5. **Expect**: the event is unchanged and still present.
6. Repeat and confirm this time.
7. **Expect**: the event is deleted.

### 8. Backend unreachable (edge case)

1. Stop the API server (`pnpm --filter @event-management/api dev` process killed) while the web app
   keeps running.
2. Attempt to create or edit an event.
3. **Expect**: a clear error is shown (not a raw stack trace/network error), and the admin's entered
   form values are preserved so they can retry once the API is back.

### 9. Already-deleted event (edge case)

1. Open the edit dialog for an event.
2. In a separate action (e.g. `curl -X DELETE http://localhost:3000/events/<id>`), delete that same
   event before saving.
3. Save the edit.
4. **Expect**: a clear "event no longer exists" message; the list refreshes and no longer shows the
   deleted event.

### 10. Broken image URL (edge case)

1. Create or edit an event with an `imageUrl` pointing to a non-existent resource.
2. **Expect**: the table/detail shows a placeholder image instead of a broken image icon.

### 11. Large list usability (SC-005)

1. Seed or create ~200+ events (`pnpm --filter @event-management/api run db:seed` with an increased
   count, or repeat scenario 2 via script).
2. Load `/admin/events`.
3. **Expect**: the page renders promptly and paginated navigation/interaction remains responsive (no
   multi-second freeze scrolling or paging through the table).

## Notes

- All scenarios assume no authentication (FR-016) — reachable directly at the URLs above.
- Scenarios 5 and 7 depend on `apps/api`'s registration endpoints (spec `001-event-registration-api`)
  to create active registrations; this feature does not manage registrations itself.
