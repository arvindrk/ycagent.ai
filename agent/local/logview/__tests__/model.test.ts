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
