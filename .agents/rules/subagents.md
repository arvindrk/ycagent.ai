# Use subagents to parallelize

Actively look for opportunities to split work across parallel subagents.

**Use parallel subagents when:**

- Multiple files need independent changes.
- Multiple endpoints or functions need similar modifications.
- Exploring different areas of the codebase (auth + billing, frontend + backend).
- Tasks are clearly independent (fix bug X and add feature Y in unrelated code).

**Handle directly when:**

- Single file edit or quick lookup.
- Sequential dependencies exist between steps.
- The subagent overhead isn't worth it for a one-line operation.

**Default:** when uncertain whether tasks are independent, split into parallel subagents for speed.
