# Local Ruflo-Orchestrated Continuation Loop — Design

**Date:** 2026-06-20
**Status:** Approved (design), pending implementation plan
**Author:** Orchestrator session (Claude Code)

## Problem

The autonomous continuation loop currently runs in GitHub Actions
(`.github/workflows/codex-continue-on-merge.yml`): on every push to `main` it runs
Codex, generates a patch, and opens a draft PR. The user does not want PRs generated
in CI. They have a powerful local agent stack (Ruflo / claude-flow V3 with a running
daemon, hierarchical-mesh swarm, HNSW memory, self-learning) on their Mac and want the
continuation work to run there instead, triggered automatically when a PR is merged.

## Goal / Outcome

When a PR is merged to `main`, a process on the user's Mac detects it, refreshes context,
selects the next unblocked task, implements it, and opens a **draft PR** — with the human
merge as the only gate. No work runs in CI. The loop uses the local Ruflo infra for
orchestration/memory and Claude Code (Sonnet 4.6) as the single execution engine.

## Key Decisions (resolved during brainstorming)

1. **Trigger:** auto-detect merge to `main` (not manual/scheduled/git-hook).
2. **Engine:** Ruflo orchestrates; **Claude Code on Sonnet 4.6** executes (orchestrates *and*
   writes code). **Codex is dropped** from the local loop — Ruflo already spawns headless
   Claude Code as its runtime, so a separate `codex exec` engine adds a second model stack
   and auth system for no gain.
3. **Isolation:** each continuation runs in a **dedicated git worktree**, not the primary
   working tree. No OS sandbox (unlike `codex exec --sandbox`); blast radius is bounded by
   the isolated checkout plus the draft-PR human gate.
4. **Trigger host:** **foreground terminal watcher** (`agent/local/watch.sh`), started
   manually in Apple Terminal and active only while running (user choice: no background
   daemon; on/off by the terminal session). The Ruflo daemon's worker set is a closed,
   hardcoded enum (`@claude-flow/cli` v3.12.4: `ultralearn optimize consolidate predict
   audit map preload deepdive document refactor benchmark testgaps`) with no plugin/config
   to register a custom worker, and no native `automation`/`schedule`/`cron` command. So the
   merge trigger must live outside the daemon. The watcher is the only piece that does what
   Ruflo structurally cannot; all reasoning/coding flows through Ruflo + Claude Code.
   Scope: it resolves its own repo root and only ever touches THIS repo.

## Architecture

```
[human merges PR to main]
        │
        ▼  (≤ poll interval)
terminal watcher (watch.sh) ──runs──▶ agent/local/merge-watch.sh   (pure trigger)
        │  new origin/main SHA && no [skip codex] && lock acquired
        ▼
agent/local/continue.sh   (orchestration + git, runs in a worktree)
   1. git fetch; create worktree off origin/main
   2. run agent/init.sh (load state) inside the worktree
   3. claude -p continue-prompt.md  --model claude-sonnet-4-6
            --mcp-config <main-repo>/.mcp.json  --permission-mode bypassPermissions
        → Ruflo (mcp__ruflo__*) orchestrates: pick task, implement, update
          feature_list.json + PROGRESS.md
   4. if tree changed: commit, push branch, gh pr create --draft
   5. remove worktree; record SHA
        │
        ▼
[draft PR] ──human review + merge──▶ (loop)
```

## Components

All new code lives under `agent/local/` (tracked). Runtime state is gitignored under
`agent/brain/`.

### `agent/local/merge-watch.sh` (tracked) — pure trigger
- Reads last-seen SHA from `agent/brain/state/last-merge-sha`.
- Queries `git ls-remote origin refs/heads/main` (cheap, no checkout).
- If the SHA changed **and** the new HEAD commit message does not contain `[skip codex]`:
  acquire `flock` on `agent/brain/locks/continue.lock`, run `continue.sh`, then write the
  new SHA on success.
- Fast no-op when unchanged or when a run is already in progress.
- `--dry-run` flag prints intended actions without running.

### `agent/local/continue.sh` (tracked) — orchestration + git
- `git fetch origin`.
- `git worktree add -b codex/continue-local-<ts> .codex/worktrees/continue-<ts> origin/main`
  (`.codex/worktrees/` is already gitignored).
- `cd` into the worktree; run `agent/init.sh`.
- Invoke the single Claude Code engine (see below).
- If the worktree has changes: commit, `git push origin codex/continue-local-<ts>`,
  `gh pr create --draft --base main`.
- `git worktree remove` (cleanup); branch persists on the remote.
- Logs to `agent/brain/logs/continue-<ts>.log` (main repo, not the worktree).

### `agent/local/continue-prompt.md` (tracked) — orchestrator prompt
Adapted from `.github/codex/prompts/autonomous-continue.md`:
- Use `mcp__ruflo__*` tools for memory, coordination, and (optionally) `agent_spawn` for
  parallel sub-work.
- Select exactly one unblocked, non-completed task from `feature_list.json`; prefer
  reliability/security/eval/observability/DX over speculative product work.
- Implement it directly (Sonnet 4.6 writes the code). Keep the diff scoped.
- Update `feature_list.json` and append to `PROGRESS.md`.
- Run the task's `verify` command when safe; record results.
- **Do not** push, open PRs, merge, deploy, or change repo settings — the wrapper opens the
  draft PR.

### `agent/local/watch.sh` (tracked)
- Foreground terminal watcher: run `bash agent/local/watch.sh` in Apple Terminal; loops
  `merge-watch.sh` every `WATCH_INTERVAL` (~180s) while running; Ctrl-C to stop.
- Active only in the Terminal session that runs it (no background daemon). Resolves its own
  repo root via `lib.sh`, so it only ever touches THIS repo.

## Engine invocation

A single headless Claude Code instance both orchestrates and codes:

```
claude -p "$(cat <main>/agent/local/continue-prompt.md)" \
  --model claude-sonnet-4-6 \
  --mcp-config <main-repo-abs>/.mcp.json \
  --permission-mode bypassPermissions
```

- The model is pinned to `claude-sonnet-4-6` for this project.
- `--mcp-config` points at the **main repo's** `.mcp.json` (absolute path) because that file is
  gitignored and therefore absent from the worktree checkout. This gives the instance the
  `mcp__ruflo__*` tools.
- Headless autonomous operation requires `bypassPermissions` (no interactive prompts);
  isolation comes from the worktree, safety from the draft-PR gate.
- Implementation will confirm whether to route via `ruflo dispatch` / `ruflo hive-mind spawn
  --claude` vs. calling `claude` directly. Mechanism is identical (Ruflo spawns headless
  Claude Code with `mcp__ruflo__*`); calling `claude` directly gives explicit `--model`
  control and is the default unless routing through Ruflo adds coordination value.

## Ruflo memory vs. worktree isolation

Only the **code checkout** is isolated per run. Ruflo's **memory/state/learning** must remain
shared across runs (that's the point of the self-learning infra), so the Ruflo MCP/daemon
stays rooted at the **main repo** (`<main>/.claude-flow`, `<main>/.swarm`). The worktree gets
the code; Ruflo memory is referenced via the absolute `--mcp-config` path and the
already-running daemon. Implementation will verify the Ruflo MCP resolves its persist paths to
the main repo (via cwd or absolute config), not the worktree.

## State & runtime (gitignored, under `agent/brain/`)
- `state/last-merge-sha` — last processed `origin/main` SHA.
- `locks/continue.lock` — `flock` target; prevents overlapping runs.
- `logs/continue-<ts>.log` (the watcher itself logs to the Terminal it runs in).

## CI disposition
- Edit `.github/workflows/codex-continue-on-merge.yml`: remove the `push: branches: [main]`
  trigger, leaving only `workflow_dispatch` as a manual fallback (do not delete, so the
  CI path remains available if the local loop is ever down).
- `ci.yml` (lint/typecheck/build on PR/push) is untouched.

## Safety & error handling
- **Draft-PR-only.** Never merge, deploy, publish, force-push, push to `main`, or change repo
  settings. The wrapper only creates a feature branch + draft PR.
- **Worktree isolation** + **draft-PR gate** are the safety boundary (no OS sandbox).
- `flock` prevents overlapping runs; stale-lock handling on start.
- No unblocked task, or no diff produced → log and exit, no PR.
- `[skip codex]` in a merge commit suppresses a continuation (loop breaker / escape hatch).
- Secrets: Claude Code uses local Claude auth; `gh` uses local `gh` auth. Nothing in the repo.
  Do not read `.env*`; do not touch `~/Mercor/wiki`.
- Kill switch: stop the watcher (Ctrl-C / close its Terminal). Nothing runs when it is not running.
- Optional macOS failure notification via `osascript`.

## Docs to update (part of implementation)
- `AGENTS.md`: replace "Codex is the only coding agent allowed" with "Ruflo-orchestrated;
  Claude Code (Sonnet 4.6) is the execution engine; continuation runs locally via a foreground terminal watcher."
  Note `.codex/` is retained but no longer the active path.
- `agent/AUTONOMY.md`: replace the CI-continuation Layer 2 with the local terminal-watcher loop;
  keep the human-gate section.

## Testing / validation
- `merge-watch.sh --dry-run` on a known state (prints intended actions, no run).
- One manual `continue.sh` run on a known merged state → confirms task selection, Sonnet 4.6
  edits inside the worktree, and a draft PR opens.
- Start `watch.sh` in a Terminal, push a trivial merge to `main`, confirm a run fires within the interval; Ctrl-C stops it cleanly.
- Re-run with no new SHA → no-op. Concurrent invocation → second one blocks on the lock.

## Out of scope
- Forking/patching `@claude-flow/cli` to add a native daemon worker (non-durable under
  `npx ruflo@latest`; rejected during brainstorming).
- Multi-thread parallel feature execution (single-threaded continuation per merge for now;
  Ruflo `agent_spawn` may parallelize *within* a single task).
- Migrating the `.codex/` specialist personas to `.claude/agents` (possible follow-up).
