---
name: harness-planner
description: Generic exhaustive planner support. Produces/maintains horizon slice from vision + categories using Ruflo for state and optional sub-agents. Called conceptually from orchestrator procedure. Decoupled: loads project files only.
---

1. Load vision.md, categories.json, current horizon (Ruflo "harness:horizon" or agent/harness/horizon.json), feature_list, PROGRESS.
2. Use memory_search for past decisions on vision/horizon/balance.
3. If needed, propose horizon update (use agent_spawn for sub-agents e.g. vision-align, category-balance, lookahead-decompose when complex):
   - Map tasks to vision goals.
   - Score proposed next 3-5 for category distribution (weights + no excessive repeats across slice/recent).
   - Respect depends_on and unblocked.
4. Persist horizon slice + mix summary to Ruflo memory (and optionally file).
5. Return the immediate next item + rationale (vision link, category contribution).
6. Record any planning notes to PROGRESS (or let main flow do it).

The main orchestrator prompt sequences this before execution. Sub-agents (via Ruflo spawn) can be used for individual steps above when the lookahead is complex.

This skill + vision/categories/horizon make the planner extensible, scalable (sub-agents + memory), and decoupled from repo business logic. Harness core never embeds domain prefs.