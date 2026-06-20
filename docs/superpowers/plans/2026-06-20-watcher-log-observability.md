# Watcher Log Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the loop's flat text logs with a typed JSONL event stream (capture) plus an ink-based TUI and Markdown reports (presentation) that trace each feature from inception through reasoning to implementation.

**Architecture:** Bash wrappers emit typed JSONL events via `emit_event` (jq) into `agent/brain/logs/runs/<run_id>/events.jsonl` and a master `loop.jsonl`; the orchestrator's full reasoning trail is captured raw via `claude --output-format stream-json`. A read-only TS renderer (run via `tsx`) parses those into a model and renders a live ink TUI, static Markdown reports, and a cross-run feature view. Capture is best-effort and never breaks the loop.

**Tech Stack:** bash + jq (capture), TypeScript + tsx + React 19 + ink (renderer), node:test (tests), gh CLI.

**Spec:** `docs/superpowers/specs/2026-06-20-watcher-log-observability-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `agent/local/lib.sh` (modify) | Add `emit_event`, run-dir/seq helpers, TTY-aware human line |
| `agent/local/continue.sh` (modify) | Emit lifecycle events per phase; capture agent stream-json |
| `agent/local/logview/events.ts` (create) | Event type union + JSONL/agent-stream parsers (the contract) |
| `agent/local/logview/model.ts` (create) | Aggregate events into Run and Feature views |
| `agent/local/logview/report.ts` (create) | Serialize a Run to Markdown |
| `agent/local/logview/components/*.tsx` (create) | ink views: Dashboard, RunTimeline, ReasoningTrail, FeatureLifecycle |
| `agent/local/logview/index.tsx` (create) | CLI entry: `live` / `run` / `feature` / `report` |
| `agent/local/logview/__tests__/*.test.ts` (create) | Parser/model/report unit tests |
| `agent/local/logview/README.md` (create) | How to use the renderer |
| `package.json` (modify) | Add `ink` (+ `ink-testing-library` dev); add `logs` script |
| `AGENTS.md`, `agent/AUTONOMY.md` (modify) | Document the observability tooling |

Runtime (gitignored under `agent/brain/`): `logs/loop.jsonl`, `logs/runs/<run_id>/{events.jsonl,agent.stream.jsonl,report.md}`, `logs/.seq/<run_id>`.

---

## Task 0: Preflight — pin versions, verify flags, install deps

**Files:** `package.json` (modify)

- [ ] **Step 1: Confirm the ink version compatible with React 19**

Run:
```bash
npm view ink version peerDependencies.react
```
Expected: a version (ink >= 5; v6 targets React 19). Record the major to install. If ink's peer is `^18 || ^19` or `>=19`, pin that major.

- [ ] **Step 2: Confirm the Claude stream-json flags**

Run:
```bash
claude --help 2>&1 | grep -iE "output-format|verbose|stream-json"
```
Expected: `--output-format` lists `stream-json`, and `--verbose` exists. (stream-json requires `--verbose` in `-p` mode.) If `stream-json` is absent, fall back to `--output-format json` and capture the single JSON result (Task 6 notes this).

- [ ] **Step 3: Confirm node + tsx can run TS tests**

Run:
```bash
node --version && npx tsx --version && node -e "require('node:test'); console.log('node:test OK')"
```
Expected: node 22.x, tsx 4.x, `node:test OK`.

- [ ] **Step 4: Install deps and add the script**

Run (pin the major from Step 1; example uses 6):
```bash
npm install --save ink@^6
npm install --save-dev ink-testing-library@^4
npm pkg set scripts.logs="tsx agent/local/logview/index.tsx"
```
Expected: `package.json` + `package-lock.json` updated; `npm run logs -- --help` will work after Task 5.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(logview): add ink + logs script for watcher observability"
```

---

## Task 1: Capture helper in `lib.sh`

**Files:** `agent/local/lib.sh` (modify)

- [ ] **Step 1: Append the capture helpers**

Add to the end of `agent/local/lib.sh` (after the existing `acquire_lock`):
```bash
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
```

- [ ] **Step 2: Smoke-test the helper produces valid JSONL**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
bash -c '
  source agent/local/lib.sh
  init_run smoke-test
  emit_event run.start base_sha=abc123 branch=codex/x
  emit_event feature.selected feature_id=foo title="do a thing" priority=3 why="next unblocked" depends_on='"'"'["bar"]'"'"'
  emit_event run.end status=completed duration_ms=4200
  echo "--- events.jsonl ---"; cat agent/brain/logs/runs/smoke-test/events.jsonl | jq -c .
  echo "--- loop.jsonl (run-level only) ---"; jq -c "select(.run_id==\"smoke-test\")" agent/brain/logs/loop.jsonl
'
rm -rf agent/brain/logs/runs/smoke-test agent/brain/logs/.seq/smoke-test
```
Expected: three valid JSON lines in `events.jsonl` (run.start, feature.selected with `priority` as a number and `depends_on` as an array, run.end); `loop.jsonl` contains run.start, feature.selected, run.end (run-level) but not phase events. `jq -c .` succeeding proves the JSON is well-formed.

- [ ] **Step 3: Shellcheck (if present) and commit**

```bash
command -v shellcheck >/dev/null && shellcheck agent/local/lib.sh || echo "skip"
git add agent/local/lib.sh
git commit -m "feat(logview): structured event capture helpers in lib.sh"
```

---

## Task 2: Event types + parsers (`events.ts`)

**Files:**
- Create: `agent/local/logview/events.ts`
- Create: `agent/local/logview/__tests__/events.test.ts`

- [ ] **Step 1: Write the failing test**

Create `agent/local/logview/__tests__/events.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEvents, parseAgentStream } from "../events.ts";

test("parseEvents skips blank/malformed lines and keeps valid ones", () => {
  const text = [
    JSON.stringify({ ts: "2026-06-20T16:15:49", run_id: "r1", seq: 1, type: "run.start", base_sha: "abc" }),
    "",
    "{not json",
    JSON.stringify({ ts: "2026-06-20T16:15:52", run_id: "r1", seq: 2, type: "feature.selected", feature_id: "f", priority: 3 }),
  ].join("\n");
  const events = parseEvents(text);
  assert.equal(events.length, 2);
  assert.equal(events[0].type, "run.start");
  assert.equal(events[1].type, "feature.selected");
});

test("parseAgentStream extracts tool_use and assistant text", () => {
  const text = [
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "I will edit auth.ts" }] } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "src/lib/auth.ts" } }] } }),
  ].join("\n");
  const steps = parseAgentStream(text);
  assert.equal(steps.length, 2);
  assert.equal(steps[0].kind, "text");
  assert.equal(steps[1].kind, "tool_use");
  assert.equal(steps[1].tool, "Edit");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run:
```bash
node --import tsx --test agent/local/logview/__tests__/events.test.ts
```
Expected: FAIL ("Cannot find module '../events.ts'").

- [ ] **Step 3: Implement `events.ts`**

Create `agent/local/logview/events.ts`:
```ts
// The JSONL event contract. Mirrors agent/local/lib.sh emit_event output.
export type LoopEvent =
  | { ts: string; run_id: string; seq: number; type: "run.start"; base_sha: string; branch: string; watcher_pid?: string }
  | { ts: string; run_id: string; seq: number; type: "guard.inflight"; excluded: string[]; cap: number; count: number }
  | { ts: string; run_id: string; seq: number; type: "feature.selected"; feature_id: string; title?: string; priority?: number; why?: string; depends_on?: string[] }
  | { ts: string; run_id: string; seq: number; type: "phase.start" | "phase.end"; phase: string; duration_ms?: number }
  | { ts: string; run_id: string; seq: number; type: "impl.changes"; files: string[]; additions: number; deletions: number }
  | { ts: string; run_id: string; seq: number; type: "verify.result"; command: string; passed: boolean; summary?: string }
  | { ts: string; run_id: string; seq: number; type: "pr.opened"; number: number; url: string; title: string }
  | { ts: string; run_id: string; seq: number; type: "run.end"; status: "completed" | "no-changes" | "failed" | "skipped"; duration_ms?: number; reason?: string };

export function parseEvents(text: string): LoopEvent[] {
  const out: LoopEvent[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t);
      if (o && typeof o.type === "string" && typeof o.run_id === "string") out.push(o as LoopEvent);
    } catch { /* skip malformed */ }
  }
  return out;
}

export type AgentStep =
  | { kind: "text"; text: string }
  | { kind: "tool_use"; tool: string; input: unknown }
  | { kind: "tool_result"; ok: boolean }
  | { kind: "result"; text: string };

// Parse claude --output-format stream-json (one JSON object per line).
export function parseAgentStream(text: string): AgentStep[] {
  const out: AgentStep[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let o: any;
    try { o = JSON.parse(t); } catch { continue; }
    if (o.type === "assistant" && o.message?.content) {
      for (const c of o.message.content) {
        if (c.type === "text" && c.text) out.push({ kind: "text", text: c.text });
        else if (c.type === "tool_use") out.push({ kind: "tool_use", tool: c.name ?? "?", input: c.input });
      }
    } else if (o.type === "user" && o.message?.content) {
      for (const c of o.message.content) {
        if (c.type === "tool_result") out.push({ kind: "tool_result", ok: !c.is_error });
      }
    } else if (o.type === "result") {
      out.push({ kind: "result", text: typeof o.result === "string" ? o.result : "" });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run:
```bash
node --import tsx --test agent/local/logview/__tests__/events.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add agent/local/logview/events.ts agent/local/logview/__tests__/events.test.ts
git commit -m "feat(logview): event + agent-stream parsers with tests"
```

---

## Task 3: Aggregation model (`model.ts`)

**Files:**
- Create: `agent/local/logview/model.ts`
- Create: `agent/local/logview/__tests__/model.test.ts`

- [ ] **Step 1: Write the failing test**

Create `agent/local/logview/__tests__/model.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRunFromEvents } from "../model.ts";
import { parseEvents } from "../events.ts";

test("buildRunFromEvents summarizes a run", () => {
  const text = [
    { ts: "t", run_id: "r1", seq: 1, type: "run.start", base_sha: "abc1234", branch: "codex/continue-local-r1" },
    { ts: "t", run_id: "r1", seq: 2, type: "feature.selected", feature_id: "auth-build-env-cleanup", priority: 4, why: "#9 in-flight excluded" },
    { ts: "t", run_id: "r1", seq: 3, type: "impl.changes", files: ["src/lib/auth.ts"], additions: 18, deletions: 6 },
    { ts: "t", run_id: "r1", seq: 4, type: "verify.result", command: "npm run build", passed: true },
    { ts: "t", run_id: "r1", seq: 5, type: "pr.opened", number: 11, url: "u", title: "[auth] x" },
    { ts: "t", run_id: "r1", seq: 6, type: "run.end", status: "completed" },
  ].map((e) => JSON.stringify(e)).join("\n");
  const run = buildRunFromEvents("r1", parseEvents(text), []);
  assert.equal(run.featureId, "auth-build-env-cleanup");
  assert.equal(run.status, "completed");
  assert.equal(run.pr?.number, 11);
  assert.equal(run.changes?.files.length, 1);
  assert.equal(run.verify?.passed, true);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run:
```bash
node --import tsx --test agent/local/logview/__tests__/model.test.ts
```
Expected: FAIL ("Cannot find module '../model.ts'").

- [ ] **Step 3: Implement `model.ts`**

Create `agent/local/logview/model.ts`:
```ts
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { parseEvents, parseAgentStream, type LoopEvent, type AgentStep } from "./events.ts";

export interface Run {
  runId: string;
  baseSha?: string;
  branch?: string;
  featureId?: string;
  why?: string;
  priority?: number;
  status?: string;
  changes?: { files: string[]; additions: number; deletions: number };
  verify?: { command: string; passed: boolean };
  pr?: { number: number; url: string; title: string };
  events: LoopEvent[];
  reasoning: AgentStep[];
}

export function buildRunFromEvents(runId: string, events: LoopEvent[], reasoning: AgentStep[]): Run {
  const run: Run = { runId, events, reasoning };
  for (const e of events) {
    if (e.type === "run.start") { run.baseSha = e.base_sha; run.branch = e.branch; }
    else if (e.type === "feature.selected") { run.featureId = e.feature_id; run.why = e.why; run.priority = e.priority; }
    else if (e.type === "impl.changes") run.changes = { files: e.files, additions: e.additions, deletions: e.deletions };
    else if (e.type === "verify.result") run.verify = { command: e.command, passed: e.passed };
    else if (e.type === "pr.opened") run.pr = { number: e.number, url: e.url, title: e.title };
    else if (e.type === "run.end") run.status = e.status;
  }
  return run;
}

export function logsDir(repoRoot: string): string { return join(repoRoot, "agent/brain/logs"); }

export function loadRun(repoRoot: string, runId: string): Run {
  const dir = join(logsDir(repoRoot), "runs", runId);
  const events = existsSync(join(dir, "events.jsonl")) ? parseEvents(readFileSync(join(dir, "events.jsonl"), "utf8")) : [];
  const reasoning = existsSync(join(dir, "agent.stream.jsonl")) ? parseAgentStream(readFileSync(join(dir, "agent.stream.jsonl"), "utf8")) : [];
  return buildRunFromEvents(runId, events, reasoning);
}

export function listRunIds(repoRoot: string): string[] {
  const dir = join(logsDir(repoRoot), "runs");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => /^\d{8}-\d{6}$/.test(d)).sort().reverse();
}

export interface Feature {
  featureId: string;
  description?: string;
  priority?: number;
  status?: string; // from feature_list.json
  runs: { runId: string; why?: string }[];
  prs: { number: number; title: string; state: string }[];
}

export function buildFeature(repoRoot: string, featureId: string): Feature {
  // inception: feature_list.json
  const flPath = join(repoRoot, "agent/feature_list.json");
  let desc: string | undefined, prio: number | undefined, status: string | undefined;
  if (existsSync(flPath)) {
    const fl = JSON.parse(readFileSync(flPath, "utf8")) as any[];
    const f = fl.find((x) => x.id === featureId);
    if (f) { desc = f.description; prio = f.priority; status = f.status; }
  }
  // runs that selected it: loop.jsonl
  const loopPath = join(logsDir(repoRoot), "loop.jsonl");
  const runs: { runId: string; why?: string }[] = [];
  if (existsSync(loopPath)) {
    for (const e of parseEvents(readFileSync(loopPath, "utf8"))) {
      if (e.type === "feature.selected" && e.feature_id === featureId) runs.push({ runId: e.run_id, why: e.why });
    }
  }
  // PRs: gh (best-effort; empty on failure)
  let prs: Feature["prs"] = [];
  try {
    const out = execFileSync("gh", ["pr", "list", "--repo", "arvindrk/ycagent.ai", "--state", "all", "--search", `[${featureId}] in:title`, "--json", "number,title,state"], { encoding: "utf8" });
    prs = JSON.parse(out).map((p: any) => ({ number: p.number, title: p.title, state: p.state }));
  } catch { /* gh unavailable; leave prs empty */ }
  return { featureId, description: desc, priority: prio, status, runs, prs };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run:
```bash
node --import tsx --test agent/local/logview/__tests__/model.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/local/logview/model.ts agent/local/logview/__tests__/model.test.ts
git commit -m "feat(logview): run + feature aggregation model with tests"
```

---

## Task 4: Markdown report (`report.ts`)

**Files:**
- Create: `agent/local/logview/report.ts`
- Create: `agent/local/logview/__tests__/report.test.ts`

- [ ] **Step 1: Write the failing test**

Create `agent/local/logview/__tests__/report.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderReport } from "../report.ts";
import type { Run } from "../model.ts";

test("renderReport produces the five lifecycle sections", () => {
  const run: Run = {
    runId: "r1", baseSha: "abc1234", branch: "codex/continue-local-r1",
    featureId: "auth-build-env-cleanup", why: "#9 in-flight excluded", priority: 4, status: "completed",
    changes: { files: ["src/lib/auth.ts"], additions: 18, deletions: 6 },
    verify: { command: "npm run build", passed: true },
    pr: { number: 11, url: "u", title: "[auth] x" },
    events: [], reasoning: [{ kind: "text", text: "wrap init in a lazy getter" }],
  };
  const md = renderReport(run);
  for (const h of ["# Run r1", "## Inception", "## Reasoning", "## Implementation", "## Verification", "## Outcome"]) {
    assert.ok(md.includes(h), `missing section: ${h}`);
  }
  assert.ok(md.includes("auth-build-env-cleanup"));
  assert.ok(md.includes("PR #11"));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run:
```bash
node --import tsx --test agent/local/logview/__tests__/report.test.ts
```
Expected: FAIL ("Cannot find module '../report.ts'").

- [ ] **Step 3: Implement `report.ts`**

Create `agent/local/logview/report.ts`:
```ts
import type { Run } from "./model.ts";

export function renderReport(run: Run): string {
  const L: string[] = [];
  L.push(`# Run ${run.runId}`, "");
  L.push("## Inception");
  L.push(`- Feature: \`${run.featureId ?? "unknown"}\`${run.priority != null ? ` (priority ${run.priority})` : ""}`);
  if (run.why) L.push(`- Why selected: ${run.why}`);
  if (run.baseSha) L.push(`- Base: \`${run.baseSha}\`  Branch: \`${run.branch ?? "?"}\``);
  L.push("");
  L.push("## Reasoning");
  if (run.reasoning.length === 0) L.push("_No agent reasoning trail captured._");
  for (const s of run.reasoning) {
    if (s.kind === "text") L.push(`- ${s.text.replace(/\n+/g, " ").slice(0, 300)}`);
    else if (s.kind === "tool_use") L.push(`- \`${s.tool}\` ${summarizeInput(s.input)}`);
    else if (s.kind === "result") L.push(`- result: ${s.text.replace(/\n+/g, " ").slice(0, 300)}`);
  }
  L.push("");
  L.push("## Implementation");
  if (run.changes) L.push(`- ${run.changes.files.length} file(s), +${run.changes.additions} −${run.changes.deletions}:`, ...run.changes.files.map((f) => `  - \`${f}\``));
  else L.push("_No file changes._");
  L.push("");
  L.push("## Verification");
  L.push(run.verify ? `- \`${run.verify.command}\` → ${run.verify.passed ? "passed" : "FAILED"}` : "_Not run._");
  L.push("");
  L.push("## Outcome");
  L.push(`- Status: ${run.status ?? "?"}`);
  if (run.pr) L.push(`- PR #${run.pr.number}: ${run.pr.title}`);
  L.push("");
  return L.join("\n");
}

function summarizeInput(input: unknown): string {
  if (input && typeof input === "object") {
    const o = input as Record<string, unknown>;
    const key = o.file_path ?? o.path ?? o.command ?? o.pattern;
    if (key) return `→ ${String(key).slice(0, 120)}`;
  }
  return "";
}
```

- [ ] **Step 4: Run it to verify it passes**

Run:
```bash
node --import tsx --test agent/local/logview/__tests__/report.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/local/logview/report.ts agent/local/logview/__tests__/report.test.ts
git commit -m "feat(logview): Markdown run report (inception→outcome) with test"
```

---

## Task 5: ink components + CLI entry

**Files:**
- Create: `agent/local/logview/components/RunTimeline.tsx`
- Create: `agent/local/logview/components/FeatureLifecycle.tsx`
- Create: `agent/local/logview/components/Dashboard.tsx`
- Create: `agent/local/logview/index.tsx`

- [ ] **Step 1: Create `RunTimeline.tsx`**

```tsx
import React from "react";
import { Box, Text } from "ink";
import type { Run } from "../model.ts";

export function RunTimeline({ run, expanded }: { run: Run; expanded: boolean }) {
  const dot = run.status === "completed" ? "●" : run.status === "failed" ? "✗" : "◐";
  const color = run.status === "completed" ? "green" : run.status === "failed" ? "red" : "yellow";
  return (
    <Box flexDirection="column">
      <Text>
        <Text dimColor>RUN {run.runId}  </Text>
        <Text bold>{run.featureId ?? "?"}</Text>
        <Text color={color}>  {dot} {run.status ?? "running"}</Text>
      </Text>
      {run.why ? <Text>{"  ├ inception   "}<Text dimColor>why: {run.why}</Text></Text> : null}
      {run.changes ? <Text>{`  ├ implement   ${run.changes.files.length} file(s) +${run.changes.additions} −${run.changes.deletions}`}</Text> : null}
      {run.verify ? <Text>{"  ├ verify      "}<Text color={run.verify.passed ? "green" : "red"}>{run.verify.command} {run.verify.passed ? "✓" : "✗"}</Text></Text> : null}
      {run.pr ? <Text>{`  └ outcome     draft PR #${run.pr.number}`}</Text> : null}
      {expanded
        ? run.reasoning.map((s, i) => (
            <Text key={i} dimColor>{"      · "}{s.kind === "tool_use" ? `${s.tool}` : s.kind === "text" ? s.text.slice(0, 70) : s.kind}</Text>
          ))
        : null}
    </Box>
  );
}
```

- [ ] **Step 2: Create `FeatureLifecycle.tsx`**

```tsx
import React from "react";
import { Box, Text } from "ink";
import type { Feature } from "../model.ts";

export function FeatureLifecycle({ feature }: { feature: Feature }) {
  return (
    <Box flexDirection="column">
      <Text bold>{feature.featureId} <Text dimColor>({feature.status ?? "?"})</Text></Text>
      {feature.description ? <Text>{"  inception   "}<Text dimColor>{feature.description.slice(0, 100)}</Text></Text> : null}
      {feature.runs.map((r, i) => <Text key={i}>{`  selected    run ${r.runId}`}{r.why ? <Text dimColor> — {r.why}</Text> : null}</Text>)}
      {feature.prs.map((p, i) => <Text key={i}>{`  pr          #${p.number} ${p.title} `}<Text dimColor>[{p.state}]</Text></Text>)}
    </Box>
  );
}
```

- [ ] **Step 3: Create `Dashboard.tsx` (live, tails events)**

```tsx
import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { listRunIds, loadRun, logsDir } from "../model.ts";
import { RunTimeline } from "./RunTimeline.tsx";
import { watch } from "node:fs";

export function Dashboard({ repoRoot }: { repoRoot: string }) {
  const { exit } = useApp();
  const [runIds, setRunIds] = useState<string[]>(() => listRunIds(repoRoot));
  const [idx, setIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const dir = logsDir(repoRoot);
    let w: ReturnType<typeof watch> | undefined;
    try { w = watch(dir, { recursive: true }, () => { setRunIds(listRunIds(repoRoot)); setTick((t) => t + 1); }); } catch { /* ignore */ }
    const iv = setInterval(() => { setRunIds(listRunIds(repoRoot)); setTick((t) => t + 1); }, 2000);
    return () => { w?.close(); clearInterval(iv); };
  }, [repoRoot]);

  useInput((input, key) => {
    if (input === "q") exit();
    else if (key.downArrow) setIdx((i) => Math.min(i + 1, Math.max(runIds.length - 1, 0)));
    else if (key.upArrow) setIdx((i) => Math.max(i - 1, 0));
    else if (key.return) setExpanded((e) => !e);
  });

  const current = runIds[idx];
  const run = current ? loadRun(repoRoot, current) : undefined;
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold>ycagent.ai · continuation loop <Text dimColor>({runIds.length} runs)</Text></Text>
      {run ? <RunTimeline run={run} expanded={expanded} /> : <Text dimColor>No runs yet. Trigger the watcher.</Text>}
      <Text dimColor>[↑↓] runs  [enter] expand reasoning  [q] quit</Text>
    </Box>
  );
}
```

- [ ] **Step 4: Create `index.tsx` (CLI dispatch)**

```tsx
import React from "react";
import { render } from "ink";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Dashboard } from "./components/Dashboard.tsx";
import { FeatureLifecycle } from "./components/FeatureLifecycle.tsx";
import { RunTimeline } from "./components/RunTimeline.tsx";
import { loadRun, buildFeature, listRunIds, logsDir } from "./model.ts";
import { renderReport } from "./report.ts";

function repoRoot(): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
}

const [cmd, arg] = process.argv.slice(2);
const root = repoRoot();

if (!cmd || cmd === "live") {
  render(<Dashboard repoRoot={root} />);
} else if (cmd === "run") {
  const id = arg ?? listRunIds(root)[0];
  if (!id) { console.error("no runs found"); process.exit(1); }
  render(<RunTimeline run={loadRun(root, id)} expanded={true} />);
} else if (cmd === "feature") {
  if (!arg) { console.error("usage: logs feature <feature_id>"); process.exit(1); }
  render(<FeatureLifecycle feature={buildFeature(root, arg)} />);
} else if (cmd === "report") {
  const id = arg ?? listRunIds(root)[0];
  if (!id) { console.error("no runs found"); process.exit(1); }
  const md = renderReport(loadRun(root, id));
  const out = join(logsDir(root), "runs", id, "report.md");
  writeFileSync(out, md);
  console.log(`wrote ${out}`);
} else {
  console.log("usage: logs [live] | run <id> | feature <id> | report <id>");
}
```

- [ ] **Step 5: Smoke-test the CLI renders from a fixture run**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
mkdir -p agent/brain/logs/runs/20260101-000000
cat > agent/brain/logs/runs/20260101-000000/events.jsonl <<'JSONL'
{"ts":"t","run_id":"20260101-000000","seq":1,"type":"run.start","base_sha":"abc1234","branch":"codex/x"}
{"ts":"t","run_id":"20260101-000000","seq":2,"type":"feature.selected","feature_id":"demo-task","priority":4,"why":"next unblocked"}
{"ts":"t","run_id":"20260101-000000","seq":3,"type":"impl.changes","files":["src/x.ts"],"additions":3,"deletions":1}
{"ts":"t","run_id":"20260101-000000","seq":4,"type":"verify.result","command":"npm run build","passed":true}
{"ts":"t","run_id":"20260101-000000","seq":5,"type":"run.end","status":"completed"}
JSONL
npm run logs -- run 20260101-000000
npm run logs -- report 20260101-000000 && sed -n '1,20p' agent/brain/logs/runs/20260101-000000/report.md
rm -rf agent/brain/logs/runs/20260101-000000
```
Expected: `run` prints the timeline (feature `demo-task`, build ✓, completed); `report` writes a `report.md` with the five sections. (The live `Dashboard` needs an interactive TTY; verify it separately in Task 8.)

- [ ] **Step 6: Lint, typecheck, commit**

```bash
npm run lint && npm run typecheck
git add agent/local/logview/index.tsx agent/local/logview/components
git commit -m "feat(logview): ink TUI dashboard, run/feature views, report CLI"
```
Expected: lint + typecheck pass. (If `tsconfig` excludes `agent/`, add `agent/local/logview` to the typecheck include or give the tool its own `tsconfig.json` extending the root — confirm during this step.)

---

## Task 6: Instrument `continue.sh` with events + agent stream

**Files:** `agent/local/continue.sh` (modify)

- [ ] **Step 1: Initialize the run and emit run.start**

After `wt="$REPO_ROOT/.codex/worktrees/continue-$ts"` (the var block near the top), add:
```bash
init_run "$ts"
run_started=$(date +%s)
emit_event run.start base_sha="$base_sha" branch="$branch"
```

- [ ] **Step 2: Emit guard + feature events**

In the guard block, after `inflight_count` is computed, add (emit excluded as a JSON array built with jq):
```bash
excluded_json="$(printf '%s' "$inflight" | jq -R . | jq -sc 'map(select(length>0))')"
emit_event guard.inflight excluded="$excluded_json" cap="$cap" count="$inflight_count"
```
And replace the cap-skip `exit 0` with:
```bash
if [[ "$inflight_count" -ge "$cap" ]]; then
  log "guard: $inflight_count open continuation PRs >= cap $cap; skipping this run"
  emit_event run.end status=skipped reason="inflight>=cap"
  exit 0
fi
```

- [ ] **Step 3: Capture the agent stream-json and emit phase + feature**

Replace the orchestrator run block so claude writes stream-json to the run dir, and emit `feature.selected` afterward from `run-summary.json`:
```bash
emit_event phase.start phase=orchestrate
(
  cd "$wt"
  claude -p "$(cat "$run_prompt")" \
    --model claude-sonnet-4-6 \
    --mcp-config "$mcp_cfg" \
    --output-format stream-json --verbose \
    --dangerously-skip-permissions
) > "$RUN_DIR/agent.stream.jsonl" 2>&1 || { log "claude run failed"; rm -f "$mcp_cfg"; emit_event run.end status=failed reason="claude-exit"; exit 1; }
rm -f "$mcp_cfg"
emit_event phase.end phase=orchestrate

# feature.selected from the run summary (best-effort)
if [[ -f "$wt/.codex/tmp/run-summary.json" ]]; then
  fid="$(node -e 'try{process.stdout.write((require(process.argv[1]).feature_id)||"")}catch(e){}' "$wt/.codex/tmp/run-summary.json" 2>/dev/null || true)"
  ftitle="$(node -e 'try{process.stdout.write((require(process.argv[1]).title)||"")}catch(e){}' "$wt/.codex/tmp/run-summary.json" 2>/dev/null || true)"
  [[ -n "$fid" ]] && emit_event feature.selected feature_id="$fid" title="$ftitle"
fi
```
Note: if Task 0 Step 2 found `stream-json` unavailable, use `--output-format json` instead and the parser still reads the single result object.

- [ ] **Step 4: Emit impl.changes, verify.result (if run), pr.opened, run.end**

After the commit, before/around the PR creation, add:
```bash
adds="$(git -C "$wt" diff --numstat HEAD~1 | awk '{a+=$1} END{print a+0}')"
dels="$(git -C "$wt" diff --numstat HEAD~1 | awk '{d+=$2} END{print d+0}')"
files_json="$(git -C "$wt" diff --name-only HEAD~1 | jq -R . | jq -sc 'map(select(length>0))')"
emit_event impl.changes files="$files_json" additions="$adds" deletions="$dels"
```
After a successful `gh pr create`, capture the URL/number it printed (assign the gh output to a var):
```bash
pr_url="$(gh pr create --repo arvindrk/ycagent.ai --draft --base main --head "$branch" --title "$title" --body "$body" 2>/dev/null)" \
  || { log "gh pr create failed (branch pushed: $branch)"; emit_event run.end status=failed reason="pr-create"; exit 1; }
pr_num="$(printf '%s' "$pr_url" | sed -nE 's#.*/pull/([0-9]+).*#\1#p')"
emit_event pr.opened number="${pr_num:-0}" url="$pr_url" title="$title"
emit_event run.end status=completed duration_ms="$(( ($(date +%s) - run_started) * 1000 ))"
log "draft PR opened for $branch ($title)"
```
And the `no changes` branch becomes:
```bash
if [[ -z "$(git -C "$wt" status --porcelain)" ]]; then
  log "no changes produced; no PR opened"
  emit_event run.end status=no-changes
  exit 0
fi
```

- [ ] **Step 2..4 verification: syntax + a guarded dry parse**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
bash -n agent/local/continue.sh && echo "syntax OK"
command -v shellcheck >/dev/null && shellcheck agent/local/continue.sh || echo "skip"
```
Expected: `syntax OK`; shellcheck clean (or skipped). (A real run is exercised in Task 8.)

- [ ] **Step 5: Commit**

```bash
git add agent/local/continue.sh
git commit -m "feat(logview): emit lifecycle events + capture agent stream in continue.sh"
```

---

## Task 7: Docs

**Files:**
- Create: `agent/local/logview/README.md`
- Modify: `AGENTS.md`, `agent/AUTONOMY.md`

- [ ] **Step 1: Write `agent/local/logview/README.md`**

```markdown
# logview — continuation loop observability

The loop emits a typed JSONL event stream; this renders it.

- `npm run logs` — live TUI dashboard (↑↓ runs, enter expands the reasoning trail, q quits)
- `npm run logs -- run <run_id>` — full timeline + reasoning for one run
- `npm run logs -- feature <feature_id>` — cross-run lifecycle (inception → runs → PRs → status)
- `npm run logs -- report <run_id>` — write `agent/brain/logs/runs/<run_id>/report.md`

Data lives in `agent/brain/logs/` (gitignored): `loop.jsonl` (run-level), `runs/<id>/events.jsonl`
(per-run timeline), `runs/<id>/agent.stream.jsonl` (raw Sonnet 4.6 reasoning). Event contract:
`events.ts`. Capture: `emit_event` in `agent/local/lib.sh`.
```

- [ ] **Step 2: Update `AGENTS.md` operating model**

Add a bullet under the relevant section:
```markdown
- Observe the loop with `npm run logs` (live TUI), `logs run <id>`, `logs feature <id>`, `logs report <id>`. See `agent/local/logview/README.md`.
```

- [ ] **Step 3: Note it in `agent/AUTONOMY.md` operational notes**

Add a bullet:
```markdown
- Each continuation emits a structured event stream under `agent/brain/logs/runs/<id>/`; view it with `npm run logs` (see agent/local/logview/README.md).
```

- [ ] **Step 4: Commit**

```bash
git add agent/local/logview/README.md AGENTS.md agent/AUTONOMY.md
git commit -m "docs(logview): document the observability tooling"
```

---

## Task 8: End-to-end validation

**Files:** none (validation only)

- [ ] **Step 1: Run the full test suite**

Run:
```bash
cd /Users/arvindkishore/personal/ycagent.ai
node --import tsx --test agent/local/logview/__tests__/*.test.ts
npm run lint && npm run typecheck
```
Expected: all tests pass; lint + typecheck clean.

- [ ] **Step 2: Live continuation run produces structured logs**

Trigger one run (consumes a real Sonnet run + a draft PR; or push an empty commit to main with the watcher running):
```bash
bash agent/local/continue.sh "$(git rev-parse origin/main)" >/dev/null 2>&1 || true
ls -t agent/brain/logs/runs/ | head -1
id="$(ls -t agent/brain/logs/runs/ | head -1)"
jq -c .type "agent/brain/logs/runs/$id/events.jsonl"
wc -l "agent/brain/logs/runs/$id/agent.stream.jsonl"
```
Expected: a new `runs/<id>/` with `events.jsonl` (run.start → feature.selected → … → run.end) and a non-empty `agent.stream.jsonl`.

- [ ] **Step 3: Render it**

Run:
```bash
npm run logs -- run "$id"
npm run logs -- feature "$(jq -r 'select(.type=="feature.selected")|.feature_id' agent/brain/logs/runs/$id/events.jsonl | head -1)"
npm run logs -- report "$id" && sed -n '1,30p' "agent/brain/logs/runs/$id/report.md"
```
Expected: the run timeline, the feature lifecycle (inception → run → PR), and a five-section Markdown report.

- [ ] **Step 4: Open the implementation PR**

```bash
git push -u origin codex/logging-redesign
gh pr create --repo arvindrk/ycagent.ai --draft --base main --head codex/logging-redesign \
  --title "[local-loop] Watcher log observability (JSONL events + ink TUI)" \
  --body "Implements docs/superpowers/specs/2026-06-20-watcher-log-observability-design.md. Typed JSONL event capture in the bash loop + a tsx/ink renderer (live TUI, per-run report, cross-run feature lifecycle), full agent reasoning trail via claude stream-json. Adds the ink dependency. Human merge is the only gate."
```
Expected: draft PR created.

---

## Notes / Operational caveats
- `agent.stream.jsonl` can be large for long runs; it lives in the gitignored `agent/brain/logs/`. A retention/rotation policy is out of scope (note if `runs/` grows large).
- The live `Dashboard` requires an interactive TTY (run it directly in Terminal, not piped).
- If the repo `tsconfig.json` does not include `agent/`, give `agent/local/logview/` its own `tsconfig.json` that extends the root and is referenced by the typecheck step (resolve in Task 5 Step 6).
- `emit_event` is best-effort by design: capture failures must never abort a continuation run.
