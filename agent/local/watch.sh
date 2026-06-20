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
