# Data Model: Event and Registration Management

## Entity: Event

**Purpose**: Stores the canonical event record used for listing, updates, and registration gating.

### Fields

- `id` (string/uuid): Unique event identifier.
- `title` (string, required, trimmed): Event display title.
- `description` (string, required): Event details for attendees.
- `eventDate` (datetime, required): Scheduled date/time used for past/future checks.
- `maxCapacity` (integer, required, >0): Maximum allowed active registrations.
- `createdAt` (datetime): Creation timestamp.
- `updatedAt` (datetime): Last modification timestamp.
- `deletedAt` (datetime nullable): Soft-delete marker if delete strategy is reversible; otherwise
  omitted for hard delete.

### Validation Rules

- Title and description must be non-empty after normalization.
- `eventDate` must be a valid datetime.
- `maxCapacity` must be a positive integer.
- Updates reducing capacity below active registrations must be rejected.

### State Transitions

- `active` → `removed` when deleted.
- `active` remains `active` on updates that pass validation.

## Entity: Attendee

**Purpose**: Represents a registrant identity used for uniqueness and unregister actions.

### Fields

- `id` (string/uuid): Internal attendee identifier.
- `externalRef` (string, required, unique): Stable client-provided attendee key for unauthenticated
  flows (for example email or user token surrogate).
- `createdAt` (datetime): Creation timestamp.

### Validation Rules

- `externalRef` must be present and normalized consistently.

## Entity: Registration

**Purpose**: Joins attendees to events and tracks active seat occupancy.

### Fields

- `id` (string/uuid): Unique registration identifier.
- `eventId` (string/uuid, required): References `Event.id`.
- `attendeeId` (string/uuid, required): References `Attendee.id`.
- `status` (enum: `ACTIVE`, `CANCELLED`): Registration lifecycle marker.
- `createdAt` (datetime): Registration timestamp.
- `cancelledAt` (datetime nullable): Cancellation timestamp when unregistered.

### Validation Rules

- Unique active registration per attendee/event pair.
- Registration is rejected if event is past.
- Registration is rejected when active registrations equal `maxCapacity`.
- Unregister requires an existing active registration.

### State Transitions

- `ACTIVE` → `CANCELLED` on unregister.
- `CANCELLED` does not transition back; re-register creates a new ACTIVE record or reactivates by
  policy (choose one implementation and document in code comments/tests).

## Relationships

- One `Event` has many `Registration` records.
- One `Attendee` has many `Registration` records.
- `Registration` belongs to exactly one `Event` and one `Attendee`.

## Derived and Operational Rules

- Event occupancy is derived from count of active registrations.
- Capacity checks and create/cancel operations execute transactionally.
- Client identity for abuse controls is tracked separately from attendee identity and sourced from
  request context.
