#!/usr/bin/env bash
# Shared helpers for the local continuation loop. Source, do not execute.
set -euo pipefail

# Resolve the MAIN repo root from this file's location (agent/local/ -> repo root).
if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
  _LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  REPO_ROOT="$(cd "$_LIB_DIR/../.." && pwd)"
else
  REPO_ROOT="${REPO_ROOT:-$(pwd)}"
  _LIB_DIR="$REPO_ROOT/agent/local"
fi

BRAIN_DIR="$REPO_ROOT/agent/brain"
STATE_DIR="$BRAIN_DIR/state"
LOG_DIR="$BRAIN_DIR/logs"
LOCK_DIR="$BRAIN_DIR/locks/continue.lock.d"

mkdir -p "$STATE_DIR" "$LOG_DIR" "$(dirname "$LOCK_DIR")"

# Derive repo identity for decoupling (used by gh, titles, prompts).
# Prefers agent/harness-config.json if present; falls back to git remote parse.
# Exports: REPO_GH (owner/repo for gh CLI), REPO_DISPLAY (human name).
get_repo_identity() {
  local cfg="$REPO_ROOT/agent/harness-config.json"
  if [[ -f "$cfg" ]]; then
    REPO_GH=$(node -e 'try{const c=require(process.argv[1]); process.stdout.write(c.gh_repo||c.repo||"")}catch(e){}' "$cfg" 2>/dev/null || echo "")
    REPO_DISPLAY=$(node -e 'try{const c=require(process.argv[1]); process.stdout.write(c.display_name||c.name||"")}catch(e){}' "$cfg" 2>/dev/null || echo "")
  fi
  if [[ -z "${REPO_GH:-}" ]]; then
    local url
    url=$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || echo "")
    # Safe parse: expect https://github.com/owner/repo.git or git@...
    REPO_GH=$(printf '%s' "$url" | sed -E 's#.*github.com[/:]([^/]+/[^/.]+)(\.git)?$#\1#; s#^git@[^:]+:##' | head -c 200)
  fi
  if [[ -z "${REPO_DISPLAY:-}" ]]; then
    REPO_DISPLAY=$(basename "$REPO_ROOT")
  fi
  export REPO_GH REPO_DISPLAY
}
get_repo_identity

# Load decoupled project profile for extensible planner (vision, categories, horizon).
# These are project-owned files; harness remains generic.
load_project_profile() {
  local vision_path="$REPO_ROOT/agent/vision.md"
  local cats_path="$REPO_ROOT/agent/categories.json"
  local horizon_path="$REPO_ROOT/agent/harness/horizon.json"

  VISION=""
  if [[ -f "$vision_path" ]]; then
    # Sanitize: take first ~200 lines, no secrets assumed (project file)
    VISION=$(head -n 200 "$vision_path" | head -c 8000)
  fi

  CATEGORIES=""
  if [[ -f "$cats_path" ]]; then
    CATEGORIES=$(cat "$cats_path" 2>/dev/null | head -c 4000)
  fi

  HORIZON=""
  if [[ -f "$horizon_path" ]]; then
    HORIZON=$(cat "$horizon_path" 2>/dev/null | head -c 2000)
  fi

  export VISION CATEGORIES HORIZON
}
load_project_profile

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

# ── Structured event capture ────────────────────────────────────────────────
# RUN_ID and RUN_DIR are set by callers via init_run(); emit_event is best-effort
# and must never fail the loop.
RUNS_DIR="$LOG_DIR/runs"
LOOP_LOG="$LOG_DIR/loop.jsonl"
SEQ_DIR="$LOG_DIR/.seq"

# init_run <run_id>: set RUN_ID/RUN_DIR and create the per-run directory.
init_run() {
  RUN_ID="$1"
  RUN_DIR="$RUNS_DIR/$RUN_ID"
  mkdir -p "$RUN_DIR" "$SEQ_DIR" 2>/dev/null || true
  printf '0' > "$SEQ_DIR/$RUN_ID" 2>/dev/null || true
}

_next_seq() {
  local f="$SEQ_DIR/${RUN_ID:-unknown}" n
  n="$(cat "$f" 2>/dev/null || echo 0)"
  n=$((n + 1))
  printf '%s' "$n" > "$f" 2>/dev/null || true
  printf '%s' "$n"
}

# Run-level event types also go to the master loop.jsonl for the cross-run view.
_is_run_level() {
  case "$1" in run.start|feature.selected|pr.opened|run.end) return 0;; *) return 1;; esac
}

# emit_event TYPE [k=v ...]: append a JSON line to the run's events.jsonl (and
# loop.jsonl for run-level types), and print a plain human line to stdout
# (colored only when stdout is a TTY). Values are passed to jq as --arg (strings);
# numeric/bool/array coercion is handled per-key below. Never fails the loop.
emit_event() {
  local type="$1"; shift || true
  local ts seq; ts="$(date +%Y-%m-%dT%H:%M:%S)"; seq="$(_next_seq)"
  local -a jqargs=(--arg ts "$ts" --arg run_id "${RUN_ID:-unknown}" --arg type "$type" --argjson seq "$seq")
  local filter='{ts:$ts,run_id:$run_id,seq:$seq,type:$type}'
  local kv k v
  for kv in "$@"; do
    k="${kv%%=*}"; v="${kv#*=}"
    case "$k" in
      # numeric / boolean / json-array keys are injected as JSON
      priority|count|cap|additions|deletions|duration_ms|number|passed|excluded|files|depends_on)
        jqargs+=(--argjson "$k" "$v"); filter="$filter + {$k:\$$k}";;
      *)
        jqargs+=(--arg "$k" "$v"); filter="$filter + {$k:\$$k}";;
    esac
  done
  local line
  line="$(jq -nc "${jqargs[@]}" "$filter" 2>/dev/null)" || return 0
  [[ -n "$line" && -n "${RUN_DIR:-}" ]] && printf '%s\n' "$line" >> "$RUN_DIR/events.jsonl" 2>/dev/null || true
  if _is_run_level "$type"; then printf '%s\n' "$line" >> "$LOOP_LOG" 2>/dev/null || true; fi
  _emit_human "$type" "$@"
}

# Plain one-line human summary (colored iff TTY). Purely cosmetic.
_emit_human() {
  local type="$1"; shift || true
  local msg="$type"
  for kv in "$@"; do msg="$msg ${kv}"; done
  if [[ -t 1 ]]; then printf '\033[2m[%s]\033[0m \033[36m%s\033[0m\n' "$(date +%H:%M:%S)" "$msg"
  else printf '[%s] %s\n' "$(date +%H:%M:%S)" "$msg"; fi
}
