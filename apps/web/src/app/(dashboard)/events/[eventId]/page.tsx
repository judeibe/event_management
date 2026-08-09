import type { EventResponse } from "@event-management/shared"

import { SiteHeader } from "@/components/site-header"
import { apiClient } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EventThumbnail } from "@/components/shared/event-thumbnail"
import { EventAvailabilityBadge } from "@/components/dashboard/event-availability-badge"
import { RegistrationPanel } from "./registration-panel"

function formatEventDate(dateString: string) {
  const date = new Date(dateString)
  return (
    date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) +
    " · " +
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  )
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price)
}

export default async function EventDetailPage(props: PageProps<"/events/[eventId]">) {
  const { eventId } = await props.params
  const result = await apiClient.get<EventResponse>(`/events/${eventId}`)

  if (!result.ok) {
    return (
      <>
        <SiteHeader title="Event" />
        <div className="mx-auto mt-12 max-w-md p-4 text-center lg:p-6">
          <Card>
            <CardHeader>
              <CardTitle>{result.error.code === "NOT_FOUND" ? "Event not found" : "Couldn't load this event"}</CardTitle>
              <CardDescription>{result.error.message}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    )
  }

  const event = result.data

  return (
    <>
      <SiteHeader title={event.title} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 lg:p-6">
        <EventThumbnail src={event.imageUrl} alt="" className="aspect-video h-auto w-full rounded-2xl" />
        <Card>
          <CardHeader className="gap-2">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">{event.category}</Badge>
              <span className="text-sm font-medium text-muted-foreground">
                {formatPrice(event.price)}
              </span>
            </div>
            <CardTitle className="text-xl">{event.title}</CardTitle>
            <CardDescription>
              {formatEventDate(event.eventDate)} · {event.location}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm whitespace-pre-line text-foreground">{event.description}</p>
            <EventAvailabilityBadge event={event} />
          </CardContent>
        </Card>
        <RegistrationPanel event={event} />
      </div>
    </>
  )
}
