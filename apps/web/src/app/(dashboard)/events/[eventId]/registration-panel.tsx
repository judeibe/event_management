"use client"

import { useSyncExternalStore } from "react"
import type { EventResponse } from "@event-management/shared"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RegisterForm } from "@/components/dashboard/register-form"
import { AlreadyRegisteredCard } from "@/components/dashboard/already-registered-card"
import { getEventAvailability } from "@/components/dashboard/event-availability-badge"
import { getMyRegistrationForEvent, subscribeMyRegistrations } from "@/lib/my-registrations"

// The detail page itself is a Server Component (it fetches the event), but "am I already
// registered on this device" can only be answered from localStorage — hence this client boundary,
// which decides between RegisterForm / AlreadyRegisteredCard / a closed notice (FR-004, FR-007).
// useSyncExternalStore (not useEffect+setState) both keeps this reactive to the store's own writes
// (register/cancel elsewhere update this instantly) and is SSR/hydration-safe out of the box.
export function RegistrationPanel({ event }: { event: EventResponse }) {
  const existingRegistration = useSyncExternalStore(
    subscribeMyRegistrations,
    () => getMyRegistrationForEvent(event.id),
    () => getMyRegistrationForEvent(event.id)
  )

  if (existingRegistration) {
    return <AlreadyRegisteredCard event={event} registration={existingRegistration} />
  }

  const { isFull, isPast } = getEventAvailability(event)

  if (isFull || isPast) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration closed</CardTitle>
          <CardDescription>
            {isPast
              ? "This event has already happened, so registration is no longer available."
              : "This event has reached its maximum capacity."}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return <RegisterForm event={event} />
}
