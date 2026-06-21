# Harness Core (Generic / Extensible)

This directory (and related `agent/local/`, `agent/vision.md`, `agent/categories.json`, `.agents/`) holds the reusable parts of the autonomous continuation harness.

The goal is decoupling: harness mechanics and planner logic are generic. Repo "business" (direction, categories, specific rules, app domain tasks) live in project files.

## How the Planner is Extensible and Scalable
- Vision and categories are external project files read at run time.
- Horizon state in `agent/harness/horizon.json` + Ruflo memory "harness:*".
- `harness-planner` skill + updated orchestrator prompt define the flow: recon, plan with possible Ruflo sub-agents (spawn for align/balance/decompose), execute one, record.
- To extend: add new categories, update vision, implement custom skills for planner facets, use more Ruflo hooks/memory.
- Scalable: sub-agents for facets reduce context load; memory learns balance over runs; supports longer horizons without one-shot complexity.

## Key Extension Points
- `agent/vision.md`: Platform direction and goals. Planner aligns work to this.
- `agent/categories.json`: SDLC work types + weights for balance in horizons.
- `.agents/rules/*.md`: Always-on instructions (generic + project).
- `.agents/skills/harness-*.md` or project skills: Pluggable workflows (e.g. harness-planner).
- Ruflo memory: Namespaces like "harness:vision", "harness:horizon" for persistent state across runs.
- `agent/harness-config.json`: Optional overrides (gh_repo, display_name, agent_cmd, agent_model, planner mode). Supports any CLI agent (grok, claude, etc.).
- Event system (`agent/local/lib.sh` emit): Extend for new phases.

## Planner / Executor Separation (locked design)
The harness now runs **two sequential agent invocations** (configurable provider) inside the same worktree (Approach A):

1. **Planner run** (`agent/harness/planner-prompt.md`)
   - Read-only + artifact-only.
   - Produces the structured Plan (JSON + MD) with vision_refs, category balance, chosen_task, horizon_after, principles, constraints, etc.
   - Updates horizon in Ruflo memory + `agent/harness/horizon.json`.
   - Can use Ruflo sub-agents for vision alignment, category scoring, decomposition.
   - Writes to `.codex/tmp/plan-<ts>.json` + `.md`.

2. **Executor run** (`agent/harness/executor-prompt.md`)
   - First-principles based.
   - Must locate and load the Plan artifact first.
   - Verbatim restates relevant principles from the Plan + AGENTS.md + .agents/rules + vision.
   - Implements **only** the chosen_task inside the execution_constraints.
   - Produces the final `run-summary.json` (the only one that triggers commit/PR).

The bash wrapper (`continue.sh`) sequences them:
- Runs planner → captures `planning.stream.jsonl` → emits `phase=planning`
- Discovers the plan artifact
- Injects full plan content into executor prompt
- Runs executor → captures `execution.stream.jsonl` → emits `phase=execution`
- Only executor's run-summary drives commit + draft PR

This gives clean separation of concerns, makes both first-class (easy to evolve/swap), supports longer-horizon planning without polluting the implementation run, and preserves single-threaded writes + one PR per continuation.

The old combined `continue-prompt.md` is deprecated in favor of the two dedicated personas.

## How to Customize / Port
- Edit vision + categories for your direction + balance targets.
- Add/update rules/skills in .agents/.
- The bash layer derives repo identity; override via harness-config.json.
- See top-level AGENTS.md for operating model.
- To add new planner behavior: new skill + reference from prompt or feature-planning.

## Provider Agnosticism & Backwards Compatibility
The core harness (watcher, worktree management, events, PR coordination) is deliberately independent of any specific agent provider (Grok, Claude, Codex, etc.).

- Use `AGENT_CMD` / `AGENT_MODEL` env vars or `agent/harness-config.json` to switch the underlying CLI.
- New runs use `harness/continue-local-*` branches.
- Inflight/PR detection continues to recognize legacy `grok/continue-local-*` and `codex/continue-local-*` prefixes.
- `[skip codex]` (and `[skip harness]`) still works for skip markers.
- `.codex/` paths are harness scratch space (not tied to the old Codex tool).

This prevents breakage on provider switches. The planner/executor prompts are the only place that may have mild provider assumptions (MCP tool names, etc.), but the infrastructure does not.

## Scalability Notes
- Sub-agents (Ruflo agent_spawn / swarm) for complex planning facets.
- Memory for cross-run learning (past mixes, vision drift).
- Single-threaded writes via worktrees; reads fan out.
- Configurable via categories weights, max horizon in future harness-config.

## Files
- orchestrator base logic lives in updated continue-prompt.md (generic procedure).
- See parent agent/ for state (feature_list, PROGRESS).

Run `npm run logs` to observe.

This structure follows the "repo itself is the harness" pattern while making it portable and ready for richer planning.