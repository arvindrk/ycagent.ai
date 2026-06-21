---
paths:
  - 'apps/web/**/*.{ts,tsx}'
  - 'packages/web/**/*.{ts,tsx}'
---

# TypeScript best practices

Type-system discipline for the web codebase. Repo config is `strict: true` with `noUncheckedIndexedAccess` ([`packages/web/config-typescript/base.json`](../../packages/web/config-typescript/base.json)) — write to that.

## Avoid `any`

- Use `unknown` for values whose type isn't yet known, then narrow.
- `@typescript-eslint/no-explicit-any` already warns. Fix the type, don't silence.
- Reach for generics when a function works over multiple types — don't paper over with `any`.

## Don't lie with `as`

Type assertions disable the checker. Avoid them.

```ts
// ✗ wrong — widens to the asserted type, no verification
const config = { mode: 'dark' } as Config;

// ✓ right — verifies the shape, keeps "dark" as a literal
const config = { mode: 'dark' } satisfies Config;
```

- Narrow runtime values with `typeof` / `in` / custom predicates, not `as`.
- The non-null `!` assertion is also a lie. Narrow, or throw with a real message if "impossible" really is.

## Type predicates and `asserts`

When `typeof` / `in` / `instanceof` aren't enough, write a predicate or assertion function — they verify at runtime, unlike `as`.

```ts
// Type guard — returns boolean, narrows in the caller's scope
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null && 'id' in x && 'email' in x;
}

// Assertion function — throws if invalid, narrows after the call
function assertNonNull<T>(x: T): asserts x is NonNullable<T> {
  if (x == null) throw new Error('expected non-null');
}
```

Predicates fit `if (isUser(x)) { … }`; `asserts` fits invariants you want to crash on. Both are real runtime checks.

## `catch (e)` is `unknown`

With `strict: true` (which enables `useUnknownInCatchVariables`), `e` in a `catch` is `unknown`. Narrow before reading anything off it:

```ts
try {
  await saveDraft(form);
} catch (e) {
  if (e instanceof ApiError) handleApi(e);
  else if (e instanceof Error) report(e.message);
  else report(String(e));
}
```

Don't write `(e as Error).message` or `e as any` — anything can be thrown (strings, POJOs, `null`). Pair with the `Errors` section in [`javascript.md`](javascript.md), which says to throw `Error` instances from your own code so the receiver has something to narrow to.

## No `enum`

Use string-literal unions or `as const` objects:

```ts
// ✗ avoid
enum Status {
  Active = 'active',
  Archived = 'archived',
}

// ✓ string-literal union — simplest when you only need the type
type Status = 'active' | 'archived';

// ✓ as const object — when you also want a runtime namespace
const Status = { Active: 'active', Archived: 'archived' } as const;
type Status = (typeof Status)[keyof typeof Status];
```

Why avoid `enum`:

- **Emits runtime code that doesn't tree-shake.** Unlike most TS syntax, `enum` emits a real JS object (plus a reverse-lookup map for numeric enums), and bundlers can't drop unused members — the whole object ships. Unions vanish at compile time; `as const` objects are objects you'd write anyway. Numeric enums also put both keys *and* values in that object, so `Object.values(Status)` returns twice what you expect.
- **Numeric enums aren't type-safe.** `enum Color { Red, Green }` accepts any `number` — `takeColor(42)` type-checks. String-literal unions only accept the listed strings.
- **`const enum` is a trap in this repo.** [`packages/web/config-typescript/base.json`](../../packages/web/config-typescript/base.json) sets `isolatedModules: true`, which disallows `const enum` — per-file transpilers (Babel/SWC, used by Next.js + Jest) can't inline them.
- **Nominal, not structural.** `Status.Active` isn't assignable to a plain `"active"` from JSON, URL params, or a DB row — even though they're identical at runtime. You also can't union or widen two enums across module boundaries. Unions compose with `|` and `&`.

## `interface` vs `type`

- `interface` for exported shapes that may be extended or merged.
- `type` for unions, tuples, mapped/conditional types, and aliases.
- Don't churn between the two for the same shape — pick one.

## Discriminated unions for multi-shape state

```ts
type Result<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

Better than optional booleans (`isLoading`, `isError`) — the compiler enforces the cases.

## Exhaustiveness with `never`

Pair discriminated unions with an exhaustiveness check so adding a variant breaks the build:

```ts
function render(state: Result<User>) {
  switch (state.status) {
    case 'loading':
      return <Spinner />;
    case 'success':
      return <UserCard user={state.data} />;
    case 'error':
      return <ErrorBanner error={state.error} />;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
```

Adding `case 'idle'` to `Result` makes `_exhaustive: never = state` fail to compile until the new case is handled. `@typescript-eslint/switch-exhaustiveness-check` would enforce this but isn't enabled in the repo — write the `never` line manually.

## Branded types for IDs

Plain `string` IDs let agents pass a `JobId` where a `UserId` is expected. Brand them so the compiler distinguishes:

```ts
type UserId = string & { readonly __brand: 'UserId' };
type JobId = string & { readonly __brand: 'JobId' };

function getUser(id: UserId): Promise<User> { … }

declare const jobId: JobId;
getUser(jobId); // ✗ compile error — JobId is not assignable to UserId
```

Zero runtime cost — brands exist only at compile time. Use sparingly: IDs that cross module / API / URL boundaries benefit most. Throwaway strings don't need it.

## `readonly` for inputs

Mark props and config `readonly` (or use `Readonly<T>` / `ReadonlyArray<T>`). Mutating an input from a child causes "why did this re-render?" bugs.

## Handle `T | undefined` from indexed access

`noUncheckedIndexedAccess` is on. `arr[0]` is `T | undefined`:

```ts
const first = users[0];
if (!first) return null;
// `first` is `User` here
```

## `import type` for type-only imports

```ts
import type { User } from './types';
```

Smaller bundles, prevents accidental side-effect imports, makes intent obvious.

## Don't use `Function`, `Object`, `{}`

- `Function` accepts anything callable, including `String`. Type the actual signature: `(x: number) => boolean`.
- `Object` / `{}` match everything except `null`/`undefined`. Use `Record<string, T>` or `unknown`.

## Use the built-in utility types

`Pick`, `Omit`, `Partial`, `Required`, `Parameters`, `ReturnType`, `Awaited` cover most subset/derivation needs. Hand-rolling invites drift.
