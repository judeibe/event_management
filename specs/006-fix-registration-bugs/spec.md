# Feature Specification: Registration Portal Bug Fixes

**Feature Branch**: `006-fix-registration-bugs`

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "Fix bugs found during a full manual QA pass of the event registration portal: (1) cancelling a registration permanently blocks re-registering for the same event, (2) My Registrations always shows active registrations as 'no longer available' even when the event still exists, (3) an invalid event link shows an unreadable, clipped error card and returns a success status instead of not-found, (4) every page shows the default starter-template browser tab title, (5) the admin event form's Image URL field shows a misleading validation message when left empty. A related defect causes a one-time console error when opening an event page you're already registered for."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Re-registering after cancelling (Priority: P1)

An attendee registers for an event, later cancels that registration, and then decides they want to attend after all. They try to register again with the same details and expect it to work exactly like a first-time registration, since they no longer hold a spot.

**Why this priority**: This blocks a core, expected use of the product — cancelling should free up the ability to sign up again, not lock the attendee out permanently. It silently produces a confusing "already registered" error for someone who is, from their own point of view, not registered at all. This is the highest-impact defect: it makes cancel-then-rejoin, one of the most natural flows in an RSVP system, permanently impossible for the affected person.

**Independent Test**: Register for an event, cancel the registration, then submit the registration form again with the same name/email for the same event. The registration should succeed and the attendee should see the normal "you're registered" confirmation.

**Acceptance Scenarios**:

1. **Given** an attendee has an active registration for an event, **When** they cancel it, **Then** the event's available-spots count increases and they see the normal "register for this event" option again.
2. **Given** an attendee previously cancelled their registration for an event, **When** they submit the registration form again with the same details, **Then** the registration succeeds and they see the "you're registered" confirmation, not an "already registered" error.
3. **Given** an attendee currently has an active (not cancelled) registration for an event, **When** they attempt to register again for that same event, **Then** the system still correctly rejects the duplicate attempt with an "already registered" message (this protection must not be removed, only the incorrect case above).
4. **Given** an attendee revisits the detail page of an event they are currently registered for, **When** the page loads, **Then** it displays their registration status correctly and without any error being logged.

---

### User Story 2 - My Registrations reflects real event status (Priority: P2)

An attendee who has registered for one or more events visits "My Registrations" to review or manage their sign-ups. They expect to see their active registrations with accurate, current information about each event (or a clear "cancel" option), not an incorrect warning suggesting the event no longer exists.

**Why this priority**: This is the second-most damaging defect because it misinforms attendees about the state of events they're signed up for and offers a destructive "remove" action in place of the correct "cancel registration" action — right on the page whose entire purpose is to be a trustworthy, accurate summary of the attendee's commitments.

**Independent Test**: Register for an active, non-full, upcoming event, then open "My Registrations." The registration should show as active with correct event details and a working "cancel registration" action — not a "no longer available" warning.

**Acceptance Scenarios**:

1. **Given** an attendee has an active registration for an event that still exists and has open capacity, **When** they open "My Registrations," **Then** that entry shows as active with accurate event details (date, location) and a "cancel registration" action.
2. **Given** an event referenced by one of the attendee's registrations has genuinely been removed, **When** they open "My Registrations," **Then** that entry (and only that entry) shows a "no longer available" state with a way to remove the stale entry.
3. **Given** the attendee's device has no connectivity to refresh live event details, **When** "My Registrations" loads, **Then** it does not misreport a reachable event as deleted; it falls back to the last-known details instead.

---

### User Story 3 - Clear handling of invalid event links (Priority: P3)

A visitor follows an old, mistyped, or otherwise invalid link to an event that doesn't exist. They expect a clearly readable message explaining the event can't be found, laid out like the rest of the site, and expect the underlying page to correctly report itself as not found (so it behaves correctly for bookmarking, sharing, search engines, and any tooling that checks page status).

**Why this priority**: This is a correctness and usability defect on an edge case (an invalid link), lower impact than the two defects above which affect core registration flows for real, valid events, but still user-visible and easy to hit.

**Independent Test**: Visit an event detail link using an event identifier that doesn't exist. The page should show a clearly readable "event not found" message, properly laid out and legible, and the page should be identifiable as a not-found page rather than a normal successful page.

**Acceptance Scenarios**:

1. **Given** a visitor opens a link to an event identifier that doesn't exist, **When** the page loads, **Then** it shows a fully readable "event not found" message, correctly sized and styled consistent with the rest of the site (no clipped or overlapping text).
2. **Given** the same invalid link, **When** the page is requested, **Then** the page correctly reports itself as not found rather than as a normal successful page.

---

### User Story 4 - Browser tab reflects the actual product (Priority: P4)

A user with several browser tabs open wants to identify the event registration portal by its tab title, rather than seeing an unrelated, generic starter-template title.

**Why this priority**: Minor polish issue; doesn't block or corrupt any workflow, but looks unfinished and makes the tab hard to identify among others.

**Independent Test**: Open any page in the portal and check the browser tab title — it should reflect the product, not a generic scaffold name.

**Acceptance Scenarios**:

1. **Given** a user opens any page in the portal, **When** they look at the browser tab, **Then** the title identifies the event registration portal rather than a generic placeholder.

---

### User Story 5 - Accurate required-field messaging on the event form (Priority: P5)

An event organizer filling out the "Add Event" or "Edit Event" form leaves the Image URL field blank and expects the same kind of "this field is required" message they see for every other required field, so they immediately understand what to do.

**Why this priority**: Smallest-impact defect — the field is still (correctly) blocked from being left empty, only the wording of the message is misleading; organizers can still figure out what's needed.

**Independent Test**: Open the "Add Event" form, leave the Image URL field empty, and attempt to submit. The message shown should say the field is required, matching the phrasing used for the other required fields.

**Acceptance Scenarios**:

1. **Given** an organizer leaves the Image URL field empty on the "Add Event" or "Edit Event" form, **When** they attempt to submit, **Then** the message shown says the field is required, consistent in wording with the other required-field messages.
2. **Given** an organizer enters a non-empty value that isn't a valid URL, **When** they attempt to submit, **Then** the message still correctly tells them to enter a valid image URL.

---

### Edge Cases

- Cancelling and re-registering for the same event more than once (cancel → re-register → cancel → re-register again) must keep working every time, not just the first time.
- A registration cancelled long ago must not block re-registration any differently than one cancelled moments ago.
- "My Registrations" must still correctly show an entry as unavailable when the event has genuinely been deleted (User Story 2, Scenario 2) — the fix must not mask real deletions.
- An event detail page for an ID that is syntactically odd (very long, special characters) must be handled the same as any other not-found ID, without crashing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow an attendee to successfully register for an event using the same identifying details (e.g. email) as a previous registration for that same event, when that previous registration has been cancelled.
- **FR-002**: The system MUST continue to reject a new registration attempt as a duplicate when the attendee already holds an active (non-cancelled) registration for that event.
- **FR-003**: Event detail pages MUST correctly and consistently reflect an attendee's current registration status for that event on every page load, without producing an error.
- **FR-004**: The "My Registrations" view MUST correctly display an attendee's active registrations with up-to-date event details whenever the event data is actually reachable.
- **FR-005**: The "My Registrations" view MUST only mark a registration's event as "no longer available" when the event has genuinely been removed, never merely because event details could not be fetched.
- **FR-006**: An event detail page for an event identifier that does not exist MUST display its "not found" message fully readable, without clipped, overlapping, or truncated text.
- **FR-007**: An event detail page for an event identifier that does not exist MUST report itself as not found rather than as a normal successful page load.
- **FR-008**: Every page in the portal MUST display a browser tab title that identifies the event registration portal rather than a generic template placeholder.
- **FR-009**: The "Add Event" / "Edit Event" form MUST show a "this field is required" message (matching the phrasing of the form's other required-field messages) when the Image URL field is left empty on submit.
- **FR-010**: The "Add Event" / "Edit Event" form MUST continue to show an "enter a valid image URL" message when a non-empty value that is not a valid URL is submitted.

### Key Entities

- **Registration**: Represents an attendee's sign-up for an event; has a status (active or cancelled) and belongs to exactly one attendee and one event. This feature changes how re-use of a previously-cancelled registration for the same attendee/event pair is handled, not the entity's shape.
- **Event**: The event being registered for; unaffected in shape, but this feature changes how the portal responds when an event referenced by a registration can't be confirmed to still exist.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of cancel-then-re-register attempts (same attendee, same event) succeed, with zero false "already registered" errors.
- **SC-002**: 100% of "My Registrations" entries for events that are actually still active and reachable display as active (not "no longer available").
- **SC-003**: Visiting an invalid event link results in a fully readable not-found message in 100% of cases, with the underlying page correctly identified as not found.
- **SC-004**: 100% of portal pages display a tab title identifying the product rather than the generic starter-template name.
- **SC-005**: An automated end-to-end check (browser-based, covering the scenarios above) passes with zero unexpected errors before this fix is considered complete.

## Assumptions

- The two high-priority defects (User Stories 1 and 2) share the same underlying attendee-registration-state code path; fixing them together in one effort is expected to be more efficient than sequencing them across separate releases, but each is independently testable and shippable per its own acceptance scenarios above.
- "Genuinely removed" events (User Story 2, Scenario 2) refers to events that return a definitive not-found response, as distinct from any transient failure to reach the event data; the fix must be able to tell these two situations apart.
- No visual design beyond making the not-found message fully readable and consistent with the rest of the site (User Story 3) is in scope — no new illustrations or content are required.
- The browser tab title (User Story 4) only needs a single, portal-wide identifying title; distinct per-page titles are not required by this fix.
- These are corrections to existing, already-specified behavior (event registration, cancellation, and the admin event form all have prior specs); this feature does not change what those flows are supposed to do, only corrects where current behavior diverges from it.
