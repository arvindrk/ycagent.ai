# TypeScript Rules

- Keep `strict` TypeScript clean. Do not use `any`; narrow `unknown`.
- Prefer `satisfies` over `as` when validating object shape.
- Avoid non-null assertions. Narrow or throw with a useful error.
- Use string-literal unions or `as const` objects instead of `enum`.
- Use `import type` for type-only imports.
- Mark shared inputs as `readonly` where practical.
- Treat `catch (error)` as `unknown`.
