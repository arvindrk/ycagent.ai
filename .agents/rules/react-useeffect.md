---
paths:
  - 'apps/web/**/*.{ts,tsx}'
  - 'packages/web/**/*.{ts,tsx}'
---

# React `useEffect` best practices

`useEffect` synchronizes a component with an **external system**. No external system, no Effect. Most "I need an effect for this" cases are better handled with derived values, event handlers, or `key`-based remounts.

## You don't need an Effect for…

### Transforming data for rendering

Compute during render. Wrap in `useMemo` only when the computation is expensive.

```tsx
// ✗ wrong — extra render, extra state
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${first} ${last}`);
}, [first, last]);

// ✓ right
const fullName = `${first} ${last}`;
```

### Handling user events

Put the logic in the handler. The handler runs once per click; an Effect runs after every render where deps changed — and on mount — so it's easy to fire twice or fire when no user did anything.

```tsx
// ✗ wrong — fires on mount and on every render that updates `submitted`
useEffect(() => {
  if (submitted) postOrder(cart);
}, [submitted]);

// ✓ right
function handleSubmit() {
  postOrder(cart);
}
```

### Resetting state when a prop changes

Use the `key` prop to remount the subtree, or derive during render. An Effect that calls `setState` from a prop causes a redundant render and a flash of stale UI.

```tsx
// ✓ right — userId change remounts <Profile>, all its state resets naturally
<Profile key={userId} userId={userId} />
```

### Fetching data

Use the project's data layer (React Query — see [`react-state-management.md`](react-state-management.md)). Hand-rolled `useEffect + fetch` makes race conditions, double-fetches, and missing cancellation easy. If you genuinely must, gate the result with an `ignore` flag (or `AbortController`):

```tsx
useEffect(() => {
  let ignore = false;
  fetchData(id).then((data) => {
    if (!ignore) setData(data);
  });
  return () => {
    ignore = true;
  };
}, [id]);
```

### Chaining state updates

If Effect A's `setState` triggers Effect B's `setState`, the logic belongs in a single handler or a render-time computation. Each Effect-driven `setState` is an extra commit.

## You do need an Effect for…

- Subscribing to a non-React source: browser APIs (`IntersectionObserver`, `ResizeObserver`, `matchMedia`), websockets, event emitters, third-party stores.
- Imperatively driving a third-party widget when React state changes (telling a non-React chart to re-render).
- Side effects that must happen _because_ the component is on screen, not because of a user event. Analytics impressions are canonical, though most analytics here flow through PostHog autocapture rather than per-component Effects.

## Always

- List every reactive value the Effect reads in deps. Don't silence `react-hooks/exhaustive-deps` — fix the dep.
- Return a cleanup function for every subscription, timer, observer, or in-flight request the Effect starts.
- Non-primitive deps (functions, objects, arrays) must be memoized by the parent or moved inside the Effect. A fresh `{}` or `() => {}` every render fires the Effect every render — that's how infinite loops happen. If a dep keeps changing identity, fix the source.
- Write Effects to survive double-invocation: `setup → cleanup → setup` must yield the same end state as a single `setup`. The repo has `reactStrictMode: false`, so dev doesn't surface this — but the bug exists for HMR, fast refresh, and a future flag flip.
- Don't stash values in a `ref` to dodge the dep array. The lint rule surfaces a real reactive bug.
- One concern per Effect. If setup and cleanup feel unrelated, split into two.

Reference: [React docs — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect).
