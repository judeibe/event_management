# Feature Specification: Event Registration Portal

**Feature Branch**: `004-event-registration-portal`

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "As a user I want to be able to view events, register events, and cancel my registration."

## Clarifications

### Session 2026-08-08

- Q: How should the frontend identify "my" registrations for viewing/cancelling, given there's no auth system? → A: Browser-local storage — after registering, the registration is remembered on the same device/browser so the user can see and cancel it later without logging in. This does not carry across devices or browsers, and clearing browser data loses the list.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Available Events (Priority: P1)

As a visitor, I can view a list of events with enough detail to decide whether to register, so
that I can find events relevant to me before committing to anything.

**Why this priority**: Browsing is the entry point for every other action in this feature — a user
cannot register for or cancel an event they cannot first see. It delivers standalone value (event
discovery) even with no other capability built.

**Independent Test**: Can be fully tested by loading the events list with a mix of upcoming, full,
and past events, and confirming each event's key details and availability status display
correctly with no registration action required.

**Acceptance Scenarios**:

1. **Given** events exist with available capacity, **When** a visitor opens the events list,
   **Then** they see each event's title, date, location, category, price, and remaining
   availability.
2. **Given** an event is at full capacity, **When** a visitor views the events list or the event's
   detail, **Then** the event is clearly marked as full and registration is disabled for it.
3. **Given** an event's date has already passed, **When** a visitor views the events list, **Then**
   the event is clearly marked as past and registration is disabled for it.
4. **Given** a visitor selects an event from the list, **When** the event detail loads, **Then**
   they see the full event description in addition to the summary details shown in the list.

---

### User Story 2 - Register for an Event (Priority: P2)

As a visitor, I can register for an event I'm interested in, so that I reserve a spot and have
confirmation that I'm signed up.

**Why this priority**: Registration is the primary conversion action of the portal and is the
reason the browsing experience (P1) exists, but it depends on P1 being in place first.

**Independent Test**: Can be fully tested by registering for an available event with valid details
and confirming a success confirmation appears and the event's remaining capacity decreases; and by
attempting registration on full or past events and confirming it is blocked.

**Acceptance Scenarios**:

1. **Given** an upcoming event with available capacity, **When** a visitor submits their
   registration details, **Then** they see a confirmation that their registration succeeded and the
   event's displayed availability decreases by one.
2. **Given** a visitor has already registered for an event on this device, **When** they view that
   event again, **Then** they see their existing registration status instead of a registration
   option, and cannot register for it a second time.
3. **Given** an event reaches full capacity while a visitor is viewing it, **When** they attempt to
   submit a registration, **Then** they see a clear message that the event is full and the
   registration is not accepted.
4. **Given** a visitor submits a registration with missing or invalid required details, **When**
   they attempt to submit, **Then** they see a clear validation message and no registration is
   created.

---

### User Story 3 - Cancel a Registration (Priority: P3)

As a visitor who previously registered on this device, I can view my registrations and cancel one,
so that I can free up my spot if my plans change.

**Why this priority**: Cancellation matters for a complete self-service experience but only becomes
relevant after a user has successfully registered (P2), and is used less frequently than browsing
or registering.

**Independent Test**: Can be fully tested by registering for an event on a device, then viewing
"my registrations" on that same device, cancelling one, and confirming it no longer appears as
active and the event's remaining capacity increases by one.

**Acceptance Scenarios**:

1. **Given** a visitor has an active registration remembered on this device, **When** they open
   "my registrations," **Then** they see that event listed with its status and a cancel option.
2. **Given** a visitor cancels an active registration, **When** the cancellation completes,
   **Then** the registration is marked cancelled, it no longer counts toward that event's
   capacity, and the visitor sees a confirmation.
3. **Given** a visitor has no registrations remembered on this device, **When** they open "my
   registrations," **Then** they see a clear empty state explaining none were found on this
   device.
4. **Given** a visitor attempts to cancel a registration that was already cancelled (e.g., in
   another tab), **When** the cancellation request is submitted, **Then** they see a clear message
   that it's already cancelled rather than a generic error.

---

### Edge Cases

- What happens when a visitor's browser storage is cleared or they switch browsers/devices? Their
  remembered registrations are no longer visible to them on the portal, even though the
  registration still exists in the system (see Assumptions).
- What happens when a visitor tries to register for an event that was removed or no longer exists
  (e.g., link shared before deletion)? They see a clear "event not found / no longer available"
  message instead of a broken registration form.
- What happens when a visitor tries to cancel a registration for an event that has already passed?
  Cancellation is still allowed, since the visitor may simply want it off their list; it has no
  effect on the (already closed) event's capacity accounting beyond the standard cancellation
  rules.
- How does the system behave when a visitor double-submits a registration (e.g., double-clicks
  "Register")? Only one active registration is created; the duplicate attempt is rejected with a
  clear "already registered" message rather than a second registration or a generic error.
- What happens when the events list or an event detail is requested while the backend is
  unavailable or slow? The visitor sees a clear loading state and, on failure, a clear error
  message with the ability to retry, rather than a blank or broken page.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a list of events showing, at minimum, title, date, location,
  category, price, and remaining availability for each event.
- **FR-002**: The system MUST allow a visitor to view full details of a single event, including its
  description, in addition to the summary fields shown in the list.
- **FR-003**: The system MUST visually distinguish events that are full (no remaining capacity) and
  events whose date has already passed from events that are open for registration.
- **FR-004**: The system MUST prevent registration submission for events that are full or whose
  date has passed, and MUST explain why registration is unavailable.
- **FR-005**: The system MUST allow a visitor to submit a registration for an open event by
  providing the details the registration process requires, and MUST show a clear success
  confirmation when registration succeeds.
- **FR-006**: The system MUST validate registration input before submission and show clear,
  actionable messages when required details are missing or invalid.
- **FR-007**: The system MUST prevent a visitor from creating a second active registration for an
  event they are already registered for on the same device, and MUST show their existing
  registration status instead.
- **FR-008**: The system MUST remember a visitor's successful registrations on their current
  device/browser (without requiring login) so they can be viewed and managed later on that same
  device.
- **FR-009**: The system MUST provide a "my registrations" view listing the events the visitor is
  remembered as having registered for on the current device, along with each registration's status.
- **FR-010**: The system MUST show a clear empty state in "my registrations" when no registrations
  are remembered on the current device.
- **FR-011**: The system MUST allow a visitor to cancel an active registration from "my
  registrations," and MUST show a clear confirmation once cancellation completes.
- **FR-012**: The system MUST update displayed event availability (remaining capacity) immediately
  after a successful registration or cancellation affecting that event.
- **FR-013**: The system MUST show a clear, specific error message (not a generic failure) when a
  registration or cancellation attempt is rejected because the event is full, has already passed,
  no longer exists, or the registration was already cancelled.
- **FR-014**: The system MUST show a clear loading indicator while events, event details, or
  registration data are being fetched, and a clear retry-capable error state if fetching fails.

### Key Entities

- **Event**: A registerable happening with a title, description, date, location, category, price,
  maximum capacity, and current registration count; visitor-facing availability is derived from
  maximum capacity minus current registrations.
- **Registration**: A record linking a visitor (as an attendee) to an event, with a status
  (active or cancelled) that determines whether it counts toward the event's capacity and whether
  it can still be cancelled.
- **Remembered Registration (device-local)**: A reference the portal keeps in the visitor's
  browser so it can show that visitor "my registrations" and let them cancel, without a login
  system; scoped to one browser on one device.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can find an event and view its full details in under 30 seconds from
  landing on the portal.
- **SC-002**: A visitor can complete a registration for an open event in under 1 minute from
  selecting the event.
- **SC-003**: 95% of registration attempts on open, available events succeed without the visitor
  needing to retry due to unclear errors.
- **SC-004**: A visitor can locate and cancel an existing registration from "my registrations" in
  under 30 seconds, without needing to remember or re-enter any event details.
- **SC-005**: Event availability shown to visitors (open, full, past) is never stale by more than
  one registration/cancellation action — i.e., it reflects the outcome of a visitor's own most
  recent action immediately.
- **SC-006**: 100% of blocked actions (full event, past event, duplicate registration, already
  cancelled) present a specific, understandable reason rather than a generic failure message.

## Assumptions

- The portal is a public, unauthenticated experience consistent with the rest of the system (no
  login, no accounts); "my registrations" means "registrations remembered on this browser/device,"
  not "registrations belonging to a logged-in identity."
- Registrations remembered via device-local storage are a convenience layer only; the underlying
  registration record is still the system's source of truth, so a cleared browser or a different
  device simply means the visitor loses their personal view into registrations they already made —
  it does not delete or invalidate the registration itself.
- Registering requires the visitor to supply the identifying detail(s) the existing registration
  process needs (e.g., name/email); this spec does not change what identifying information is
  collected, only how the portal helps a visitor find their own past registrations afterward.
- Event creation, editing, and removal (the event manager/admin side) are out of scope for this
  feature; it only covers the visitor-facing browse/register/cancel experience.
- Payment collection is out of scope; "price" is treated as a displayed attribute of an event, not
  a transaction this feature processes.
- Standard web accessibility and responsive-layout expectations apply; no specific device/browser
  support matrix was requested, so common modern desktop and mobile browsers are assumed.
