---
name: codex-pr-review
description: Review ycagent.ai changes before creating a draft PR. Use after code or config changes and before pushing a branch.
---

1. Run `git diff --stat` and `git diff --check`.
2. Review the diff against `AGENTS.md` and `.agents/rules/*.md`.
3. Run the relevant verification command. For broad changes, use `npm run lint && npm run typecheck && npm run build`.
4. Spawn or emulate an adversarial review pass that sees only the diff and requirements.
5. Fix P0/P1 findings before opening a draft PR.
6. Include verification evidence in the draft PR body.
