"use server"

import { revalidatePath } from "next/cache"
import {
  registrationFormValuesSchema,
  toRegistrationRequestBody,
  type ApiErrorCode,
  type RegistrationFormValues,
  type RegistrationResponse,
} from "@event-management/shared"

import { apiClient } from "@/lib/api-client"

export type RegisterResult =
  | { ok: true; registration: RegistrationResponse }
  | { ok: false; code: ApiErrorCode; message: string; fieldErrors?: Record<string, string> }

export type CancelResult = { ok: true } | { ok: false; code: ApiErrorCode; message: string }

const genericValidationMessage = "Please fix the highlighted fields and try again."

export async function registerForEvent(
  eventId: string,
  values: RegistrationFormValues
): Promise<RegisterResult> {
  const parsed = registrationFormValuesSchema.safeParse(values)

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (typeof field === "string" && !(field in fieldErrors)) {
        fieldErrors[field] = issue.message
      }
    }
    return { ok: false, code: "VALIDATION_ERROR", message: genericValidationMessage, fieldErrors }
  }

  // The API's error message is already specific per business rule (past event, full capacity,
  // duplicate registration — registration.service.ts), so it's surfaced verbatim rather than
  // re-derived from `code` alone (research.md #7, contracts/ui-contract.md).
  const result = await apiClient.post<RegistrationResponse>(
    `/events/${eventId}/registrations`,
    toRegistrationRequestBody(parsed.data)
  )

  if (!result.ok) {
    return { ok: false, code: result.error.code, message: result.error.message }
  }

  revalidatePath("/events")
  revalidatePath(`/events/${eventId}`)

  return { ok: true, registration: result.data }
}

export async function cancelRegistration(eventId: string, attendeeRef: string): Promise<CancelResult> {
  const result = await apiClient.delete<void>(
    `/events/${eventId}/registrations/${encodeURIComponent(attendeeRef)}`
  )

  if (!result.ok) {
    return { ok: false, code: result.error.code, message: result.error.message }
  }

  revalidatePath("/events")
  revalidatePath(`/events/${eventId}`)

  return { ok: true }
}
