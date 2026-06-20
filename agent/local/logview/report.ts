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
