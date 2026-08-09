import Link from "next/link"
import type { EventResponse } from "@event-management/shared"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EventThumbnail } from "@/components/shared/event-thumbnail"
import {
  EventAvailabilityBadge,
  getEventAvailability,
} from "@/components/dashboard/event-availability-badge"

function formatEventDate(dateString: string) {
  const date = new Date(dateString)
  return (
    date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) +
    " · " +
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  )
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price)
}

export function EventCard({ event }: { event: EventResponse }) {
  const { isPast } = getEventAvailability(event)

  return (
    <Link href={`/events/${event.id}`} className="block h-full">
      <Card
        className={cn(
          "h-full gap-3 transition-shadow hover:shadow-md",
          isPast && "opacity-60"
        )}
      >
        <EventThumbnail
          src={event.imageUrl}
          alt=""
          className="aspect-video h-auto w-full rounded-none"
        />
        <CardHeader className="gap-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">{event.category}</Badge>
            <span className="text-sm font-medium text-muted-foreground">
              {formatPrice(event.price)}
            </span>
          </div>
          <h3 className="font-heading text-base font-medium">{event.title}</h3>
          <p className="text-sm text-muted-foreground">
            {formatEventDate(event.eventDate)} · {event.location}
          </p>
        </CardHeader>
        <CardContent>
          <EventAvailabilityBadge event={event} />
        </CardContent>
      </Card>
    </Link>
  )
}
