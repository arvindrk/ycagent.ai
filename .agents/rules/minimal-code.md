# Write minimal code

Write the least code that solves the problem. Read this whenever you're tempted to add scaffolding the requirement didn't ask for.

## Don't

- Add abstractions, layers, or helpers without a concrete second caller.
- Write defensive code for cases that can't happen — type checks for impossible types, fallbacks, redundant validation.
- Use multiple `try/except` blocks where one suffices. Don't catch errors you don't have a recovery path for.
- Add custom serializers, registries, or generic utilities when a direct expression works.
- Leave self-explanatory comments (`# initialize the object`, `// filter users`). Delete implementation comments after the change is done. The code should explain the *what*; comments are for non-obvious *why*.

## Do

- Pick the simplest expression that compiles and reads cleanly.
- Compute values at the use site rather than caching state for them.
- Prefer one well-named function over three with internal helpers.
- Delete code that's no longer reachable in the same change.

If you find yourself adding lines just to make the structure feel "complete," remove them.
