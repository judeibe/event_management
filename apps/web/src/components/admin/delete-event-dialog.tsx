"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { TriangleAlertIcon } from "lucide-react"
import type { EventResponse } from "@event-management/shared"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteEvent } from "@/app/(admin)/admin/events/actions"

export function DeleteEventDialog({
  event,
  open,
  onOpenChange,
}: {
  event: EventResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const hasActiveRegistrations = event.currentRegistrations > 0

  const handleConfirm = async () => {
    setIsDeleting(true)
    const result = await deleteEvent(event.id)
    setIsDeleting(false)

    if (!result.ok) {
      toast.error(result.message)
      if (result.code === "NOT_FOUND") {
        onOpenChange(false)
        router.refresh()
      }
      return
    }

    toast.success(`"${event.title}" was deleted.`)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{event.title}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the event. This action can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {hasActiveRegistrations && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              This event has {event.currentRegistrations} active registration
              {event.currentRegistrations === 1 ? "" : "s"}. Deleting it will remove those
              attendees&apos; registrations too.
            </span>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? "Deleting…" : "Delete Event"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
