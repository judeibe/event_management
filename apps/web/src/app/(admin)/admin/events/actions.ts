"use server"

import { revalidatePath } from "next/cache"
import type { ZodError } from "zod"
import {
  buildEventFormSchema,
  toEventRequestBody,
  type ApiErrorCode,
  type EventFormValues,
  type EventResponse,
} from "@event-management/shared"

import { apiClient } from "@/lib/api-client"

export type EventActionResult =
  | { ok: true; event: EventResponse }
  | { ok: false; code: ApiErrorCode; message: string; fieldErrors?: Record<string, string> }

export type DeleteEventResult =
  | { ok: true }
  | { ok: false; code: ApiErrorCode; message: string }

type ZodLikeIssue = { path: Array<string | number>; message: string }

function fieldErrorsFromIssues(issues: ZodLikeIssue[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const field = issue.path[0]
    if (typeof field === "string" && !(field in fieldErrors)) {
      fieldErrors[field] = issue.message
    }
  }
  return fieldErrors
}

function fieldErrorsFromZodError(error: ZodError): Record<string, string> {
  return fieldErrorsFromIssues(error.issues)
}

/** Maps a VALIDATION_ERROR response from apps/api's `validateRequest` middleware (details.issues,
 * see request-validation.ts) onto the same field-error shape used for client-side zod failures. */
function fieldErrorsFromApiDetails(details: unknown): Record<string, string> | undefined {
  if (!details || typeof details !== "object" || !("issues" in details)) {
    return undefined
  }

  const issues = (details as { issues?: unknown }).issues
  if (!Array.isArray(issues)) {
    return undefined
  }

  return fieldErrorsFromIssues(issues as ZodLikeIssue[])
}

const genericValidationMessage = "Please fix the highlighted fields and try again."

export async function createEvent(values: EventFormValues): Promise<EventActionResult> {
  const parsed = buildEventFormSchema().safeParse(values)

  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: genericValidationMessage,
      fieldErrors: fieldErrorsFromZodError(parsed.error),
    }
  }

  const result = await apiClient.post<EventResponse>("/events", toEventRequestBody(parsed.data))

  if (!result.ok) {
    return {
      ok: false,
      code: result.error.code,
      message: result.error.message,
      fieldErrors:
        result.error.code === "VALIDATION_ERROR"
          ? fieldErrorsFromApiDetails(result.error.details)
          : undefined,
    }
  }

  revalidatePath("/admin/events")
  revalidatePath("/events")

  return { ok: true, event: result.data }
}

export async function deleteEvent(eventId: string): Promise<DeleteEventResult> {
  const result = await apiClient.delete<void>(`/events/${eventId}`)

  if (!result.ok) {
    return { ok: false, code: result.error.code, message: result.error.message }
  }

  revalidatePath("/admin/events")
  revalidatePath("/events")

  return { ok: true }
}

export async function updateEvent(
  eventId: string,
  values: EventFormValues
): Promise<EventActionResult> {
  // Structural validation only here — the maxCapacity-vs-registrations rule (FR-008) is
  // pre-checked client-side (buildEventFormSchema(minCapacity) in EventFormDialog) and ultimately
  // enforced authoritatively by apps/api's 409 CONFLICT below (data-model.md).
  const parsed = buildEventFormSchema().safeParse(values)

  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: genericValidationMessage,
      fieldErrors: fieldErrorsFromZodError(parsed.error),
    }
  }

  const result = await apiClient.patch<EventResponse>(
    `/events/${eventId}`,
    toEventRequestBody(parsed.data)
  )

  if (!result.ok) {
    return {
      ok: false,
      code: result.error.code,
      message: result.error.message,
      fieldErrors:
        result.error.code === "VALIDATION_ERROR"
          ? fieldErrorsFromApiDetails(result.error.details)
          : undefined,
    }
  }

  revalidatePath("/admin/events")
  revalidatePath("/events")
  revalidatePath(`/events/${eventId}`)

  return { ok: true, event: result.data }
}
