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
