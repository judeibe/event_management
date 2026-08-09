"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { CheckCircle2Icon } from "lucide-react"
import {
  registrationFormValuesSchema,
  type EventResponse,
  type RegistrationFormValues,
} from "@event-management/shared"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { registerForEvent } from "@/app/(dashboard)/events/[eventId]/actions"
import { addMyRegistration, type MyRegistrationRecord } from "@/lib/my-registrations"

function invalidAttr(hasError: boolean) {
  return hasError ? "true" : undefined
}

export function RegisterForm({ event }: { event: EventResponse }) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<MyRegistrationRecord | null>(null)

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormValuesSchema),
    defaultValues: { name: "", email: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const result = await registerForEvent(event.id, values)

    if (!result.ok) {
      const hasFieldErrors = result.fieldErrors && Object.keys(result.fieldErrors).length > 0

      if (hasFieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors!)) {
          form.setError(field as keyof RegistrationFormValues, { message })
        }
      } else {
        setFormError(result.message)
        toast.error(result.message)
      }

      return
    }

    const record: MyRegistrationRecord = {
      registrationId: result.registration.id,
      eventId: event.id,
      attendeeRef: result.registration.attendeeRef,
      attendeeName: values.name,
      status: "ACTIVE",
      eventSnapshot: {
        title: event.title,
        eventDate: event.eventDate,
        location: event.location,
      },
      registeredAt: new Date().toISOString(),
    }
    addMyRegistration(record)
    setConfirmed(record)
    toast.success(`You're registered for "${event.title}".`)
    router.refresh()
  })

  if (confirmed) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="size-5 text-primary" />
            <CardTitle>You&apos;re registered!</CardTitle>
          </div>
          <CardDescription>
            {confirmed.attendeeName} ({confirmed.attendeeRef}) is registered for &quot;
            {event.title}&quot;. You can manage this from My Registrations at any time.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const errors = form.formState.errors

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register for this event</CardTitle>
        <CardDescription>Enter your details to reserve a spot.</CardDescription>
      </CardHeader>
      <CardContent>
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
            <Field data-invalid={invalidAttr(!!errors.name)}>
              <FieldLabel htmlFor="attendee-name">Name</FieldLabel>
              <Input id="attendee-name" aria-invalid={!!errors.name} {...form.register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={invalidAttr(!!errors.email)}>
              <FieldLabel htmlFor="attendee-email">Email</FieldLabel>
              <Input
                id="attendee-email"
                type="email"
                aria-invalid={!!errors.email}
                {...form.register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>
          </FieldGroup>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Registering…" : "Register"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
