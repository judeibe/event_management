import { SiteHeader } from "@/components/site-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

const SKELETON_CARDS = 6

export default function Loading() {
  return (
    <>
      <SiteHeader title="Events" />
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-full sm:w-48" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: SKELETON_CARDS }).map((_, index) => (
            <Card key={index} className="gap-3">
              <Skeleton className="aspect-video w-full rounded-none" />
              <CardHeader className="gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
