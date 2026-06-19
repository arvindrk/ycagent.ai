# Next.js Rules

- This repo uses the App Router under `src/app`.
- Default to Server Components. Add `'use client'` only at the smallest interactive leaf.
- Do not initialize database clients or SDK clients at module scope when env vars may be missing during build; use lazy getters.
- Route handlers should validate input, call shared logic, and return a response. Keep business logic outside the handler.
- Keep non-`NEXT_PUBLIC_` environment variables server-only.
- Wrap `useSearchParams` client components in a tight Suspense boundary.
- Use `next/link` and `next/image` where applicable.
