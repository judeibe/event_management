import type { EventResponse } from "@event-management/shared"

import { SiteHeader } from "@/components/site-header"
import { apiClient } from "@/lib/api-client"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EventGrid } from "@/components/dashboard/event-grid"

export default async function EventsPage() {
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
        ) : (
          <EventGrid events={result.data} />
        )}
      </div>
    </>
  )
}
