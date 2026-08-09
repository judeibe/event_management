import { SiteHeader } from "@/components/site-header"
import { Skeleton } from "@/components/ui/skeleton"

const SKELETON_ROWS = 8

export default function Loading() {
  return (
    <>
      <SiteHeader title="Events" />
      <div className="flex flex-col gap-4 p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="overflow-hidden rounded-2xl border">
          <div className="flex items-center gap-4 border-b bg-muted/40 p-3">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/6" />
          </div>
          {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 border-b p-3 last:border-b-0">
              <div className="flex w-1/4 items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <Skeleton className="h-4 w-full" />
              </div>
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/6" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
