# React Rules

- Derive render values instead of syncing them through `useEffect`.
- Use `useEffect` only for external systems: subscriptions, observers, timers, analytics impressions, or imperative third-party APIs.
- Keep state close to where it is used.
- Use React Query for server state; do not mirror server responses into local/global state.
- Use stable item IDs for keys. Do not use index keys for reorderable lists.
- Prefer semantic HTML and keyboard-accessible controls.
- Do not preemptively add `useMemo`, `useCallback`, or `React.memo` without a measured need.
