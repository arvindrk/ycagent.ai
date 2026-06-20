# Watcher Log Observability — Design

**Date:** 2026-06-20
**Status:** Approved (design), pending implementation plan
**Author:** Orchestrator session (Claude Code)

## Problem

The local continuation loop's logs are flat, unstructured text. Each run writes a
~8KB `agent/brain/logs/continue-<ts>.log` that interleaves wrapper `[ts] message`
lines with raw command output and an `init.sh` dump of the entire `feature_list.json`.
The agent's reasoning/tool-use trail is essentially not captured (`claude -p` default
emits only the final message). There are no sections, no feature-lifecycle framing,
no formatting, and no cross-run view. It is hard to trace a feature from inception
through reasoning to implementation.

## Goal / Outcome

Clean, well-formatted, human-readable observability for the loop that traces each
feature from inception to implementation, including the agent's reasoning trail. A
live TUI dashboard plus static per-run reports and a cross-run feature-lifecycle view.
Well-abstracted (capture separated from presentation), extensible (new event types and
renderers compose), and scalable.

## Key Decisions (resolved during brainstorming)

1. **Capture/present split.** The loop emits a typed JSONL event stream as the single
   source of truth; renderers consume it read-only. The loop never depends on a renderer.
2. **Presentation:** a Node/TS renderer using **`ink`** (React-for-terminals) for a live
   TUI dashboard, plus static Markdown per-run reports. `react` 19 and `tsx` are already
   dependencies; only `ink` is added.
3. **Reasoning depth:** capture the **full** agent trail via
   `claude --output-format stream-json --verbose`.
4. **Lifecycle scope:** **per-run trace and cross-run feature lifecycle** (inception in
   `feature_list.json` → run(s) that selected it → reasoning → implementation → PR → status).

## Architecture

```
loop (bash wrappers)                         renderer (TS, run via tsx)
  emit_event() ─┬─▶ runs/<id>/events.jsonl ─────▶ events.ts (parse) ─▶ model.ts ─┬─▶ ink TUI
                └─▶ loop.jsonl (run-level)                                        └─▶ report.ts (Markdown)
  claude --output-format stream-json ─▶ runs/<id>/agent.stream.jsonl ─▶ (folded into model)
```

Capture is best-effort and independent of the renderer. The renderer is read-only over
the log directory. The two communicate only through the JSONL contract.

## Event schema (the contract)

JSONL, one event per line. Common fields: `ts` (ISO8601), `run_id`, `seq` (monotonic per
run), `type`. Per-type payloads:

| type | payload |
|------|---------|
| `run.start` | `base_sha`, `branch`, `watcher_pid` |
| `guard.inflight` | `excluded` (string[]), `cap`, `count` |
| `feature.selected` | `feature_id`, `title`, `priority`, `why`, `depends_on` (string[]) |
| `phase.start` / `phase.end` | `phase` (one of `fetch`,`worktree`,`init`,`orchestrate`,`verify`,`commit`,`push`,`pr`), `duration_ms` (on end) |
| `impl.changes` | `files` (string[]), `additions`, `deletions` |
| `verify.result` | `command`, `passed` (bool), `summary` |
| `pr.opened` | `number`, `url`, `title` |
| `run.end` | `status` (`completed`,`no-changes`,`failed`,`skipped`), `duration_ms`, `reason` |

The raw agent reasoning trail lives in `agent.stream.jsonl` (claude's native stream-json:
`assistant` messages, `tool_use`, `tool_result`, `result`). The renderer interleaves it
with `events.jsonl` by timestamp for the unified timeline. `events.ts` is the
authoritative TS type union; `lib.sh emit_event` must produce matching JSON.

## Components

### Capture (bash, in the existing harness)
- `agent/local/lib.sh`: add `emit_event TYPE key=value …`. Builds a safe JSON line with
  `jq -nc` (jq 1.7.1 is installed), stamps `ts`/`run_id`/`seq`, appends to the run's
  `events.jsonl`, and (for run-level types: `run.start`, `feature.selected`, `pr.opened`,
  `run.end`) also to `loop.jsonl`. Also prints one clean, colored single-line summary to
  stdout so the watcher Terminal stays readable. `run_id`/`seq` tracked via shell state and
  a per-run seq file. Failure is swallowed (never breaks the loop).
- `agent/local/continue.sh`: emit `feature.selected` (from `run-summary.json` /
  PROGRESS), `phase.*` around fetch/worktree/init/orchestrate/verify/commit/push/pr,
  `impl.changes`, `verify.result`, `pr.opened`, `run.end`. Run the orchestrator as
  `claude … --output-format stream-json --verbose > runs/<id>/agent.stream.jsonl`.
- `agent/local/merge-watch.sh`: emit `run.start` and `guard.inflight`; `run.end` with
  `skipped` when the guard/cap short-circuits.

### Presentation (`agent/local/logview/`, run via `tsx`, no build step)
- `events.ts` — TS event type union + JSONL parser + agent-stream parser. The contract.
- `model.ts` — aggregate events into a `Run` view (phases, reasoning steps, impl, outcome)
  and a `Feature` view (inception → runs → PRs → status), reading `loop.jsonl`,
  `feature_list.json`, and `gh pr list`.
- `report.ts` — serialize a `Run` to Markdown (sections: Inception, Reasoning,
  Implementation, Verification, Outcome).
- `components/` — ink views: `Dashboard` (live), `RunTimeline`, `ReasoningTrail`,
  `FeatureLifecycle`.
- `index.tsx` — CLI entry. Commands: `live` (default; tails the logs), `run <id>`,
  `feature <id>`, `report <id>`. Wired as `npm run logs`.

## File layout

```
agent/brain/logs/
  loop.jsonl                     # master run-level stream (gitignored, under agent/brain)
  runs/<run_id>/
    events.jsonl                 # unified per-run timeline
    agent.stream.jsonl           # raw claude stream-json (full reasoning trail)
    report.md                    # generated on demand
agent/local/logview/
  index.tsx  events.ts  model.ts  report.ts
  components/{Dashboard,RunTimeline,ReasoningTrail,FeatureLifecycle}.tsx
  __tests__/                     # fixture-based parser/model/report tests
```

## Renderer UX

Live dashboard (`npm run logs`):
```
┌ ycagent.ai · continuation loop ───────────────── watching main ┐
│ origin/main 8c3c38d   in-flight PRs: #9 #11 #12                 │
├────────────────────────────────────────────────────────────────┤
│ RUN 161549   auth-build-env-cleanup                 ● completed │
│  ├ inception   selected (prio 4) — why: #9 in-flight → excluded  │
│  ├ orchestrate ▸ 5 agents (Ruflo hierarchical-mesh)             │
│  │   ├ edit   src/lib/auth.ts (+18 −6)                          │
│  │   └ verify build ✓ lint ✓ typecheck ✓                        │
│  └ outcome     draft PR #11 opened                              │
├────────────────────────────────────────────────────────────────┤
│ [↑↓] runs  [enter] expand reasoning  [f] feature view  [q] quit │
└────────────────────────────────────────────────────────────────┘
```
`logs feature <id>` aggregates inception → run(s) (+why) → reasoning → implementation →
PR(s) → status across runs. `logs report <id>` writes `runs/<id>/report.md`.

## Error handling & safety

- Capture is best-effort: a failed `emit_event` logs nothing and returns success, never
  breaking a continuation run.
- Switching the orchestrator to `--output-format stream-json` is safe: the wrapper already
  gets PR data from `run-summary.json`, not claude's stdout. The exact flags are verified in
  the plan's preflight (fallback to `json` if `stream-json --verbose` is unavailable).
- The renderer is read-only; it never mutates the loop or the repo.
- No secrets in logs: events carry ids/paths/counts, not env or tokens; the agent stream is
  the same content claude already prints locally. The log dir stays gitignored under
  `agent/brain/`.

## Testing

- `events.ts` / `model.ts`: unit tests against fixture `events.jsonl` + `agent.stream.jsonl`.
- `report.ts`: snapshot the Markdown for a fixture run.
- `components`: one render test via `ink-testing-library`.
- Verified with `npm run lint && npm run typecheck`.

## Dependencies

- Add `ink` (TUI) and `ink-testing-library` (dev). Pin and verify versions via the registry.
- Already present: `react` 19.2.3, `tsx` 4.19.2. Installed: `jq` 1.7.1 (capture).

## Migration

- New runs write to `runs/<run_id>/`; the old flat `continue-<ts>.log` files are left as-is
  (the renderer reads the new structure). `agent/brain/logs/**` remains gitignored.

## Out of scope

- A web UI (the JSONL contract leaves it open as a future renderer).
- Shipping reports into PRs (PR bodies already carry traceability via the prior change).
- Retention/rotation policy for `runs/` (note it; revisit if the directory grows large).
