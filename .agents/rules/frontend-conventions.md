---
paths:
  - 'apps/web/**/*.{ts,tsx}'
  - 'packages/web/**/*.{ts,tsx}'
---

# Frontend conventions

## Dates

- Use `dayjs` for all date manipulation.
- Don't use `moment` or `moment-timezone`.

## Components

- Reuse shared components from `@repo/ui` whenever one fits. Don't build custom modals, buttons, dropdowns — extend `@repo/ui` or contribute upstream.
- For overlays and disclosure (dialog, popover, tooltip, dropdown, tabs, accordion), use `@repo/ui` or Radix primitives directly. Never hand-roll — Radix handles focus trap, escape, scroll lock, ARIA, and keyboard nav. Hand-rolled versions break at least one.

## Styling

- **Design tokens, not arbitrary values.** Use `text-foreground`, `bg-primary`, `w-64` — not `text-[#abc123]` or `w-[127px]`. Missing tokens go in [`packages/web/ui/tailwind.config.js`](../../packages/web/ui/tailwind.config.js), not as literals in components.
- **Use `cn` from `@repo/ui` for conditional classes.** It wraps `clsx` + `tailwind-merge` ([source](../../packages/web/ui/src/utils/index.ts)). `cn(base, active && 'foo')` over string concatenation. `twMerge` also drops duplicates so a consumer's `bg-red-500` cleanly overrides a component's `bg-gray-100`. Don't import raw `clsx` / `twMerge` or re-implement `cn`.
- **No inline `style` for static values.** Reserve `style={{ }}` for values that change at runtime (computed positions, JS-driven animations). Static colors, sizes, spacing belong in Tailwind classes.

## Animation

- For simple state transitions (hover, focus, mount), use Tailwind's `transition-*` or CSS keyframes. No JS cost.
- For orchestrated or gesture-driven animation, use `framer-motion` / `motion` (already in deps). Don't add a competing library.
- **Don't wrap `position: fixed` elements in `motion.div`.** It creates a transform-containing-block that traps `position: fixed` to the parent — fixed bars stop sticking. Animate inner content, or use plain CSS transitions.
- Prefer animating `transform` / `opacity` over `width`, `height`, `top`, `left` — only the former are compositor-friendly; the others trigger layout/paint per frame.

## Utilities

Don't reinvent `debounce`, `throttle`, `cloneDeep`, `chunk`, `groupBy`, `keyBy`, `omit`, `pick`, `isEqual`, etc.

- **Native first.** `structuredClone`, `Object.entries`/`fromEntries`, `Array.prototype.{toSorted,toReversed,with,flatMap}`, `Object.groupBy`, `?.`, `??` are free.
- **Then anything already in the package.** lodash is the common case — [`work-platform`](../../apps/web/work-platform/package.json), [`team-platform`](../../apps/web/team-platform/package.json), and [`mercor-site`](../../apps/web/mercor-site/package.json) already depend on it.
- Import per-function for tree-shaking: `import debounce from 'lodash/debounce'`, not `import { debounce } from 'lodash'`.
- **Don't add a library to a package that doesn't have it** for one helper. Write the three lines, or use a native API.

## Accessibility

- Use semantic HTML. `<button>`, `<a href>`, `<label>`, `<nav>`, `<main>` carry roles, focus, and keyboard behavior for free. `<div onClick>` carries none.
- Every input gets a label — `<label htmlFor>` or wrap the input. `aria-label` is a fallback for icon-only controls.
- If a click works, `Enter`/`Space` must too. The shared ESLint config warns on `jsx-a11y/click-events-have-key-events` and `jsx-a11y/no-static-element-interactions`.
- Preserve visible focus. Don't blanket-remove the ring; use a `:focus-visible` style that still indicates focus.
- Images: meaningful ones need a describing `alt`. Decorative ones use `alt=""` so screen readers skip them.
- Reach for ARIA only when semantic HTML can't express the role. ARIA on top of correct semantics usually breaks more than it fixes.

## Forms

- For [`apps/web/work-platform`](../../apps/web/work-platform), use `@tanstack/react-form` (already in deps). Don't add a competing form library.
- Surface validation errors next to the field via `aria-describedby`; mark invalid inputs `aria-invalid="true"`.
- Disable submit while the request is in flight. Don't rely on the user not double-clicking.
- For long forms, prefer uncontrolled inputs (or `react-form`'s field API) over re-rendering the whole tree per keystroke.

## Feature flags

The repo uses PostHog for feature flags.

- **Render a fallback while flags load.** Don't render one variant then swap when PostHog resolves — that's a visible flash. Show a skeleton, then the resolved variant.
- **Remove the flag and dead branch within ~2 weeks of full rollout.** Permanent flag-gated branches rot — types, tests, and design drift past them.
- **Don't gate security-sensitive logic on a client-side flag.** The flag ships to the browser; an attacker reads it and ignores it. Use a server-side check.
- Use the PostHog hooks (`useFeatureFlagEnabled`, `useFeatureFlagPayload`). Don't fetch flag values manually into `useState`.

## SSR-safe browser APIs

`localStorage`, `sessionStorage`, `window`, `document`, `navigator`, `window.matchMedia` don't exist on the server. Reading them at module scope or during server render throws `ReferenceError`.

- **Pages Router**: read inside `useEffect`, or guard with `if (typeof window !== 'undefined')`.
- **App Router**: the file must be `'use client'` to touch these. Even then, prefer `useEffect` — Client Components still render once on the server for hydration.
- **Never** call these at module scope. Hoist into a function or hook so the call happens after mount.

## Long lists & tables

Virtualize when a list might exceed ~100 rows — candidates, jobs, payouts, message histories.

- Use `@tanstack/react-virtual` (already in deps). Don't add `react-window` or `react-virtualized`.
- Virtualization breaks naive `Ctrl+F` and linear screen-reader navigation. Pair it with a search/filter UI.
- Don't virtualize bounded lists (≤ ~50 rows). The DOM cost is negligible and the complexity (focus management, row-height measurement) isn't worth it.

## Performance

- Use `next/dynamic` (`ssr: false` when needed) for browser-only or heavyweight modules — charts, editors, video, WebRTC. Don't ship them on the initial route.
- Lazy-load below-the-fold images with `next/image` defaults; mark above-the-fold hero images `priority`.
- Watch the bundle budget. [`apps/web/work-platform`](../../apps/web/work-platform/package.json) enforces `size-limit` on main/framework chunks.
- Don't block the main thread with sync work in render. Move expensive computation to `useMemo`, a worker, or the server.
