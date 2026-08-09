"use client"

import { useState } from "react"
import { ImageOff } from "lucide-react"

import { cn } from "@/lib/utils"

// imageUrl is an arbitrary admin-entered URL (no file upload, no next/image remotePatterns
// allowlist to maintain — research.md #6). Falls back to a placeholder icon on load failure.
export function EventThumbnail({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [errored, setErrored] = useState(false)

  if (errored || !src) {
    return (
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground",
          className
        )}
      >
        <ImageOff className="size-4" />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-supplied URL, see comment above
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn("size-9 shrink-0 rounded-xl object-cover", className)}
      onError={() => setErrored(true)}
    />
  )
}
