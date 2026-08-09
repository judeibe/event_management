// Server-only: reads a non-NEXT_PUBLIC_ env var, so this must only be imported from Server
// Components or Server Actions (e.g. app/(admin)/admin/events/page.tsx, actions.ts) — never from
// a Client Component, where API_BASE_URL would be undefined in the browser bundle.
import type { ApiErrorBody, ApiErrorResponse, ApiSuccessResponse } from "@event-management/shared"

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorBody }

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000"

const networkError: ApiErrorBody = {
  code: "INTERNAL_SERVER_ERROR",
  message: "Couldn't reach the server. Please check your connection and try again.",
}

const unexpectedResponseError: ApiErrorBody = {
  code: "INTERNAL_SERVER_ERROR",
  message: "Received an unexpected response from the server.",
}

const genericServerError: ApiErrorBody = {
  code: "INTERNAL_SERVER_ERROR",
  message: "Something went wrong. Please try again.",
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    })
  } catch {
    return { ok: false, error: networkError }
  }

  if (response.status === 204) {
    return { ok: true, data: undefined as T }
  }

  let body: unknown

  try {
    body = await response.json()
  } catch {
    return response.ok
      ? { ok: false, error: unexpectedResponseError }
      : { ok: false, error: genericServerError }
  }

  if (!response.ok) {
    const errorBody = (body as ApiErrorResponse | undefined)?.error
    return { ok: false, error: errorBody ?? genericServerError }
  }

  return { ok: true, data: (body as ApiSuccessResponse<T>).data }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
