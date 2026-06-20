# Local Ruflo Continuation Loop - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CI-generated continuation PRs with a local loop where a foreground terminal watcher detects merges to `main` and runs a Ruflo-orchestrated Claude Code (Sonnet 4.6) instance in a git worktree that implements the next task and opens a draft PR.

**Architecture:** A foreground terminal watcher (`watch.sh`, started manually in Apple Terminal and active only while running) polls `origin/main`; on a new merge SHA it runs `merge-watch.sh`, which locks and calls `continue.sh`. `continue.sh` creates a git worktree off `origin/main`, runs a single headless `claude` (Sonnet 4.6) instance wired to the Ruflo MCP for memory/coordination, and - if the tree changed - pushes a branch and opens a draft PR. Human merge is the only gate; nothing runs in CI. Scope: the watcher resolves its own repo root and only ever touches THIS repo.

**Tech Stack:** bash, git worktrees, `claude` CLI (headless `-p`), Ruflo/claude-flow MCP (`npx -y ruflo@latest mcp start`), `gh` CLI.

**Spec:** `docs/superpowers/specs/2026-06-20-local-ruflo-continuation-loop-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `agent/local/lib.sh` (create) | Shared: repo-root resolution, logging, runtime dirs, mkdir-based lock (macOS has no `flock`) |
| `agent/local/merge-watch.sh` (create) | Pure trigger: compare `origin/main` SHA to last-seen, honor `[skip codex]`, lock, call `continue.sh` |
| `agent/local/continue.sh` (create) | Orchestration + git: worktree, run `claude`, commit/push/draft-PR, cleanup |
| `agent/local/continue-prompt.md` (create) | Orchestrator prompt for the Sonnet 4.6 instance |
| `agent/local/watch.sh` (create) | Foreground terminal watcher: loops `merge-watch.sh` every ~180s while running; Ctrl-C to stop. Active only in the Terminal session that runs it |
| `.github/workflows/codex-continue-on-merge.yml` (modify) | Drop `push: [main]` trigger; keep `workflow_dispatch` |
| `AGENTS.md` (modify) | Redefine agent model: Ruflo-orchestrated, Claude Code (Sonnet 4.6) executes, local loop |
| `agent/AUTONOMY.md` (modify) | Replace CI Layer 2 with the local terminal-watcher loop |

Runtime state (created at runtime, gitignored under `agent/brain/`): `state/last-merge-sha`, `locks/continue.lock.d/`, `logs/`.

---

## Task 0: Preflight - confirm local tool contract

**Files:** none (verification only)

- [ ] **Step 1: Confirm `claude` headless flags on the installed version**

Run:
```bash
claude --help 2>&1 | grep -iE "permission-mode|--model|--mcp-config|--print| -p,"
```
Expected: lines showing `-p`/`--print`, `--model`, `--mcp-config`, and `--permission-mode` (with `bypassPermissions` among accepted values). If `--permission-mode bypassPermissions` is absent on this version, the fallback is `--dangerously-skip-permissions` - note which one exists; the scripts below use `--permission-mode bypassPermissions`.

- [ ] **Step 2: Confirm Sonnet 4.6 model id is accepted**

Run:
```bash
claude -p "reply with the single word OK" --model claude-sonnet-4-6 2>&1 | tail -3
```
Expected: a short response containing `OK` (proves auth + model id). If the model id is rejected, capture the accepted id and use it consistently in `continue.sh` and `continue-prompt.md`.

- [ ] **Step 3: Confirm the Ruflo MCP tool prefix**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
claude -p "List the names of all available MCP tools, one per line." \
  --mcp-config ./.mcp.json --permission-mode bypassPermissions 2>&1 | grep -iE "mcp__|ruflo|claude-flow" | head -20
```
Expected: tool names. **Record the actual prefix** - the `.mcp.json` server key is `claude-flow`, so tools are likely `mcp__claude-flow__*` (not `mcp__ruflo__*`). Use the observed prefix when finalizing `continue-prompt.md` in Task 3, Step 2.

- [ ] **Step 4: Confirm `gh` auth + push capability**

Run:
```bash
gh auth status 2>&1 | grep -i "Logged in"; gh api user --jq .login
```
Expected: logged in, login `arvindrk`. (Branch push + draft PR will use this local auth.)

---

## Task 1: Shared library (`agent/local/lib.sh`)

**Files:**
- Create: `agent/local/lib.sh`

- [ ] **Step 1: Create the shared lib**

Create `agent/local/lib.sh`:
```bash
#!/usr/bin/env bash
# Shared helpers for the local continuation loop. Source, do not execute.
set -euo pipefail

# Resolve the MAIN repo root from this file's location (agent/local/ -> repo root).
_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$_LIB_DIR/../.." && pwd)"

BRAIN_DIR="$REPO_ROOT/agent/brain"
STATE_DIR="$BRAIN_DIR/state"
LOG_DIR="$BRAIN_DIR/logs"
LOCK_DIR="$BRAIN_DIR/locks/continue.lock.d"

mkdir -p "$STATE_DIR" "$LOG_DIR" "$(dirname "$LOCK_DIR")"

log() { printf '%s %s\n' "[$(date +%Y-%m-%dT%H:%M:%S)]" "$*"; }

# Atomic lock via mkdir (portable; macOS lacks flock). Stores pid; clears stale locks.
acquire_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "$$" > "$LOCK_DIR/pid"
    trap 'rm -rf "$LOCK_DIR"' EXIT
    return 0
  fi
  local oldpid; oldpid="$(cat "$LOCK_DIR/pid" 2>/dev/null || echo "")"
  if [[ -n "$oldpid" ]] && ! kill -0 "$oldpid" 2>/dev/null; then
    log "clearing stale lock (pid $oldpid not running)"
    rm -rf "$LOCK_DIR"
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      echo "$$" > "$LOCK_DIR/pid"
      trap 'rm -rf "$LOCK_DIR"' EXIT
      return 0
    fi
  fi
  return 1
}
```

- [ ] **Step 2: Verify it sources and resolves paths**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
bash -c 'source agent/local/lib.sh; echo "REPO_ROOT=$REPO_ROOT"; echo "STATE_DIR=$STATE_DIR"; acquire_lock && echo "lock OK" && ls agent/brain/locks/continue.lock.d'
```
Expected: `REPO_ROOT` is the absolute repo path, `STATE_DIR` under `agent/brain/state`, `lock OK`, and a `pid` file listed. The lock auto-releases on exit.

- [ ] **Step 3: Shellcheck (if available) and commit**

Run:
```bash
command -v shellcheck >/dev/null && shellcheck agent/local/lib.sh || echo "shellcheck not installed; skipping"
chmod +x agent/local/lib.sh
git add agent/local/lib.sh
git commit -m "feat(local-loop): shared lib (paths, logging, mkdir lock)"
```
Expected: no shellcheck errors (or skipped); commit succeeds.

---

## Task 2: Merge watcher (`agent/local/merge-watch.sh`)

**Files:**
- Create: `agent/local/merge-watch.sh`

- [ ] **Step 1: Create the watcher**

Create `agent/local/merge-watch.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$_DIR/lib.sh"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

remote_sha="$(git -C "$REPO_ROOT" ls-remote origin refs/heads/main 2>/dev/null | awk '{print $1}')"
if [[ -z "$remote_sha" ]]; then
  log "could not read origin/main; exiting"
  exit 0
fi

last_sha="$(cat "$STATE_DIR/last-merge-sha" 2>/dev/null || echo "")"
if [[ "$remote_sha" == "$last_sha" ]]; then
  log "no change ($remote_sha)"
  exit 0
fi

# Fetch so we can read the new HEAD commit message for the [skip codex] guard.
git -C "$REPO_ROOT" fetch --quiet origin main || true
msg="$(git -C "$REPO_ROOT" log -1 --format=%B "$remote_sha" 2>/dev/null || echo "")"
if grep -qiF "[skip codex]" <<<"$msg"; then
  log "[skip codex] on $remote_sha; recording and skipping"
  [[ $DRY_RUN -eq 0 ]] && echo "$remote_sha" > "$STATE_DIR/last-merge-sha"
  exit 0
fi

if [[ $DRY_RUN -eq 1 ]]; then
  log "[dry-run] would run continue.sh for $remote_sha (last=$last_sha)"
  exit 0
fi

if ! acquire_lock; then
  log "another continuation in progress; exiting"
  exit 0
fi

run_log="$LOG_DIR/continue-$(date +%Y%m%d-%H%M%S).log"
log "new merge $remote_sha; starting continuation (log: $run_log)"
if "$_DIR/continue.sh" "$remote_sha" >>"$run_log" 2>&1; then
  echo "$remote_sha" > "$STATE_DIR/last-merge-sha"
  log "continuation complete for $remote_sha"
else
  rc=$?
  log "continuation FAILED (rc=$rc) for $remote_sha; SHA not recorded (will retry next tick). See $run_log"
fi
```

- [ ] **Step 2: Verify dry-run detects a change**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
chmod +x agent/local/merge-watch.sh
rm -f agent/brain/state/last-merge-sha
bash agent/local/merge-watch.sh --dry-run
```
Expected: a line `[dry-run] would run continue.sh for <sha> (last=)`. (No `continue.sh` yet - dry-run must not call it.)

- [ ] **Step 3: Verify no-op when SHA already seen**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
git ls-remote origin refs/heads/main | awk '{print $1}' > agent/brain/state/last-merge-sha
bash agent/local/merge-watch.sh --dry-run
rm -f agent/brain/state/last-merge-sha
```
Expected: `no change (<sha>)`.

- [ ] **Step 4: Shellcheck and commit**

Run:
```bash
command -v shellcheck >/dev/null && shellcheck agent/local/merge-watch.sh || echo "skip"
git add agent/local/merge-watch.sh
git commit -m "feat(local-loop): merge watcher with [skip codex] guard and lock"
```
Expected: clean; commit succeeds.

---

## Task 3: Orchestrator prompt (`agent/local/continue-prompt.md`)

**Files:**
- Create: `agent/local/continue-prompt.md`

- [ ] **Step 1: Create the prompt**

Create `agent/local/continue-prompt.md`:
```markdown
# Local Autonomous Continuation (Ruflo + Sonnet 4.6)

You are the ycagent.ai Orchestrator running locally after a merge to `main`, inside an isolated git worktree.

Goal: choose exactly one safe, unblocked next task and implement the smallest useful progress so the wrapper can open a draft PR.

Use your Ruflo/claude-flow MCP tools (the `mcp__claude-flow__*` tools available to you) for memory, coordination, and - when a task genuinely benefits from parallel sub-work - agent spawning. Prefer recording and recalling decisions through Ruflo memory so the loop learns across runs.

Required procedure:
1. Run `bash agent/init.sh` and read its output.
2. Read `AGENTS.md`, `.agents/rules/*.md`, `agent/feature_list.json`, and the latest `agent/PROGRESS.md` entries.
3. Select the highest-priority task whose dependencies are completed and whose status is not `completed`.
4. Prefer repository reliability, security, evaluation, observability, and developer-velocity work over speculative product work.
5. Implement only that one task yourself. Keep the diff scoped.
6. Update `agent/feature_list.json` and append an entry to `agent/PROGRESS.md` (date, task, decisions, commands, verification, next handoff).
7. Run the task's `verify` command when it is safe locally. If it cannot run, record why in `agent/PROGRESS.md`.
8. End with a concise summary: selected task, changed files, verification result, remaining human-review notes.

Hard safety constraints:
- Do NOT push, open or merge pull requests, deploy, publish, force-push, or change repository settings. The wrapper script opens the draft PR.
- Do NOT read `.env*` files.
- Do NOT read or write the Mercor Obsidian vault or any path under `~/Mercor/wiki`.
- Do NOT expose secrets, tokens, cookies, database URLs, or API keys.
- Do NOT add dependencies unless the task explicitly requires it and the lockfile proves the version.
- If the task is unsafe or ambiguous, append the blocker to `agent/PROGRESS.md` instead of guessing, and make no other changes.
```

- [ ] **Step 2: Align the MCP prefix with Task 0 Step 3**

If Task 0 Step 3 showed a prefix other than `mcp__claude-flow__*` (e.g. `mcp__ruflo__*`), update the parenthetical in the prompt to the observed prefix. Run:
```bash
grep -n "mcp__" agent/local/continue-prompt.md
```
Expected: the prefix matches what Task 0 observed.

- [ ] **Step 3: Commit**

Run:
```bash
git add agent/local/continue-prompt.md
git commit -m "feat(local-loop): orchestrator prompt for Sonnet 4.6 + Ruflo"
```
Expected: commit succeeds.

---

## Task 4: Continuation runner (`agent/local/continue.sh`)

**Files:**
- Create: `agent/local/continue.sh`

- [ ] **Step 1: Create the runner**

Create `agent/local/continue.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$_DIR/lib.sh"

base_sha="${1:-origin/main}"
ts="$(date +%Y%m%d-%H%M%S)"
branch="codex/continue-local-$ts"
wt="$REPO_ROOT/.codex/worktrees/continue-$ts"

log "fetch origin"
git -C "$REPO_ROOT" fetch --quiet origin

log "create worktree $wt off origin/main"
git -C "$REPO_ROOT" worktree add -b "$branch" "$wt" origin/main

cleanup() {
  log "remove worktree $wt"
  git -C "$REPO_ROOT" worktree remove --force "$wt" 2>/dev/null || true
  rm -f "$BRAIN_DIR/run/$ts-mcp.json" 2>/dev/null || true
}
trap cleanup EXIT

log "refresh state (init.sh) in worktree"
( cd "$wt" && bash agent/init.sh ) || log "init.sh returned non-zero; continuing"

# Root the Ruflo MCP at the MAIN repo so its memory/learning store
# (.claude-flow, .swarm) is shared across runs and with the running daemon -
# NOT the throwaway worktree. We clone .mcp.json and set each server's cwd to
# REPO_ROOT. Written under agent/brain (gitignored, main repo) so it never lands
# in the worktree's `git add -A`.
mkdir -p "$BRAIN_DIR/run"
mcp_cfg="$BRAIN_DIR/run/$ts-mcp.json"
node -e '
  const fs=require("fs"), src=process.argv[1], root=process.argv[2];
  const m=JSON.parse(fs.readFileSync(src,"utf8"));
  for (const k of Object.keys(m.mcpServers||{})) m.mcpServers[k].cwd = root;
  process.stdout.write(JSON.stringify(m,null,2));
' "$REPO_ROOT/.mcp.json" "$REPO_ROOT" > "$mcp_cfg"

log "run Sonnet 4.6 orchestrator (Ruflo MCP rooted at main repo) in worktree"
(
  cd "$wt"
  claude -p "$(cat "$REPO_ROOT/agent/local/continue-prompt.md")" \
    --model claude-sonnet-4-6 \
    --mcp-config "$mcp_cfg" \
    --dangerously-skip-permissions
) || { log "claude run failed"; rm -f "$mcp_cfg"; exit 1; }
rm -f "$mcp_cfg"

if [[ -z "$(git -C "$wt" status --porcelain)" ]]; then
  log "no changes produced; no PR opened"
  exit 0
fi

log "commit + push $branch"
git -C "$wt" add -A
git -C "$wt" -c user.name="Arvind Rk" -c user.email="arvindsuna10@gmail.com" \
  commit -m "chore: continue ycagent work (local Ruflo + Sonnet 4.6)"
git -C "$wt" push origin "$branch"

log "open draft PR"
gh pr create --repo arvindrk/ycagent.ai \
  --draft --base main --head "$branch" \
  --title "Local continuation: $ts" \
  --body "Generated locally by Ruflo-orchestrated Claude Code (Sonnet 4.6) in a worktree off \`$base_sha\`.

Human gate: review, verify, and approve before merge. This loop never merges or deploys." \
  || { log "gh pr create failed (branch pushed: $branch)"; exit 1; }

log "draft PR opened for $branch"
```

- [ ] **Step 2: Static check (no live run yet)**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
chmod +x agent/local/continue.sh
bash -n agent/local/continue.sh && echo "syntax OK"
command -v shellcheck >/dev/null && shellcheck agent/local/continue.sh || echo "skip"
```
Expected: `syntax OK`; no shellcheck errors (or skipped).

- [ ] **Step 3: Commit**

Run:
```bash
git add agent/local/continue.sh
git commit -m "feat(local-loop): worktree runner - Sonnet 4.6 + draft PR"
```
Expected: commit succeeds. (Live end-to-end run happens in Task 8.)

---

## Task 5: Foreground terminal watcher (`agent/local/watch.sh`)

**Files:**
- Create: `agent/local/watch.sh`

- [ ] **Step 1: Create the watcher loop**

Create `agent/local/watch.sh`:
```bash
#!/usr/bin/env bash
# Foreground continuation watcher. Run this in Apple Terminal; Ctrl-C to stop.
# It is active ONLY while this process runs (no background daemon) and only ever
# operates on THIS repo (paths resolved from lib.sh). Loops merge-watch.sh every
# WATCH_INTERVAL seconds (default 180).
set -euo pipefail
_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$_DIR/lib.sh"

INTERVAL="${WATCH_INTERVAL:-180}"
trap 'log "watcher stopped"; exit 0' INT TERM

log "watching origin/main every ${INTERVAL}s for repo: $REPO_ROOT (Ctrl-C to stop)"
while true; do
  "$_DIR/merge-watch.sh" || log "merge-watch returned non-zero (continuing)"
  sleep "$INTERVAL"
done
```

- [ ] **Step 2: Verify it ticks once and is stoppable (SAFE - no real continuation)**

Pre-seed the seen-SHA to the CURRENT `origin/main` so the watcher takes the no-change path and does **not** launch a continuation during this build step (a real run is exercised only in the gated Task 8):
```bash
cd /Users/arvindkishore/personal/ycagent.ai
mkdir -p agent/brain/state
git ls-remote origin refs/heads/main | awk '{print $1}' > agent/brain/state/last-merge-sha
WATCH_INTERVAL=2 bash agent/local/watch.sh &
wpid=$!
sleep 5
kill -INT "$wpid" 2>/dev/null || true
wait "$wpid" 2>/dev/null || true
```
Expected: a `watching origin/main every 2s` line, at least one `no change (<sha>)` tick, then `watcher stopped`. No worktree is created and no PR is opened. (Confirm: `git worktree list` shows only the main checkout.)

- [ ] **Step 3: Shellcheck and commit**

Run:
```bash
command -v shellcheck >/dev/null && shellcheck agent/local/watch.sh || echo "skip"
chmod +x agent/local/watch.sh
git add agent/local/watch.sh
git commit -m "feat(local-loop): foreground terminal watcher (repo-scoped)"
```
Expected: clean; commit succeeds.

---

## Task 6: Retire the CI continuation trigger

**Files:**
- Modify: `.github/workflows/codex-continue-on-merge.yml` (the `on:` block)

- [ ] **Step 1: Drop the push trigger**

In `.github/workflows/codex-continue-on-merge.yml`, replace:
```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
```
with:
```yaml
on:
  # Continuation now runs locally (terminal watcher + Ruflo + Claude Code). See agent/AUTONOMY.md.
  # Kept as a manual fallback only; no automatic PR generation in CI.
  workflow_dispatch:
```

- [ ] **Step 2: Validate YAML with actionlint**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
/tmp/actionlint -shellcheck= -pyflakes= .github/workflows/codex-continue-on-merge.yml && echo "actionlint OK"
```
Expected: `actionlint OK` (no errors). If `/tmp/actionlint` is absent, download via `bash <(curl -fsSL https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash)` first.

- [ ] **Step 3: Commit**

Run:
```bash
git add .github/workflows/codex-continue-on-merge.yml
git commit -m "ci: stop CI from generating continuation PRs (now local)"
```
Expected: commit succeeds.

---

## Task 7: Update agent docs

**Files:**
- Modify: `AGENTS.md` (Operating Model section)
- Modify: `agent/AUTONOMY.md` (Layer 2 + operational notes)

- [ ] **Step 1: Update `AGENTS.md`**

In `AGENTS.md`, replace the line:
```markdown
Codex is the only coding agent allowed to operate in this repository.
```
with:
```markdown
Continuation runs locally: Ruflo (claude-flow) orchestrates and Claude Code on Sonnet 4.6 is the execution engine that writes code. It is triggered on merges to `main` by a foreground terminal watcher (`agent/local/watch.sh`, started in Apple Terminal and active only while running; see `agent/local/` and `agent/AUTONOMY.md`). The `.codex/` harness is retained for manual Codex use but is no longer the active continuation path.
```

- [ ] **Step 2: Update `agent/AUTONOMY.md` Layer 2**

In `agent/AUTONOMY.md`, replace the entire `## Layer 2: Continuation` section (from that heading through the line ending `...without a human prompt.`) with:
```markdown
## Layer 2: Continuation (local, terminal-bound)

Continuation runs on the maintainer's Mac, not in CI, and only while a foreground
watcher is running in Apple Terminal. Start it with `bash agent/local/watch.sh`
(Ctrl-C to stop). It is scoped to THIS repo only and polls `origin/main` every ~180s
(`WATCH_INTERVAL` to override). On a new merge SHA whose commit message lacks
`[skip codex]`, it:

1. Acquires a lock (`agent/brain/locks/`), then runs `agent/local/continue.sh`.
2. Creates a git worktree off `origin/main` under `.codex/worktrees/`.
3. Runs one headless Claude Code instance (`--model claude-sonnet-4-6`,
   `--mcp-config` rooted at the main repo) that orchestrates via the Ruflo MCP and
   implements the next unblocked `feature_list.json` task.
4. If the worktree changed: commits, pushes `codex/continue-local-<ts>`, and opens a
   draft PR with `gh`.
5. Removes the worktree and records the SHA.

The system is autonomous (while the watcher runs) at the point a merge to `main`
triggers this loop and a draft PR is opened without a human prompt.
```

- [ ] **Step 3: Update the operational notes in `agent/AUTONOMY.md`**

Replace the bullet:
```markdown
- If `CODEX_GITHUB_TOKEN` is absent, the workflow falls back to `GITHUB_TOKEN`; this may create the draft PR but can prevent downstream CI from triggering.
```
with:
```markdown
- The local loop pushes and opens draft PRs using the maintainer's local `gh` auth.
- Kill switch: stop the watcher (Ctrl-C in its Terminal, or close the window). Nothing runs when the watcher is not running.
- Token note: ChatGPT/Codex auth is no longer used by the loop; it runs on local Claude auth.
```

- [ ] **Step 4: Commit**

Run:
```bash
git add AGENTS.md agent/AUTONOMY.md
git commit -m "docs: document local Ruflo+Sonnet continuation loop"
```
Expected: commit succeeds.

---

## Task 8: End-to-end validation

**Files:** none (validation only)

- [ ] **Step 1: One manual continuation run on the current state**

Capture the main-repo Ruflo memory mtime first (to confirm shared-memory rooting), then run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
before=$(stat -f %m .swarm/memory.db 2>/dev/null || echo 0)
bash agent/local/continue.sh "$(git rev-parse origin/main)" 2>&1 | tee /tmp/continue-manual.log | tail -40
```
Expected: log shows worktree created → claude runs → either "no changes produced; no PR opened" OR "draft PR opened for codex/continue-local-<ts>" → worktree removed. If a PR opened, confirm:
```bash
gh pr list --repo arvindrk/ycagent.ai --state open --draft --limit 5
```
Expected: the new draft PR appears. Verify no worktrees leaked: `git worktree list` shows only the main checkout.

- [ ] **Step 1b: Verify Ruflo memory was rooted at the main repo (shared, not the worktree)**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
after=$(stat -f %m .swarm/memory.db 2>/dev/null || echo 0)
echo "before=$before after=$after"
# The throwaway worktree must NOT have created its own Ruflo store:
ls -d .codex/worktrees/*/.claude-flow .codex/worktrees/*/.swarm 2>/dev/null && echo "LEAK: worktree-local Ruflo store found" || echo "no worktree-local Ruflo store (good)"
```
Expected: `after` ≥ `before` (main-repo memory touched, confirming the MCP `cwd` override took effect) **and** "no worktree-local Ruflo store (good)". If instead a worktree-local store appeared (or `after` == `before` == 0 with the daemon active), the `cwd` field in the MCP config was not honored - apply the fallback in Notes before relying on memory continuity.

- [ ] **Step 2: Live trigger test via the terminal watcher**

Reset the seen-SHA so the next tick treats `origin/main` as new, then run the watcher in the foreground with a short interval and stop it after one cycle:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
rm -f agent/brain/state/last-merge-sha
WATCH_INTERVAL=10 bash agent/local/watch.sh &
wpid=$!
# allow one detection + continuation to run, then stop the watcher
sleep 20; kill -INT "$wpid" 2>/dev/null || true; wait "$wpid" 2>/dev/null || true
ls -t agent/brain/logs/continue-*.log | head -1 | xargs tail -30
```
Expected: the watcher prints `new merge <sha>; starting continuation`, the latest `continue-*.log` shows the worktree run, and either "no changes produced" or "draft PR opened". (This consumes one real continuation run; expect a draft PR if a task is implementable.) Confirm the watcher fully stopped: `pgrep -f agent/local/watch.sh` returns nothing.

- [ ] **Step 3: Confirm terminal-only / repo-only scope**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
pgrep -fl "agent/local/watch.sh" || echo "no watcher running (correct when not started)"
grep -RIl "REPO_ROOT" agent/local/*.sh | wc -l   # scripts resolve their own repo root
```
Expected: no watcher process lingers when not started (terminal-bound), and the scripts resolve `REPO_ROOT` from their own location (repo-scoped - they never read a global config or other repos).

- [ ] **Step 4: Idempotency check**

Run:
```bash
bash agent/local/merge-watch.sh --dry-run
```
Expected: `no change (<sha>)` (the watcher recorded the SHA after Step 3's success).

- [ ] **Step 5: Open the PR for this work**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
git push -u origin codex/local-continuation-loop
gh pr create --repo arvindrk/ycagent.ai --draft --base main --head codex/local-continuation-loop \
  --title "Local Ruflo+Sonnet continuation loop (replaces CI PR generation)" \
  --body "Implements docs/superpowers/specs/2026-06-20-local-ruflo-continuation-loop-design.md. Foreground terminal watcher -> Ruflo-orchestrated Claude Code (Sonnet 4.6) in a worktree -> draft PR. CI continuation neutered to workflow_dispatch. Human merge is the only gate."
```
Expected: draft PR created for the implementation branch.

---

## Notes / Operational caveats
- Ruflo MCP cold start can load a large model (60s+); the first `claude` run may be slow. The already-running daemon mitigates this. Tune `WATCH_INTERVAL` or add a per-run timeout if needed.
- `bypassPermissions` headless runs have no OS sandbox; the worktree + draft-PR gate are the safety boundary (per spec).
- If `claude` lacks `--permission-mode bypassPermissions` on the installed version (Task 0 Step 1), substitute `--dangerously-skip-permissions` in `continue.sh` Step 1.
- **Ruflo memory rooting fallback (if Task 8 Step 1b fails):** if the MCP server `cwd` field is not honored by the installed `claude`, instead run `claude` itself with cwd = `$REPO_ROOT` and pass the worktree path to the prompt for file operations; OR add an absolute persist-path env to the Ruflo server block in the generated config (`CLAUDE_FLOW_PERSIST_PATH="$REPO_ROOT/.claude-flow/data"` / confirm the exact var ruflo honors via `npx -y ruflo@latest --help`); OR symlink `$wt/.claude-flow` and `$wt/.swarm` to the main repo's before launching `claude`. Pick whichever the installed Ruflo version respects, verified by re-running Step 1b.
