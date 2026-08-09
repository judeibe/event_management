# Feature Specification: Admin Event Management UI

**Feature Branch**: `003-admin-event-management-ui`

**Created**: 2026-08-07

**Status**: Draft

**Input**: User description: "Create the UI for an Admin to Add, Update and Delete Events."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a New Event (Priority: P1)

An admin needs to publish a new event so it becomes available for attendees to register for. The admin fills out a form with the event's details (title, description, date, location, category, price, capacity, image) and submits it, creating the event.

**Why this priority**: Without the ability to create events, there is nothing to manage, update, or register for. This is the foundational capability the rest of the feature builds on.

**Independent Test**: Can be fully tested by opening the "Add Event" form, entering valid details for every required field, submitting, and confirming the new event appears in the events list with the entered details.

**Acceptance Scenarios**:

1. **Given** the admin is on the events management screen, **When** they choose to add a new event and submit the form with all required fields filled in validly, **Then** the event is created and appears in the events list with a success confirmation.
2. **Given** the admin is filling out the add-event form, **When** they leave a required field empty (or enter an invalid value, e.g. a negative capacity) and attempt to submit, **Then** the system blocks submission and shows a clear, field-level error explaining what needs to be corrected.
3. **Given** the admin is filling out the add-event form, **When** they set an event date in the past, **Then** the system shows a validation error and does not create the event.

---

### User Story 2 - Update an Existing Event (Priority: P2)

An admin needs to correct or change details of an event already published (e.g. new location, updated description, price change, revised capacity) before or after it has attendees.

**Why this priority**: Event details commonly change after creation (venue changes, capacity adjustments). This is the second most common admin action after creation and is essential for keeping published information accurate.

**Independent Test**: Can be fully tested by selecting an existing event, editing one or more fields, saving, and confirming the events list and detail view reflect the updated values.

**Acceptance Scenarios**:

1. **Given** an existing event is displayed in the events list, **When** the admin selects it for editing, **Then** a form pre-filled with that event's current details is shown.
2. **Given** the admin has changed one or more fields on the edit form, **When** they save the changes, **Then** the event is updated and the events list/detail view reflects the new values with a success confirmation.
3. **Given** the admin attempts to reduce an event's maximum capacity below the number of attendees already registered, **When** they submit the change, **Then** the system blocks the update and explains that capacity cannot go below current registrations.
4. **Given** the admin is editing an event, **When** they enter an invalid value (e.g. empty title, negative price, past event date), **Then** the system blocks submission and shows a clear, field-level error.

---

### User Story 3 - Delete an Event (Priority: P3)

An admin needs to remove an event that was created in error, cancelled, or is no longer relevant, so it no longer appears as available.

**Why this priority**: Deletion is a less frequent but still necessary action for keeping the event catalog clean; it depends on events already existing (P1) and is lower-risk to defer relative to create/update.

**Independent Test**: Can be fully tested by selecting an existing event for deletion, confirming the action, and verifying the event no longer appears in the events list.

**Acceptance Scenarios**:

1. **Given** an existing event is displayed in the events list, **When** the admin chooses to delete it and confirms the action, **Then** the event is removed and no longer appears in the events list, with a success confirmation shown.
2. **Given** the admin chooses to delete an event, **When** the confirmation prompt is shown, **Then** the admin can cancel the action and the event remains unchanged.
3. **Given** an event has one or more active attendee registrations, **When** the admin attempts to delete it, **Then** the system clearly warns the admin about the existing registrations before allowing them to confirm or cancel.

---

### Edge Cases

- What happens when the admin submits a form (add or edit) while offline or the backend is unreachable? The UI must show a clear error and preserve the admin's entered data so it is not lost.
- What happens when two admins edit the same event concurrently and both save changes? The system should apply the last successful save and not silently corrupt data; the second admin should see the update succeed or receive a clear conflict message on refresh.
- How does the system handle an attempt to open the edit or delete view for an event that was already deleted by another admin? The UI must show a clear "event not found" message rather than a broken screen.
- What happens when the admin uploads or references an image URL that is invalid or unreachable? The event list/detail should show a graceful fallback placeholder instead of a broken image.
- What happens when the events list is empty (no events exist yet)? The UI must show an empty state that guides the admin to add the first event.
- How does the system handle a very large number of events in the list? The list must remain usable (e.g. via pagination or scrolling) rather than loading all events at once in a way that degrades usability.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an admin-facing view that lists all existing events, showing at minimum each event's title, date, location, category, and current registration count relative to capacity.
- **FR-002**: The system MUST provide a form for creating a new event, capturing: title, description, event date, location, category, price, maximum capacity, and an image reference.
- **FR-003**: The system MUST validate all event fields before submission (create and edit), including: required fields are non-empty, event date is not in the past, price is zero or positive, and maximum capacity is a positive integer.
- **FR-004**: The system MUST show clear, actionable, field-level validation error messages when a create or edit submission is invalid, without discarding the admin's other entered values.
- **FR-005**: Upon successful creation, the system MUST add the new event to the events list and confirm success to the admin.
- **FR-006**: The system MUST provide a way for the admin to select an existing event and view/edit its full details in a form pre-populated with its current values.
- **FR-007**: Upon successful update, the system MUST persist the changes, reflect them in the events list/detail view, and confirm success to the admin.
- **FR-008**: The system MUST prevent an admin from reducing an event's maximum capacity below its current number of active registrations, and MUST explain why the update was rejected.
- **FR-009**: The system MUST provide a way for the admin to delete an existing event.
- **FR-010**: The system MUST require the admin to explicitly confirm a deletion before it is carried out, and MUST allow the admin to cancel out of the confirmation without any change.
- **FR-011**: When an event being deleted has existing active attendee registrations, the system MUST warn the admin of that fact as part of the confirmation step before the deletion proceeds.
- **FR-012**: Upon successful deletion, the system MUST remove the event from the events list and confirm success to the admin.
- **FR-013**: The system MUST surface errors returned by the backend (e.g. validation failures, conflicts, not-found, server errors) to the admin in plain language rather than raw technical error output.
- **FR-014**: The system MUST show a loading indicator during create, update, delete, and list-fetch operations so the admin knows an action is in progress.
- **FR-015**: The system MUST show an empty state on the events list when no events exist, with a clear call to action to add the first event.
- **FR-016**: This feature is admin-facing UI only; the system MUST NOT introduce any authentication/authorization gating, consistent with authentication being explicitly out of scope for the project at this stage. The admin event management screens are reachable by anyone with the URL and may be linked from the site's main navigation alongside attendee-facing pages.

### Key Entities *(include if feature involves data)*

- **Event**: The core entity managed by this feature. Represents a schedulable happening attendees can register for. Key attributes: title, description, event date/time, location, category, price, maximum capacity, current registration count (read-only, system-maintained), image.
- **Registration** (referenced, not managed by this feature): Existing attendee sign-ups tied to an event; relevant here only because active registration counts constrain capacity edits (FR-008) and inform the deletion warning (FR-011).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can create a new, fully-detailed event in under 2 minutes from opening the add-event form to seeing it confirmed in the events list.
- **SC-002**: An admin can locate an existing event and save an update to it in under 90 seconds.
- **SC-003**: 100% of invalid form submissions (missing required fields, past dates, negative price/capacity, over-reduction of capacity) are caught before reaching the backend or are clearly reported back to the admin, with zero silent failures.
- **SC-004**: 100% of deletions of events with active registrations require an explicit, informed confirmation step — no accidental deletions of events with existing attendees.
- **SC-005**: The events list remains usable (renders and responds to interaction) with at least 200 events present.
- **SC-006**: 95% of admins in usability testing can successfully add, edit, and delete an event on their first attempt without external help.

## Assumptions

- The admin role is not authenticated or distinguished from other users at this stage, consistent with the project's explicit "no auth/authz" scope for the API; this UI is assumed to live at an admin-oriented route within `apps/web` but is not gated behind a login.
- "Image" for an event is captured as a URL/reference (matching the API's `imageUrl` field) rather than a file upload, since there is no file storage service described in the project.
- Event categories are free-form or drawn from a small fixed set already established by existing event data; no separate category-management feature is in scope here.
- Deleting an event is a hard delete matching current backend behavior; there is no separate "archive" or "soft cancel" concept in scope for this UI.
- Currency for price is a single, implicit unit consistent with existing event data; multi-currency support is out of scope.
- Pagination/scroll behavior for large event lists follows standard list UX patterns; the exact mechanism (pagination controls vs. infinite scroll) is an implementation decision left to planning, not a product requirement.
