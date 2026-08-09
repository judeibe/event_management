// Device-local "my registrations" store. apps/api has no endpoint to list registrations by
// attendee (research.md #6), so this is the only source of truth for what the portal shows a
// visitor under "My Registrations" — scoped to this browser/device only (spec.md Clarifications).
// Every function is SSR-safe (no-ops on the server, where `window` doesn't exist) and never throws;
// storage failures are the caller's responsibility to surface (e.g. via a toast).
//
// Exposes a subscribe()/notify() pair so components can read it via React's
// useSyncExternalStore instead of useEffect+setState — the latter is flagged by this project's
// React Compiler lint rule (react-hooks/set-state-in-effect) as an anti-pattern for exactly this
// "sync from an external system" case, and useSyncExternalStore also solves SSR/hydration safely
// (getServerSnapshot) without a manual "mounted" flag.

const STORAGE_KEY = "event-portal:my-registrations:v1"

export interface MyRegistrationRecord {
  registrationId: string
  eventId: string
  attendeeRef: string
  attendeeName: string
  status: "ACTIVE" | "CANCELLED"
  eventSnapshot: {
    title: string
    eventDate: string
    location: string
  }
  registeredAt: string
}

function isMyRegistrationRecord(value: unknown): value is MyRegistrationRecord {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return (
    typeof record.registrationId === "string" &&
    typeof record.eventId === "string" &&
    typeof record.attendeeRef === "string" &&
    typeof record.attendeeName === "string" &&
    (record.status === "ACTIVE" || record.status === "CANCELLED") &&
    typeof record.eventSnapshot === "object" &&
    record.eventSnapshot !== null &&
    typeof record.registeredAt === "string"
  )
}

// Cached by raw string so readAll() returns a referentially stable array (and stable element
// references) when nothing has changed — required for useSyncExternalStore's getSnapshot to avoid
// re-render loops.
let cachedRaw: string | null = null
let cachedRecords: MyRegistrationRecord[] = []

function readAll(): MyRegistrationRecord[] {
  if (typeof window === "undefined") return []

  let raw: string | null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return []
  }

  if (raw === cachedRaw) return cachedRecords

  cachedRaw = raw
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : []
    cachedRecords = Array.isArray(parsed) ? parsed.filter(isMyRegistrationRecord) : []
  } catch {
    cachedRecords = []
  }

  return cachedRecords
}

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

function writeAll(records: MyRegistrationRecord[]): void {
  if (typeof window === "undefined") return

  try {
    const raw = JSON.stringify(records)
    window.localStorage.setItem(STORAGE_KEY, raw)
    cachedRaw = raw
    cachedRecords = records
    notify()
  } catch {
    // Quota exceeded / private browsing — caller surfaces this via a toast, see contracts/ui-contract.md.
  }
}

/** Subscribe for use with React's useSyncExternalStore. */
export function subscribeMyRegistrations(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getMyRegistrations(): MyRegistrationRecord[] {
  return readAll()
}

export function getMyRegistrationForEvent(eventId: string): MyRegistrationRecord | undefined {
  return readAll().find((record) => record.eventId === eventId && record.status === "ACTIVE")
}

export function addMyRegistration(record: MyRegistrationRecord): void {
  const records = readAll().filter((existing) => existing.registrationId !== record.registrationId)
  records.push(record)
  writeAll(records)
}

export function markMyRegistrationCancelled(registrationId: string): void {
  const records = readAll().map((record) =>
    record.registrationId === registrationId ? { ...record, status: "CANCELLED" as const } : record
  )
  writeAll(records)
}

export function removeMyRegistration(registrationId: string): void {
  writeAll(readAll().filter((record) => record.registrationId !== registrationId))
}
