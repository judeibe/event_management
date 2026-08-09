# Phase 1 Data Model: Events Landing Page

This feature introduces no new entities, fields, relationships, or state transitions. It is a frontend routing change only: the base address (`/`) is redirected to the existing `/events` route, which already fetches and renders the `Event` entity via the existing `apps/api` `/events` endpoint.

## Entities

- **Event** (existing, unchanged): the entity already listed by `apps/web/src/app/(dashboard)/events/page.tsx` via `EventResponse` (`@event-management/shared`). No attributes are added, removed, or reinterpreted by this feature. See the existing events feature's spec/data model for its definition.

## Validation rules

None introduced — no new input, form, or persisted data is part of this feature.

## State transitions

None — this feature adds no new stateful entity. The only "state" involved is client-side routing state (which URL a visitor is on), which is a navigation concern covered in `plan.md` / `research.md`, not a data-model concern.
