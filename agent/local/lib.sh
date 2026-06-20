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
