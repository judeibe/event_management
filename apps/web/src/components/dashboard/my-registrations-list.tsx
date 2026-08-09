"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { TicketXIcon } from "lucide-react"
import type { EventResponse } from "@event-management/shared"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MyRegistrationListItem } from "@/components/dashboard/my-registration-list-item"
import {
  getMyRegistrations,
  subscribeMyRegistrations,
  type MyRegistrationRecord,
} from "@/lib/my-registrations"

// No batch/list-by-attendee endpoint exists on apps/api (research.md #6) — this list is served
// entirely from local storage (reactively, via useSyncExternalStore), refreshed per-entry against
// GET /events/:eventId from the browser (api-client.ts is server-only, hence this public env var).
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000"

// A confirmed 404 ('not-found') is the only status that should ever mark a registration's event as
// "no longer available" (FR-005) — any other failure (non-2xx, network/CORS error, timeout) is
// 'unreachable' and must fall back to the locally-stored snapshot instead, same as 'loading' does.
export type LiveEventState =
  | { status: "ok"; event: EventResponse }
  | { status: "not-found" }
  | { status: "unreachable" }

async function fetchEvent(eventId: string): Promise<LiveEventState> {
  try {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, { cache: "no-store" })
    if (response.status === 404) return { status: "not-found" }
    if (!response.ok) return { status: "unreachable" }
    const body = (await response.json()) as { data: EventResponse }
    return { status: "ok", event: body.data }
  } catch {
    return { status: "unreachable" }
  }
}

// Stable reference (not a fresh `[]` per call) so useSyncExternalStore's getServerSnapshot doesn't
// trigger a re-render loop.
const EMPTY_RECORDS: MyRegistrationRecord[] = []

export function MyRegistrationsList() {
  const records = useSyncExternalStore(
    subscribeMyRegistrations,
    getMyRegistrations,
    () => EMPTY_RECORDS
  )
  const [liveEvents, setLiveEvents] = useState<Record<string, LiveEventState | undefined>>({})

  const eventIds = records
    .map((record) => record.eventId)
    .sort()
    .join(",")

  useEffect(() => {
    for (const eventId of eventIds ? eventIds.split(",") : []) {
      fetchEvent(eventId).then((liveEvent) => {
        setLiveEvents((prev) => ({ ...prev, [eventId]: liveEvent }))
      })
    }
  }, [eventIds])

  if (records.length === 0) {
    return (
      <Card className="mt-12 max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
            <TicketXIcon className="size-6 text-muted-foreground" />
          </div>
          <CardTitle className="mt-4">No registrations found on this device</CardTitle>
          <CardDescription>
            Registrations you make are remembered on this browser. Browse events to register for
            one.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const sorted = [...records].sort(
    (a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
  )

  return (
    <div className="flex flex-col gap-4">
      {sorted.map((record) => (
        <MyRegistrationListItem
          key={record.registrationId}
          record={record}
          liveEvent={liveEvents[record.eventId]}
        />
      ))}
    </div>
  )
}
