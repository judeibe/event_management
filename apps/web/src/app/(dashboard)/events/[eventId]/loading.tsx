import { SiteHeader } from "@/components/site-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <>
      <SiteHeader title="Event" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 lg:p-6">
        <Skeleton className="aspect-video w-full" />
        <Card>
          <CardHeader className="gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <Skeleton className="h-40 w-full" />
      </div>
    </>
  )
}
