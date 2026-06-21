#!/usr/bin/env bash
set -euo pipefail
_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$_DIR/lib.sh"

base_sha="${1:-origin/main}"
ts="$(date +%Y%m%d-%H%M%S)"
branch="grok/continue-local-$ts"
wt="$REPO_ROOT/.codex/worktrees/continue-$ts"

init_run "$ts"
run_started=$(date +%s)
emit_event run.start base_sha="$base_sha" branch="$branch"

log "fetch origin"
git -C "$REPO_ROOT" fetch --quiet origin

log "create worktree $wt off origin/main"
git -C "$REPO_ROOT" worktree add -b "$branch" "$wt" origin/main

cleanup() {
  log "remove worktree $wt"
  git -C "$REPO_ROOT" worktree remove --force "$wt" 2>/dev/null || true
  # Delete the LOCAL continuation branch; the remote copy carries the PR and is
  # auto-deleted on merge (repo "Automatically delete head branches" setting).
  # This keeps local `git branch` from accumulating grok/continue-local-* refs.
  git -C "$REPO_ROOT" branch -D "$branch" 2>/dev/null || true
  rm -f "$BRAIN_DIR/run/$ts-mcp.json" "$BRAIN_DIR/run/$ts-prompt.md" 2>/dev/null || true
}
trap cleanup EXIT

log "refresh state (init.sh) in worktree"
( cd "$wt" && bash agent/init.sh ) || log "init.sh returned non-zero; continuing"

# Root the Ruflo MCP at the MAIN repo so its memory/learning store
# (.claude-flow, .swarm) is shared across runs and with the running daemon,
# NOT the throwaway worktree. We prepare an adjusted .mcp.json (servers' cwd=REPO_ROOT)
# and copy it into the worktree root so Grok Build auto-discovers it (Grok Build
# supports project .mcp.json + MCPs with AGENTS.md/.claude/ compatibility).
# The copy is gitignored by design and cleaned up.
mkdir -p "$BRAIN_DIR/run"
mcp_cfg="$BRAIN_DIR/run/$ts-mcp.json"
node -e '
  const fs=require("fs"), src=process.argv[1], root=process.argv[2];
  const m=JSON.parse(fs.readFileSync(src,"utf8"));
  for (const k of Object.keys(m.mcpServers||{})) m.mcpServers[k].cwd = root;
  process.stdout.write(JSON.stringify(m,null,2));
' "$REPO_ROOT/.mcp.json" "$REPO_ROOT" > "$mcp_cfg"

mkdir -p "$wt/.codex/tmp"   # where the orchestrator writes run-summary.json (gitignored)

# Guard against duplicate work: skip tasks that already have an open continuation
# PR. Collect feature ids from open grok/continue-local-* PRs (title "[id] ...").
inflight="$(gh pr list --repo arvindrk/ycagent.ai --base main --state open \
  --json title,headRefName \
  --jq '.[] | select(.headRefName | startswith("grok/continue-local-")) | .title' 2>/dev/null \
  | sed -nE 's/^\[([^]]+)\].*/\1/p' | sort -u)"
inflight_count="$(printf '%s' "$inflight" | grep -c . || true)"
cap="${CONTINUE_MAX_INFLIGHT:-5}"
excluded_json="$(printf '%s' "$inflight" | jq -R . | jq -sc 'map(select(length>0))')" || excluded_json='[]'
emit_event guard.inflight excluded="$excluded_json" cap="$cap" count="$inflight_count"
if [[ "$inflight_count" -ge "$cap" ]]; then
  log "guard: $inflight_count open continuation PRs >= cap $cap; skipping this run"
  emit_event run.end status=skipped reason="inflight>=cap"
  exit 0
fi

run_prompt="$BRAIN_DIR/run/$ts-prompt.md"
cp "$REPO_ROOT/agent/local/continue-prompt.md" "$run_prompt"
cp "$mcp_cfg" "$wt/.mcp.json"
if [[ -n "$inflight" ]]; then
  {
    echo
    echo "## Already in flight (do NOT select these)"
    echo "These feature ids already have an open continuation PR. Do NOT pick any of them; choose the next-highest-priority unblocked task whose id is NOT listed. If every unblocked task is listed, make NO changes at all (the wrapper will then open no PR):"
    while IFS= read -r _fid; do [[ -n "$_fid" ]] && echo "- $_fid"; done <<< "$inflight"
  } >> "$run_prompt"
  log "guard: excluding in-flight features: $(printf '%s' "$inflight" | tr '\n' ' ')"
fi

log "run Grok Build orchestrator (Ruflo MCP) in worktree"
emit_event phase.start phase=orchestrate engine="grok-build"
(
  cd "$wt"
  grok --prompt-file "$run_prompt" \
    -m grok-build \
    --permission-mode bypassPermissions \
    --output-format streaming-json
) > "$RUN_DIR/agent.stream.jsonl" 2>&1 || { log "grok run failed"; rm -f "$mcp_cfg" "$wt/.mcp.json" 2>/dev/null || true; emit_event run.end status=failed reason="grok-exit"; exit 1; }
rm -f "$mcp_cfg" "$wt/.mcp.json" 2>/dev/null || true
emit_event phase.end phase=orchestrate

# feature.selected from the run summary (best-effort)
if [[ -f "$wt/.codex/tmp/run-summary.json" ]]; then
  fid="$(node -e 'try{process.stdout.write((require(process.argv[1]).feature_id)||"")}catch(e){}' "$wt/.codex/tmp/run-summary.json" 2>/dev/null || true)"
  ftitle="$(node -e 'try{process.stdout.write((require(process.argv[1]).title)||"")}catch(e){}' "$wt/.codex/tmp/run-summary.json" 2>/dev/null || true)"
  [[ -n "$fid" ]] && emit_event feature.selected feature_id="$fid" title="$ftitle"
fi

if [[ -z "$(git -C "$wt" status --porcelain)" ]]; then
  log "no changes produced; no PR opened"
  emit_event run.end status=no-changes
  exit 0
fi

log "commit + push $branch"
git -C "$wt" add -A
git -C "$wt" -c user.name="Arvind Rk" -c user.email="arvindsuna10@gmail.com" \
  commit -m "chore: continue ycagent work (local Ruflo + Grok Build)"
git -C "$wt" push origin "$branch"

adds="$(git -C "$wt" diff --numstat HEAD~1 | awk '{a+=$1} END{print a+0}')" || adds=0
dels="$(git -C "$wt" diff --numstat HEAD~1 | awk '{d+=$2} END{print d+0}')" || dels=0
files_json="$(git -C "$wt" diff --name-only HEAD~1 | jq -R . | jq -sc 'map(select(length>0))')" || files_json='[]'
emit_event impl.changes files="$files_json" additions="$adds" deletions="$dels"

# Build a template-compliant, traceable PR title + body from the orchestrator's
# run summary (agent/local/continue-prompt.md step 8). Fall back gracefully if absent.
summary="$wt/.codex/tmp/run-summary.json"
feature_id=""; pr_title=""; pr_desc=""
if [[ -f "$summary" ]]; then
  feature_id="$(node -e 'try{process.stdout.write((require(process.argv[1]).feature_id)||"")}catch(e){}' "$summary" 2>/dev/null || true)"
  pr_title="$(node -e 'try{process.stdout.write((require(process.argv[1]).title)||"")}catch(e){}' "$summary" 2>/dev/null || true)"
  pr_desc="$(node -e 'try{process.stdout.write((require(process.argv[1]).pr_body_md)||"")}catch(e){}' "$summary" 2>/dev/null || true)"
fi
# Fallbacks: derive the feature id from the latest PROGRESS.md "Task:" line.
[[ -z "$feature_id" ]] && feature_id="$(grep -m1 -E '^Task:' "$wt/agent/PROGRESS.md" 2>/dev/null | sed -E 's/^Task:[[:space:]]*//' | tr -d '`' || true)"
[[ -z "$feature_id" ]] && feature_id="unknown"
[[ -z "$pr_title" ]] && pr_title="continuation"
title="[$feature_id] $pr_title"

pkg_changed="no"
git -C "$wt" diff --name-only HEAD~1 2>/dev/null | grep -qE '(^|/)package(-lock)?\.json$' && pkg_changed="yes"

if [[ -z "$pr_desc" ]]; then
  pr_desc="### PR Description

Autonomous continuation of \`$feature_id\`. No structured summary was emitted; see the \`agent/PROGRESS.md\` entry for details.

### PR Nature
- [ ] Bugfix

### Miscellaneous Checks
- [ ] No package changes (packages changed in this PR: $pkg_changed)
- [ ] Dev Sanity"
fi

body="$pr_desc

---

### Traceability (inception to implementation)

- **Inception (feature):** \`$feature_id\` in \`agent/feature_list.json\`.
- **Planning / autonomy model:** \`agent/AUTONOMY.md\`; design spec under \`docs/superpowers/specs/\`.
- **Implementation record:** the \`agent/PROGRESS.md\` entry for worktree \`continue-$ts\`.
- **Generated by:** local Ruflo + Grok Build (grok-build), off base \`$base_sha\`, branch \`$branch\`. Package changes in this PR: $pkg_changed.

Human gate: review, verify, and approve before merge. This loop never merges or deploys."

log "open draft PR: $title"
pr_url="$(gh pr create --repo arvindrk/ycagent.ai \
  --draft --base main --head "$branch" \
  --title "$title" \
  --body "$body" 2>/dev/null)" \
  || { log "gh pr create failed (branch pushed: $branch)"; emit_event run.end status=failed reason="pr-create"; exit 1; }
pr_num="$(printf '%s' "$pr_url" | sed -nE 's#.*/pull/([0-9]+).*#\1#p')"
emit_event pr.opened number="${pr_num:-0}" url="$pr_url" title="$title"
emit_event run.end status=completed duration_ms="$(( ($(date +%s) - run_started) * 1000 ))"

log "draft PR opened for $branch ($title)"
