"use client"

import Link from "next/link"
import type { EventResponse } from "@event-management/shared"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CancelRegistrationDialog } from "@/components/dashboard/cancel-registration-dialog"
import { removeMyRegistration, type MyRegistrationRecord } from "@/lib/my-registrations"

function formatEventDate(dateString: string) {
  const date = new Date(dateString)
  return (
    date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) +
    " · " +
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  )
}

export function MyRegistrationListItem({
  record,
  liveEvent,
}: {
  record: MyRegistrationRecord
  /** undefined = still refreshing from the API, null = event no longer exists (research.md #6) */
  liveEvent: EventResponse | null | undefined
}) {
  const title = liveEvent?.title ?? record.eventSnapshot.title
  const eventDate = liveEvent?.eventDate ?? record.eventSnapshot.eventDate
  const location = liveEvent?.location ?? record.eventSnapshot.location
  const isDeleted = liveEvent === null

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {isDeleted ? (
            <CardTitle>{title}</CardTitle>
          ) : (
            <Link href={`/events/${record.eventId}`} className="hover:underline">
              <CardTitle>{title}</CardTitle>
            </Link>
          )}
          <Badge variant={record.status === "ACTIVE" ? "secondary" : "outline"}>
            {record.status === "ACTIVE" ? "Active" : "Cancelled"}
          </Badge>
          {isDeleted && <Badge variant="destructive">No longer available</Badge>}
        </div>
        <CardDescription>
          {formatEventDate(eventDate)} · {location}
        </CardDescription>
        <CardAction>
          {isDeleted ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeMyRegistration(record.registrationId)}
            >
              Remove
            </Button>
          ) : (
            record.status === "ACTIVE" && (
              <CancelRegistrationDialog eventId={record.eventId} registration={record} />
            )
          )}
        </CardAction>
      </CardHeader>
    </Card>
  )
}
