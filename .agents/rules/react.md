---
paths:
  - 'apps/web/**/*.{ts,tsx}'
  - 'packages/web/**/*.{ts,tsx}'
---

# React best practices

Repo runs **React 18** (pnpm catalog `react18`, [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml)). Don't write code that depends on React 19 features (`use()`, `useOptimistic`, Server Actions) — they don't apply here.

For Effects, see [`react-useeffect.md`](react-useeffect.md). For refs, see [`react-ref.md`](react-ref.md). This file is everything else.

## Composition

- Pass `children` (or named slots: `header`, `footer`) instead of threading data through a context that only exists to skip prop-drilling.
- Don't use `cloneElement` to inject props into children. Expose a prop or use a render prop.

## Don't pre-memoize

`useMemo`, `useCallback`, and `React.memo` are for measured hot paths, not "just in case". The lint plugin (`react-hooks/preserve-manual-memoization`) flags places where memoization actually matters — wait for it.

## Keys

- Stable, item-derived `key` on dynamic lists (`item.id`).
- Index keys are only safe for lists that never reorder or insert in the middle.
- A wrong key causes lost form state and broken animations on reorder.

## Conditional rendering

- Deeply nested ternaries inside JSX are unreadable — extract a helper or component.

## Don't define components inside components

```tsx
// ✗ wrong — Row is a new function every render; React unmounts/remounts the subtree
function Table() {
  function Row({ x }: { x: number }) {
    return <tr>{x}</tr>;
  }
  return rows.map(x => <Row x={x} />);
}

// ✓ right — define Row at module scope (or inline the JSX)
```

## Forms: pick controlled or uncontrolled and stay there

- Controlled (`value` + `onChange`): explicit, easy to validate, fine for small forms.
- Uncontrolled (refs / `defaultValue`): DOM is the source of truth, no re-render per keystroke. Useful for large forms where you only need values on submit.
- TanStack `react-form` is a third option — controlled-style bindings backed by a state engine outside React. See [`frontend-conventions.md`](frontend-conventions.md).
- Don't oscillate between the two for the same input.

## Error boundaries at meaningful seams

Wrap routes, panels, or coherent UI regions — not every component. An error boundary inside a button is noise.

## One concern per component

If a component has more than ~3 effects, multiple `useReducer` shapes, or renders entirely different UIs depending on a mode flag, split it. Smaller components are easier to memoize, test, and replace.
