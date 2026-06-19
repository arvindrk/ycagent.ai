---
name: feature-planning
description: Plan or reprioritize ycagent.ai feature work using agent/feature_list.json. Use after merges, roadmap changes, or failed verification.
---

1. Read `agent/feature_list.json`, `agent/PROGRESS.md`, and recent commits.
2. Identify unblocked tasks by `depends_on`, `status`, and `passes`.
3. Prefer the smallest high-confidence task that improves user-visible discovery/research quality, reliability, observability, or developer velocity.
4. Update `feature_list.json` only for durable task state changes.
5. Append the rationale and next action to `agent/PROGRESS.md`.
6. If implementation is next, route to a single writer in a dedicated branch or worktree.
