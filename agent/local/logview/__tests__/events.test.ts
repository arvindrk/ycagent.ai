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
