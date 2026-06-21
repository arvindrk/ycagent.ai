---
name: feature-planning
description: Generic planner for feature work using agent/feature_list.json + vision/categories. Use after merges, roadmap changes, or failed verification. Load project vision.md and categories.json for direction and balance.
---

1. Read `agent/vision.md` (if present), `agent/categories.json` (if present), `agent/feature_list.json`, `agent/PROGRESS.md`, and recent commits.
2. Identify unblocked tasks by `depends_on`, `status`, and `passes`.
3. For lookahead: consider current horizon (via Ruflo memory or agent/harness/horizon if present), align to vision goals, score for category balance per weights.
4. Prefer tasks that advance vision while respecting approximate category distribution over the slice/recent runs. Fall back to small high-confidence improvements in reliability, observability, DX, or evals when no vision.
5. Update `feature_list.json` only for durable task state changes. Record category if set.
6. Append the rationale (vision link + category consideration) and next action to `agent/PROGRESS.md`.
7. If implementation is next, route to a single writer in a dedicated branch or worktree.
