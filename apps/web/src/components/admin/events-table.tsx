"use client"

import { useMemo, useState } from "react"
import type { EventResponse } from "@event-management/shared"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EventThumbnail } from "@/components/admin/event-thumbnail"
import { EventFormDialog } from "@/components/admin/event-form-dialog"
import { DeleteEventDialog } from "@/components/admin/delete-event-dialog"
import { MoreHorizontalIcon, PlusIcon, SquarePenIcon, TrashIcon } from "lucide-react"

const PAGE_SIZE = 20

function formatEventDate(dateString: string) {
  const date = new Date(dateString)
  return (
    date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) +
    " · " +
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  )
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price)
}

export function EventsTable({ events }: { events: EventResponse[] }) {
  const [pageIndex, setPageIndex] = useState(0)
  const [editingEvent, setEditingEvent] = useState<EventResponse | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<EventResponse | null>(null)

  const pageCount = Math.max(1, Math.ceil(events.length / PAGE_SIZE))
  const currentPage = Math.min(pageIndex, pageCount - 1)
  const pageEvents = useMemo(
    () => events.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [events, currentPage]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Events</h2>
        <EventFormDialog
          mode="create"
          trigger={
            <Button size="sm">
              <PlusIcon />
              Add Event
            </Button>
          }
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Registrations</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <EventThumbnail src={event.imageUrl} alt="" />
                    <span className="font-medium">{event.title}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatEventDate(event.eventDate)}
                </TableCell>
                <TableCell className="text-muted-foreground">{event.location}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{event.category}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatPrice(event.price)}
                </TableCell>
                <TableCell className="min-w-36">
                  <div className="flex flex-col gap-1">
                    <Progress value={event.currentRegistrations} max={event.maxCapacity} />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {event.currentRegistrations} / {event.maxCapacity}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontalIcon />
                          <span className="sr-only">Row actions</span>
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingEvent(event)}>
                        <SquarePenIcon />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeletingEvent(event)}
                      >
                        <TrashIcon />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setPageIndex((page) => page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPageIndex((page) => page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      {editingEvent && (
        <EventFormDialog
          mode="edit"
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setEditingEvent(null)
          }}
        />
      )}
      {deletingEvent && (
        <DeleteEventDialog
          event={deletingEvent}
          open={!!deletingEvent}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setDeletingEvent(null)
          }}
        />
      )}
    </div>
  )
}
