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
  engine?: string;
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
    else if (e.type === "phase.start" && e.phase === "orchestrate" && e.engine) run.engine = e.engine;
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
    try {
      const fl = JSON.parse(readFileSync(flPath, "utf8")) as any[];
      const f = fl.find((x) => x.id === featureId);
      if (f) { desc = f.description; prio = f.priority; status = f.status; }
    } catch { /* malformed or mid-write feature_list.json; leave fields undefined */ }
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
