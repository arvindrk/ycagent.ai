# ycagent.ai Vision

## Platform

ycagent.ai is a Next.js 16 / React 19 YC company discovery and research platform.

- Explore the YC company directory (5,600+ companies) with rich filtering and natural-language semantic search ("W24 B2B infra startups, small team, remote").
- Research any company on-demand via an autonomous agent.
- The agent runs as a background Trigger.dev task: spins up an E2B Desktop sandbox with persistent Chromium, then executes a multi-stage loop (search → crawl → analyze → extract → synthesize). Events stream live; runs are budget-bounded and cancellable.
- Stack: Neon Postgres + pgvector (hybrid search), Trigger.dev v4 + E2B, Anthropic Claude (primary) + Gemini/OpenAI, Serper/Firecrawl/Playwright, PostHog, Better Auth.

## Harness as Primary Value

The agent harness (agent/ + .agents/ structure, planner/executor separation, Ruflo memory + sub-agents, local watcher, worktree isolation) is the primary reusable value of this repository. It is provider-agnostic, extensible, decoupled from app-domain code, and designed for scalable longer-horizon planning.

Business direction, rules, and categories live in project files so the harness can be ported.

## Vision Goals

- make-harness-primary-value: Make the agent harness itself the primary value — extensible, decoupled, scalable planner/orchestrator using Ruflo for memory and sub-agents.
- decouple-harness: Keep harness mechanics generic; repo-specific vision, categories, rules, and tasks live in documented project files (agent/vision.md, agent/categories.json, .agents/rules/*).
- exhaustive-planner: Planner performs exhaustive recon (init, files, memory, searches) but produces minimal, actionable artifacts and short (3-5 step) realistic horizons.
- category-balanced-sdlc: Maintain healthy balance across SDLC work types; avoid consecutive runs dominated by a single category.
- improve-research-agent-quality-via-better-evals: Drive research agent reliability and output quality via scenario-level semantic evals and mocked loops (zero or minimal live secrets required for core coverage).
- long-horizon-planning: Use vision + categories to support multi-step lookahead while staying unblocked and high-value.
- build-reliable-yc-company-discovery: Make filtered semantic search and company exploration robust and explainable.
- research-runs-produce-verifiable-dossiers: Research runs must return evidence-backed, source-traceable, non-hallucinated output with clear bounds.

## Current Direction

All future work must reference the vision. After bootstrap of these files, the horizon prioritizes:

1. establish-vision-categories (this, dx_infra)
2. scenario-level semantic search eval (testing_observability)
3. research-agent scenario eval with mock loop
4. harness observability loop
5. search quality improvements

## Success Signals

- Planner loads `agent/vision.md` and `agent/categories.json` and emits slices with explicit vision_refs and category mix rationale.
- Every implemented task appears in `agent/feature_list.json` with vision alignment noted in PROGRESS.
- Verify commands (lint + typecheck + build + eval smokes) stay green.
- Only draft PRs are produced; humans perform merges and deploys.
- No secrets, DB URLs, or untrusted external content are committed to vision, categories, PROGRESS, or prompts.
- Harness remains the reusable artifact: new projects can adopt the agent/ + .agents/ layout and immediately gain balanced autonomous continuation.

All work advances one or more of the goals above while respecting category weights.
