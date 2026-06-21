---
paths:
  - 'apps/web/**/*.{ts,tsx}'
  - 'packages/web/**/*.{ts,tsx}'
---

# React state management best practices

Different state problems need different tools. The wrong tool ships bugs that look like "weird re-renders" or "stale data."

## Decision tree

| State you have                                                                            | Reach for                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Server data (API responses)                                                               | **React Query** (`@tanstack/react-query` v4)           |
| Local component state (`isOpen`, `inputValue`)                                            | **`useState`**                                         |
| State shared between a few siblings                                                       | Lift to nearest common parent                          |
| Complex local transitions (multi-step wizards, draft edits)                               | **`useReducer`**                                       |
| Cross-cutting client state (auth, theme, filters, drafts, selection)                      | **Zustand**                                            |
| Library providers and flow-scoped APIs (`QueryClientProvider`, multi-step flow callbacks) | **React Context** (dependency injection only)          |
| Filters / pagination / search you want bookmarkable                                       | **URL query params** (`useRouter` / `useSearchParams`) |

When a category appears in multiple rows, prefer the lower row: URL beats Zustand beats Context. Shareable / bookmarkable filters go in the URL; fall back to Zustand only for filters that must not survive a hard reload.

## `useState` / `useReducer`

- Default to `useState`. Don't reach for a global store before you've felt prop-drilling pain.
- Derive, don't store: if `fullName` is `${first} ${last}`, compute during render. See [`react-useeffect.md`](react-useeffect.md).
- Use the functional form when new state derives from old: `setCount(c => c + 1)`. The direct form reads `count` from the closure — stale if the handler fires twice in a tick (React 18 batching), after a re-render, or from an async callback / effect-attached handler.
- Use `useReducer` when the next state depends on the previous and there are several distinct transitions. A state machine is clearer than five `useState` hooks and an `if` ladder.

## React Query (server state)

One server-state library, repo-wide: TanStack React Query v4. **Don't** mirror server data into `useState` or Zustand — that's how you get stale UI.

- Use [`@lukemorales/query-key-factory`](https://github.com/lukemorales/query-key-factory) for keys. Existing pattern: [`Offer.store.ts`](../../apps/web/work-platform/src/features/offerV2/Offer.store.ts), [`location.store.ts`](../../apps/web/work-platform/src/shared/store/location.store.ts).
- Wrap each query and mutation in a custom hook (`useGetUser`, `useAcceptOffer`) so call sites don't touch `useQuery` / `useMutation` directly.
- Set `staleTime` per query. The default (always stale, refetch on focus) is rarely what you want.
- Mutations invalidate by key — `queryClient.invalidateQueries({ queryKey: keys.foo._def })` — not by manual refetch.
- Loading / error UI belongs at a **boundary** (Suspense + Error Boundary). Opt in per query with `useQuery({ suspense: true, useErrorBoundary: true })` — `useSuspenseQuery` is v5 only, not available here. In v4, `data` is still typed `T | undefined` even with `suspense: true`; assert at the call site. v5's `useSuspenseQuery` will fix this on upgrade. Don't repeat `isLoading ? … : …` at every consumer.
- Don't `useEffect` to copy query data into local state. The query result is the state.

## Zustand (cross-cutting client state)

Repo pattern: `create<T>()(devtools(persist(...)))` with a typed interface. Canonical shapes: [`auth.store.ts`](../../apps/web/work-platform/src/shared/store/common/auth.store.ts), [`referrals-filter.store.ts`](../../apps/web/work-platform/src/features/refer/stores/referrals-filter.store.ts).

- File: `<Feature>.store.ts`. Hook export: `use<Feature>Store`.
- Keep stores **narrow** — one per feature, not one giant app store. Cross-feature coupling causes painful merges and unnecessary re-renders.
- Always use the selector form: `useAuthStore(s => s.user)`. Reading the whole store re-renders on every change.
- Use the `immer` middleware (already in deps) when nested updates would be spread-spaghetti.
- `persist` only when state should survive reload (auth, filters, drafts). Skip it for ephemeral UI. Bump the version when the schema changes — existing pattern: `AUTH_STORE_VERSION`.
- Don't put server data in Zustand. (Re-read the table.)

## React Context (dependency injection only)

Use Context for **dependency injection** — wiring services and APIs into a subtree:

- Library providers: `QueryClientProvider`, theme, router, feature-flag clients.
- Flow-scoped APIs exposing callbacks/handlers to a subtree (existing examples: [`ApplyFlowProvider`](../../apps/web/work-platform/src/features/jobs/apply/contexts/ApplyFlowProvider/index.tsx), [`OffboardingContext`](../../apps/web/work-platform/src/features/offboardingV2/context/Offboarding.context.tsx), [`DeliverablesFlowProvider`](../../apps/web/work-platform/src/features/deliverables/contexts/DeliverablesFlowProvider/index.tsx)).
- Mocking services in tests.

**Not** for application state. Auth, theme, user preferences, filters — those go in Zustand. Every Context consumer re-renders on every change regardless of which field changed; that's a bug, not a feature.

## URL as state

For filters, pagination, sort, and search — anything that should be **shareable, bookmarkable, and survive reload** — use URL search params:

- Pages Router: `useRouter()` from `next/router`.
- App Router: `useSearchParams()` + `usePathname()` + `router.replace(...)` from `next/navigation`.

Don't double-source. If it lives in the URL, don't also keep it in Zustand.

## Forms

Forms have their own state engine (TanStack `react-form`, controlled inputs). Don't put live form state in Zustand or Context. See [`frontend-conventions.md`](frontend-conventions.md).

## Common antipatterns

- Fetching in `useEffect`, setting into `useState`. → React Query.
- Storing server responses in Zustand. → React Query.
- Putting frequently-changing values in Context. → Zustand or `use-context-selector`.
- Zustand for state used in one component. → `useState`.
- One global store that owns "everything." → Split per feature.
- Mirroring URL state into Zustand. → Read from the URL.
