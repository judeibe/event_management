# API Contract Delta: Registration Portal Bug Fixes

This feature does **not** change `001-event-registration-api/contracts/openapi.yaml`'s request/response
bodies, status codes, or error envelope shape. It changes two things at the HTTP layer: response
*headers* on cross-origin requests (new), and the internal decision of whether `POST
/events/:eventId/registrations` reactivates an existing row vs. creates a new one (invisible on the
wire — the response shape is identical either way).

## `POST /events/:eventId/registrations` — behavior clarification (no wire-shape change)

| | Before this feature | After this feature |
|---|---|---|
| No existing registration for `(eventId, attendeeId)` | `201`, new `Registration` row created | unchanged |
| Active registration already exists for `(eventId, attendeeId)` | `409 CONFLICT`, "Attendee is already registered for this event." | unchanged |
| **Cancelled registration exists, none active, for `(eventId, attendeeId)`** | **`409 CONFLICT`** (bug — Prisma `P2002` misreported as duplicate) | **`201`**, the existing row reactivated (`status: 'ACTIVE'`, `cancelledAt: null`), same response shape as any other successful registration (`RegistrationResponse` — `id` is the pre-existing row's id, unchanged since the original registration) |

`RegistrationResponse`'s shape (`id`, `eventId`, `attendeeRef`, `status`) is unchanged in every case.
Callers cannot distinguish "reactivated" from "freshly created" from the response alone, and don't
need to — both are `201` with `status: 'ACTIVE'`.

## New response headers: CORS (all routes, cross-origin requests only)

Applies uniformly to every route already defined in `openapi.yaml` (`/events`, `/events/:eventId`,
`/events/:eventId/registrations`, `/events/:eventId/registrations/:attendeeRef`) — this is
transport-level middleware, not a per-route contract change.

| Request condition | Response headers added |
|---|---|
| `Origin` header present and value is in the configured `CORS_ALLOWED_ORIGINS` allow-list | `Access-Control-Allow-Origin: <that origin>`, `Vary: Origin` |
| `Origin` header present but **not** in the allow-list | No CORS headers added (request still completes server-side and returns its normal status/body — the browser, not the server, is what blocks the response from reaching page JS; same-origin tools like `curl`/Postman/server-to-server calls are entirely unaffected either way) |
| `OPTIONS` preflight request (browser-issued, `Access-Control-Request-Method` header present) | `204`, with `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers` as appropriate for the allow-listed origin — handled automatically by the `cors` middleware, mounted before `requestSizeMiddleware`/`rateLimitMiddleware` so a preflight is never rejected by either |
| No `Origin` header (same-origin browser navigation, `curl`, server-to-server via `apps/web`'s `lib/api-client.ts`) | No CORS headers added, no behavior change — this is the existing, already-working path (`apps/web`'s Server Components/Server Actions call `apps/api` server-to-server today and are unaffected) |

No other security header behavior changes — `helmet`'s existing headers (CSP, `X-Frame-Options`, etc.,
already present per the live `curl` trace in `research.md`) are unaffected; `cors` is additive
middleware, not a replacement.

## Environment

| Var | New/Changed | Notes |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | New, optional (defaults to `http://localhost:3001`) | Comma-separated origin list. Validated in `env.ts` alongside every other var; `apps/api` still throws at startup on an invalid configuration, consistent with existing `env.ts` behavior. |

No existing env var changes meaning or default.
