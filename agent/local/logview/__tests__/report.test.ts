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
