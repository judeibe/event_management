import type { EventResponse } from "@event-management/shared"

import { SiteHeader } from "@/components/site-header"
import { apiClient } from "@/lib/api-client"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EventsEmptyState } from "@/components/admin/events-empty-state"
import { EventsTable } from "@/components/admin/events-table"

export default async function AdminEventsPage() {
  const result = await apiClient.get<EventResponse[]>("/events")

  return (
    <>
      <SiteHeader title="Events" />
      <div className="flex flex-col gap-4 p-4 lg:p-6">
        {!result.ok ? (
          <Card className="mx-auto mt-12 max-w-md text-center">
            <CardHeader>
              <CardTitle>Couldn&apos;t load events</CardTitle>
              <CardDescription>{result.error.message}</CardDescription>
            </CardHeader>
          </Card>
        ) : result.data.length === 0 ? (
          <EventsEmptyState />
        ) : (
          <EventsTable events={result.data} />
        )}
      </div>
    </>
  )
}
