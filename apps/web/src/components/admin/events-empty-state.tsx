"use client"

import { CalendarPlus, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EventFormDialog } from "@/components/admin/event-form-dialog"

export function EventsEmptyState() {
  return (
    <Card className="mx-auto mt-12 max-w-md text-center">
      <CardHeader>
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
          <CalendarPlus className="size-6 text-muted-foreground" />
        </div>
        <CardTitle className="mt-4">No events yet</CardTitle>
        <CardDescription>
          Create your first event to make it available for attendees to register for.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EventFormDialog
          mode="create"
          trigger={
            <Button>
              <PlusIcon />
              Add Event
            </Button>
          }
        />
      </CardContent>
    </Card>
  )
}
