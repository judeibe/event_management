# Phase 0 Research: Events Landing Page

No `NEEDS CLARIFICATION` markers remained in the Technical Context, so this research focuses on the one real technical decision the feature requires: how to make `/` show the events list.

## Decision 1: How the base address (`/`) shows the events list

**Decision**: Replace the current `create-next-app` scaffold in `apps/web/src/app/page.tsx` with a server-side redirect (`redirect("/events")` from `next/navigation`) to the existing `apps/web/src/app/(dashboard)/events/page.tsx` route.

**Rationale**:
- **Reuses existing, working code.** `/events` already handles data fetching (`apiClient.get<EventResponse[]>("/events")`), the empty/error state (`Card` fallback), and the sidebar layout (`(dashboard)/layout.tsx`). A redirect needs zero new UI code and cannot drift out of sync with `/events`.
- **Sidebar active-state works with no extra code.** `AppSidebar` (`apps/web/src/components/app-sidebar.tsx:43`) marks a nav item active via `pathname === item.url`, and the "Events" item's `url` is `"/events"` (`app-sidebar.tsx:23`). After the redirect, `usePathname()` reports `/events`, so the existing check satisfies FR-004 without touching `app-sidebar.tsx`. (An alternative that rendered events content directly at `/` without changing the URL would leave the sidebar showing no active item, since `pathname` would be `/`, not `/events` — an avoidable regression.)
- **Keeps `/events` fully intact for bookmarks/links (FR-005).** Nothing about `/events` changes, so existing links keep working exactly as before.
- **Negligible cost.** One extra redirect hop, well within normal web navigation performance expectations; no added API calls (constitution Principle IV).

**Alternatives considered**:
1. **Duplicate the events page markup/logic at the root route.** Rejected — creates two copies of the same data-fetching/rendering logic that can silently drift apart, violating the "Code Quality First" constitution principle (no duplicated logic).
2. **Render the same Server Component at both `/` and `/events` by importing it into a new file at `apps/web/src/app/(dashboard)/page.tsx`, no redirect.** Rejected — the URL stays `/` after landing, which technically satisfies FR-001, but `AppSidebar`'s `pathname === "/events"` check would then be `false` at the root, showing no active sidebar item (breaks FR-004) unless sidebar matching logic is also changed. That's an avoidable second file/logic change for no material benefit over the redirect, since the spec's Assumptions section already treats "the existing events section address stays reachable, whether the same content renders there or visitors are transparently sent between the two" as an acceptable outcome.
3. **Client-side redirect (e.g., `useEffect` + `router.push`).** Rejected — causes a visible flash of empty content before the redirect fires; `next/navigation`'s server-side `redirect()` avoids that and is the idiomatic Next.js App Router approach for this case.

## Decision 2: Redirect semantics

**Decision**: Use Next.js's default (temporary, 307) redirect via `redirect("/events")` — not `permanentRedirect`.

**Rationale**: The relationship between `/` and `/events` is an internal application routing choice, not a permanent URL migration for external consumers/SEO purposes; a temporary redirect is the conventional default and avoids browsers/caches hard-pinning the redirect if the approach changes later.

**Alternatives considered**: `permanentRedirect` (308, cacheable) — rejected as unnecessary for an internal single-page-app navigation with no external SEO requirement documented in the spec.

## Open questions

None — all `NEEDS CLARIFICATION` items from the Technical Context are resolved above.
