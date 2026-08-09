import { SiteHeader } from "@/components/site-header"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Rendered by Next.js whenever page.tsx calls notFound() — covers both a real 404 from apps/api
// and a syntactically invalid eventId (a 400 VALIDATION_ERROR from apps/api's parseEventId), which
// page.tsx treats identically per spec Edge Cases ("handled the same as any other not-found ID").
// `w-full` (not present on the version of this markup this replaces) is required so the wrapper
// stretches to its intended width inside the flex-column <main> instead of collapsing to a sliver
// (research.md #3) — this file is deliberately built with it from the start.
export default function EventNotFound() {
  return (
    <>
      <SiteHeader title="Event" />
      <div className="mx-auto mt-12 w-full max-w-md p-4 text-center lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Event not found</CardTitle>
            <CardDescription>
              We couldn&apos;t find an event at this link. It may have been removed, or the link
              may be incorrect.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </>
  )
}
