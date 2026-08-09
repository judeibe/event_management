"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cancelRegistration } from "@/app/(dashboard)/events/[eventId]/actions"
import { markMyRegistrationCancelled, type MyRegistrationRecord } from "@/lib/my-registrations"

export function CancelRegistrationDialog({
  eventId,
  registration,
  onCancelled,
}: {
  eventId: string
  registration: MyRegistrationRecord
  /** Optional — callers that also subscribe to the store (useSyncExternalStore) don't need this,
   * since markMyRegistrationCancelled() already notifies them. Kept for callers with separate
   * local state (e.g. the live-refreshed event data in MyRegistrationsList). */
  onCancelled?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const handleConfirm = async () => {
    setIsCancelling(true)
    const result = await cancelRegistration(eventId, registration.attendeeRef)
    setIsCancelling(false)

    if (!result.ok) {
      toast.error(result.message)

      // A 404 here means either the event or the registration itself is already gone — in both
      // cases the true state is "not active anymore," so sync local storage rather than leaving a
      // cancel button that will always fail (research.md #7, contracts/ui-contract.md).
      if (result.code === "NOT_FOUND") {
        markMyRegistrationCancelled(registration.registrationId)
        setOpen(false)
        onCancelled?.()
        router.refresh()
      }

      return
    }

    markMyRegistrationCancelled(registration.registrationId)
    toast.success("Your registration was cancelled.")
    setOpen(false)
    onCancelled?.()
    router.refresh()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="sm">
            Cancel registration
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this registration?</AlertDialogTitle>
          <AlertDialogDescription>
            This frees up your spot for this event. This action can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>Keep registration</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isCancelling} onClick={handleConfirm}>
            {isCancelling ? "Cancelling…" : "Cancel registration"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
