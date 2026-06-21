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

# Fetch so we can read the new HEAD commit message for the skip harness guard (supports legacy [skip codex]).
git -C "$REPO_ROOT" fetch --quiet origin main || true
msg="$(git -C "$REPO_ROOT" log -1 --format=%B "$remote_sha" 2>/dev/null || echo "")"
if grep -qiE '\[skip (codex|harness|agent|continuation)\]' <<<"$msg"; then
  log "[skip harness] on $remote_sha; recording and skipping"
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
