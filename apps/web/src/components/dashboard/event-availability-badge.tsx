import type { EventResponse } from "@event-management/shared"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

// Shared by the grid (EventCard) and the detail page's registration gating (FR-003, FR-004,
// research.md #8) so "is this event open/full/past" is derived in exactly one place.
export function getEventAvailability(event: EventResponse) {
  const remainingCapacity = event.maxCapacity - event.currentRegistrations
  const isFull = remainingCapacity <= 0
  const isPast = new Date(event.eventDate).getTime() <= Date.now()
  return { remainingCapacity, isFull, isPast }
}

export function EventAvailabilityBadge({
  event,
  className,
}: {
  event: EventResponse
  className?: string
}) {
  const { isFull, isPast } = getEventAvailability(event)

  if (isPast) {
    return (
      <Badge variant="outline" className={className}>
        Past event
      </Badge>
    )
  }

  if (isFull) {
    return (
      <Badge variant="destructive" className={className}>
        Full
      </Badge>
    )
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Progress value={event.currentRegistrations} max={event.maxCapacity} />
      <span className="text-xs text-muted-foreground tabular-nums">
        {event.currentRegistrations} / {event.maxCapacity} spots filled
      </span>
    </div>
  )
}
