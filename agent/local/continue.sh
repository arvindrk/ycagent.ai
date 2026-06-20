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
# (.claude-flow, .swarm) is shared across runs and with the running daemon,
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
