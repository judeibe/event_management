"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  buildEventFormSchema,
  type EventFormValues,
  type EventResponse,
} from "@event-management/shared"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { EventThumbnail } from "@/components/shared/event-thumbnail"
import { createEvent, updateEvent } from "@/app/(admin)/admin/events/actions"

const emptyDefaults: EventFormValues = {
  title: "",
  description: "",
  eventDate: "",
  location: "",
  category: "",
  price: 0,
  maxCapacity: 1,
  imageUrl: "",
}

function toDatetimeLocalValue(isoString: string) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function valuesFromEvent(event: EventResponse): EventFormValues {
  return {
    title: event.title,
    description: event.description,
    eventDate: toDatetimeLocalValue(event.eventDate),
    location: event.location,
    category: event.category,
    price: event.price,
    maxCapacity: event.maxCapacity,
    imageUrl: event.imageUrl,
  }
}

function invalidAttr(hasError: boolean) {
  return hasError ? "true" : undefined
}

type EventFormDialogProps =
  | { mode: "create"; trigger: React.ReactElement }
  | {
      mode: "edit"
      event: EventResponse
      open: boolean
      onOpenChange: (open: boolean) => void
    }

export function EventFormDialog(props: EventFormDialogProps) {
  const { mode } = props
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const open = mode === "create" ? internalOpen : props.open
  const defaultValues = mode === "edit" ? valuesFromEvent(props.event) : emptyDefaults
  const minCapacity = mode === "edit" ? props.event.currentRegistrations : undefined

  const form = useForm<EventFormValues>({
    resolver: zodResolver(buildEventFormSchema(minCapacity)),
    defaultValues,
  })

  // Re-sync the form (fresh values, cleared errors) each time the dialog opens, so a prior
  // edit/create attempt never leaks into the next time it's shown.
  useEffect(() => {
    if (open) {
      form.reset(defaultValues)
      setFormError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleOpenChange = (nextOpen: boolean) => {
    if (mode === "create") {
      setInternalOpen(nextOpen)
    } else {
      props.onOpenChange(nextOpen)
    }
    if (!nextOpen) {
      setFormError(null)
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const result =
      mode === "create" ? await createEvent(values) : await updateEvent(props.event.id, values)

    if (!result.ok) {
      // The event was deleted elsewhere between opening this dialog and saving — no point
      // re-showing the form, just tell the admin and bring the list up to date (contracts/ui-contract.md).
      if (result.code === "NOT_FOUND") {
        toast.error(result.message)
        handleOpenChange(false)
        router.refresh()
        return
      }

      const hasFieldErrors = result.fieldErrors && Object.keys(result.fieldErrors).length > 0

      if (hasFieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors!)) {
          form.setError(field as keyof EventFormValues, { message })
        }
      } else {
        setFormError(result.message)
      }

      return
    }

    toast.success(
      mode === "create" ? `"${result.event.title}" was created.` : `"${result.event.title}" was updated.`
    )
    handleOpenChange(false)
  })

  const errors = form.formState.errors
  const imageUrlPreview = form.watch("imageUrl")

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {mode === "create" && <DialogTrigger render={props.trigger} />}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Event" : "Edit Event"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Fill in the details below to publish a new event."
              : "Update this event's details below."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {formError && (
            <div
              role="alert"
              className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive"
            >
              {formError}
            </div>
          )}
          <FieldGroup>
            <Field data-invalid={invalidAttr(!!errors.title)}>
              <FieldLabel htmlFor="event-title">Title</FieldLabel>
              <Input
                id="event-title"
                aria-invalid={!!errors.title}
                {...form.register("title")}
              />
              <FieldError errors={[errors.title]} />
            </Field>

            <Field data-invalid={invalidAttr(!!errors.description)}>
              <FieldLabel htmlFor="event-description">Description</FieldLabel>
              <Textarea
                id="event-description"
                aria-invalid={!!errors.description}
                {...form.register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={invalidAttr(!!errors.eventDate)}>
                <FieldLabel htmlFor="event-date">Date &amp; time</FieldLabel>
                <Input
                  id="event-date"
                  type="datetime-local"
                  aria-invalid={!!errors.eventDate}
                  {...form.register("eventDate")}
                />
                <FieldError errors={[errors.eventDate]} />
              </Field>

              <Field data-invalid={invalidAttr(!!errors.category)}>
                <FieldLabel htmlFor="event-category">Category</FieldLabel>
                <Input
                  id="event-category"
                  aria-invalid={!!errors.category}
                  {...form.register("category")}
                />
                <FieldError errors={[errors.category]} />
              </Field>
            </div>

            <Field data-invalid={invalidAttr(!!errors.location)}>
              <FieldLabel htmlFor="event-location">Location</FieldLabel>
              <Input
                id="event-location"
                aria-invalid={!!errors.location}
                {...form.register("location")}
              />
              <FieldError errors={[errors.location]} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={invalidAttr(!!errors.price)}>
                <FieldLabel htmlFor="event-price">Price (USD)</FieldLabel>
                <Input
                  id="event-price"
                  type="number"
                  step="0.01"
                  min={0}
                  aria-invalid={!!errors.price}
                  {...form.register("price")}
                />
                <FieldError errors={[errors.price]} />
              </Field>

              <Field data-invalid={invalidAttr(!!errors.maxCapacity)}>
                <FieldLabel htmlFor="event-capacity">Capacity</FieldLabel>
                <Input
                  id="event-capacity"
                  type="number"
                  step="1"
                  min={1}
                  aria-invalid={!!errors.maxCapacity}
                  {...form.register("maxCapacity")}
                />
                <FieldError errors={[errors.maxCapacity]} />
              </Field>
            </div>

            <Field data-invalid={invalidAttr(!!errors.imageUrl)}>
              <FieldLabel htmlFor="event-image-url">Image URL</FieldLabel>
              <div className="flex items-center gap-3">
                <EventThumbnail
                  key={imageUrlPreview}
                  src={imageUrlPreview}
                  alt=""
                  className="size-10"
                />
                <Input
                  id="event-image-url"
                  type="url"
                  placeholder="https://…"
                  aria-invalid={!!errors.imageUrl}
                  className="flex-1"
                  {...form.register("imageUrl")}
                />
              </div>
              <FieldError errors={[errors.imageUrl]} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? mode === "create"
                  ? "Creating…"
                  : "Saving…"
                : mode === "create"
                  ? "Create Event"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
