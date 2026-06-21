# ycagent.ai Platform Vision

This harness and the platform it develops aim for a reusable, autonomous development loop for personal/agentic TS repos, with strong safety, observability, and planning.

## Current Direction
- Build reliable YC company discovery + deep research agents (search, crawl via E2B/Firecrawl/Serper/X, LLM extraction/synthesis, semantic search, evals).
- Make the agent harness itself (this agent/ + .agents/ structure) the primary value: extensible, decoupled, scalable planner/orchestrator using Ruflo for memory + sub-agents.
- Follow SDLC balance: new features, improvements, tech debt, maintenance, testing/observability/infra, DX, innovation.
- Long-horizon planning: explicit vision alignment + category-balanced lookahead (3-5 steps) before execution.
- Single-threaded writes (worktrees), fan-out reads, human gates only on merges/deploys.

## Strategic Goals
- Decouple harness mechanics from any one repo's business logic so it ports easily.
- Enable exhaustive planner that looks ahead using vision + categories.
- Improve research agent quality via better evals, error recovery, coverage.
- Observability for the loop itself (events, logview, reports).

## Success Signals
- Planner produces horizon slices that advance goals and maintain category mix.
- New repos can adopt the harness with only vision.md + categories + .agents/ tweaks.
- Research runs produce verifiable, sourced dossiers with minimal hallucination.
- Continuation PRs are small, reviewable, and accumulate toward the vision.

See agent/categories.json for work types and agent/harness/ for planner mechanics.
Update this file (with rationale in PROGRESS) when direction shifts.