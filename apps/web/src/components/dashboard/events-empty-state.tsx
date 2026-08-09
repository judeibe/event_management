import { CalendarX } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function EventsEmptyState() {
  return (
    <Card className="mx-auto mt-12 max-w-md text-center">
      <CardHeader>
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
          <CalendarX className="size-6 text-muted-foreground" />
        </div>
        <CardTitle className="mt-4">No events are available right now</CardTitle>
        <CardDescription>Check back soon — new events are added regularly.</CardDescription>
      </CardHeader>
    </Card>
  )
}
