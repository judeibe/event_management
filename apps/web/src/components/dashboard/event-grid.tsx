"use client"

import { useMemo, useState } from "react"
import { SearchIcon } from "lucide-react"
import type { EventResponse } from "@event-management/shared"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EventCard } from "@/components/dashboard/event-card"
import { EventsEmptyState } from "@/components/dashboard/events-empty-state"

const ALL_CATEGORIES = "all"

// No server-side search/filter query params exist on GET /events (research.md #5) — filters over
// the already-fetched full list, which is the "no apps/api change" resolution documented there.
export function EventGrid({ events }: { events: EventResponse[] }) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState(ALL_CATEGORIES)

  const categories = useMemo(
    () => Array.from(new Set(events.map((event) => event.category))).sort(),
    [events]
  )

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return events.filter((event) => {
      const matchesSearch = !query || event.title.toLowerCase().includes(query)
      const matchesCategory = category === ALL_CATEGORIES || event.category === category
      return matchesSearch && matchesCategory
    })
  }, [events, search, category])

  if (events.length === 0) {
    return <EventsEmptyState />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events by title…"
            className="pl-9"
          />
        </div>
        <Select
          value={category}
          onValueChange={(value) => setCategory(value ?? ALL_CATEGORIES)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {filteredEvents.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No events match your search.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
