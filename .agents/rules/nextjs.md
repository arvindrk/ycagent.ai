---
paths:
  - 'apps/web/**/*.{ts,tsx}'
  - 'apps/web/**/next.config.{js,mjs,ts}'
---

# Next.js best practices

The repo runs Next 14–15 across `apps/web/*` ([`apps/web/work-platform`](../../apps/web/work-platform) is on 15.5.9). Routers are **mixed** — some apps use App, some still use Pages. Identify which before editing.

## Identify the router first

- `src/app/` (or `app/`) → **App Router**. Components are RSCs by default.
- `src/pages/` (or `pages/`) → **Pages Router**. Everything is a client/SSR component.
- Don't cross APIs — the wrong router import is a silent runtime bug.

| Concern       | App Router                                                        | Pages Router                           |
| ------------- | ----------------------------------------------------------------- | -------------------------------------- |
| Routing API   | `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) | `next/router` (`useRouter`)            |
| Data fetching | `fetch` in server components, route handlers                      | `getServerSideProps`, `getStaticProps` |
| Metadata      | `metadata` export / `generateMetadata`                            | `<Head>` from `next/head`              |
| API routes    | `app/api/<name>/route.ts`                                         | `pages/api/<name>.ts`                  |

## Prefer the App Router for new features

Default to the App Router for new pages — even in Pages-only apps. Next supports both side-by-side, so a self-contained new route can land in `src/app/` while existing Pages stay put. You get server components, streaming, and `next/navigation` for free.

Stay in Pages only when the new feature must share layout, providers, or navigation state with existing Pages routes and refactoring isn't worth it.

## App Router specifics

- Default to Server Components. Add `'use client'` only when the file uses state, refs, browser APIs, or event handlers.
- Don't pass non-serializable values (functions, class instances) from server to client as props — Next throws at the boundary.
- `import 'server-only'` at the top of modules that must never reach the client (DB clients, secrets).
- React Query is for client-driven data. For initial page data, fetch on the server and pass it down or hydrate.

## Push `'use client'` to the leaves

The directive marks where Server Components stop and Client Components begin. Mark the smallest interactive piece. Anything imported from a `'use client'` file ships in the client bundle.

```tsx
// ✗ wrong — whole page is now client, no RSC benefit
'use client';
export default function Page() {
  return (
    <div>
      <ProductDetails />
      <AddToCartButton />
    </div>
  );
}

// ✓ right — only the interactive button crosses the boundary
// AddToCartButton.tsx is 'use client'; Page.tsx stays a Server Component
```

A Server Component can render a Client Component, and a Client Component can receive Server Components as `children` — compose at the leaves to keep the server tree deep.

## Layouts persist across navigation — don't fetch user-scoped data there

`layout.tsx` mounts once per segment and stays mounted on child navigation. Data fetched in a layout will **not refetch** when the child page changes — that's the point. Don't put per-page or user-scoped data in a layout; that goes in `page.tsx` (or a child server component). Reserve layouts for shell UI and segment-stable data.

Layouts also don't receive `searchParams`. If a layout needs URL query state, read it in the page and pass it down — or use `useSearchParams` in a client component inside the layout.

## `loading.tsx`, `error.tsx`, `not-found.tsx`

Route-segment files wrap the segment in the matching React boundary:

- `loading.tsx` — Suspense fallback. Shown immediately on navigation.
- `error.tsx` — Error boundary. Must be a Client Component (receives `reset`). Doesn't catch errors thrown in the sibling `layout.tsx` — wrap a parent in its own `error.tsx` if the layout can throw.
- `not-found.tsx` — UI for `notFound()` and unmatched routes in the segment.

Place them at the segment where the fallback should appear. `app/dashboard/loading.tsx` covers `app/dashboard/**`; nesting `app/dashboard/orders/loading.tsx` overrides it for that subtree.

## Stream slow data with `<Suspense>`

`loading.tsx` blocks the whole segment. For finer-grained streaming, wrap the slow component so the rest of the page ships immediately:

```tsx
export default function Page() {
  return (
    <>
      <Header />
      <Suspense fallback={<PostsSkeleton />}>
        <Posts /> {/* async server component, slow fetch */}
      </Suspense>
    </>
  );
}
```

Kick off independent fetches in parallel with `Promise.all` — sequential `await`s in one component serialize requests that didn't need to be.

## `useSearchParams` requires a `<Suspense>` boundary

`useSearchParams` reads URL state on the client. It forces the **closest Suspense boundary** to client-side render, and `next build` fails on a static route calling it without a wrapping `<Suspense>`. Wrap tightly so the rest of the route stays prerendered:

```tsx
// app/page.tsx — server component
<Suspense fallback={<FilterBarSkeleton />}>
  <FilterBar /> {/* 'use client', calls useSearchParams */}
</Suspense>
```

For server-side reads, take the `searchParams` prop on `page.tsx` — that path doesn't bail out the route.

## Route groups `(group)` and `generateStaticParams`

- `(group)` folders organize routes without affecting the URL — share a `layout.tsx` across a section (`(marketing)/about`, `(marketing)/pricing`) without prefixing the path.
- For dynamic segments (`[slug]`) you want prerendered at build, export `generateStaticParams` returning known params. Unreturned routes render on-demand (`dynamicParams`, default `true`). Use for finite sets (blog posts, docs); skip for unbounded sets (user profiles).

## Cache invalidation: `revalidatePath` / `revalidateTag`

For server-side mutations, invalidate explicitly instead of waiting for `revalidate` to elapse:

```ts
import { revalidatePath, revalidateTag } from 'next/cache';

revalidatePath('/dashboard'); // invalidate a specific route
revalidateTag('user'); // invalidate every fetch tagged 'user'
```

Tag fetches at the call site (`fetch(url, { next: { tags: ['user'] } })`) so one `revalidateTag('user')` covers every consumer.

## Route handlers (`app/api/<name>/route.ts`)

- One async function per HTTP method (`GET`, `POST`, …). The function name **is** the method.
- Return `Response.json(...)` or `new Response(...)`. Reach for `NextResponse` only for cookies, redirects, or rewrites.
- In Next 15, `GET` handlers are dynamic by default. Add `export const revalidate = N` or `export const dynamic = 'force-static'` to cache.
- `params` is a Promise in Next 15: `{ params }: { params: Promise<{ id: string }> }`. Await before reading.
- Keep handlers thin — validate, call a service, return. Logic lives in shared modules.

## Edge vs Node runtime

Pages and handlers default to Node. Opt into edge with `export const runtime = 'edge'` only when you need low-latency reads at the edge. Edge has no Node APIs — no `fs`, no native `Buffer`, no npm packages depending on them; `node:` imports fail the build. Default to Node.

## `next/link` prefetch defaults

`<Link>` prefetches when it enters the viewport (production only). Default "auto": static routes fully prefetched; dynamic routes prefetch to the nearest `loading.tsx`. Disable with `prefetch={false}` for links users are unlikely to follow (long lists, deep admin actions) — prefetching a hundred dashboard rows wastes bandwidth.

## Pages Router specifics

- Use `getServerSideProps` / `getStaticProps`. Don't reach for `getInitialProps` — it disables automatic static optimization.
- API routes live at `pages/api/**`. Keep handlers thin; put logic in shared modules.

## Caching (Next 15 changed defaults)

`fetch` is no longer cached by default in Next 15. Be explicit when correctness depends on it:

```ts
await fetch(url, { cache: 'force-cache' }); // opt in
await fetch(url, { cache: 'no-store' }); // never cache
await fetch(url, { next: { revalidate: 60 } }); // ISR-style
await fetch(url, { next: { tags: ['user'] } }); // tag for revalidate*
```

## Built-in primitives over hand-rolled ones

- `next/image` instead of `<img>` — sizing, lazy loading, format negotiation.
- `next/link` instead of `<a href>` for in-app navigation — preserves client-side routing.
- `next/font` instead of a `<link>` to Google Fonts — kills a render-blocking request and FOUT.

## Environment variables

- `process.env.NEXT_PUBLIC_*` is **inlined into the client bundle**. Secrets stay without the prefix and are read on the server only.
- Don't read non-`NEXT_PUBLIC_` vars in client components — `undefined` at runtime.

## Heavy client-only code

`next/dynamic` with `ssr: false` for browser-only libraries (charts, editors, WebRTC, monaco, glide-data-grid):

```ts
const Editor = dynamic(() => import('./Editor'), { ssr: false });
```

Watch the bundle budget — see `size-limit` in [`apps/web/work-platform/package.json`](../../apps/web/work-platform/package.json).

## Redirects and rewrites

Prefer server-side `redirect()` (App Router) or `redirect` from `getServerSideProps` (Pages) over client-side `router.push` in an effect — the server form ships no extra JS.
