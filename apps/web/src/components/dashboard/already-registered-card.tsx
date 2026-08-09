import { CheckCircle2Icon } from "lucide-react"
import type { EventResponse } from "@event-management/shared"

import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CancelRegistrationDialog } from "@/components/dashboard/cancel-registration-dialog"
import type { MyRegistrationRecord } from "@/lib/my-registrations"

// No local "cancelled" state here: the parent (RegistrationPanel) subscribes to the same store
// via useSyncExternalStore, so once CancelRegistrationDialog calls markMyRegistrationCancelled it
// re-renders and swaps this card out automatically — the confirmation itself is the sonner toast.
export function AlreadyRegisteredCard({
  event,
  registration,
}: {
  event: EventResponse
  registration: MyRegistrationRecord
}) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2Icon className="size-5 text-primary" />
          <CardTitle>You&apos;re registered</CardTitle>
          <Badge variant="secondary">Active</Badge>
        </div>
        <CardDescription>
          {registration.attendeeName} ({registration.attendeeRef}) is registered for &quot;
          {event.title}&quot;.
        </CardDescription>
        <CardAction>
          <CancelRegistrationDialog eventId={event.id} registration={registration} />
        </CardAction>
      </CardHeader>
    </Card>
  )
}
