import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import { RunTimeline } from "../components/RunTimeline.tsx";
import type { Run } from "../model.ts";

test("RunTimeline renders the feature id and status", () => {
  const run: Run = {
    runId: "20260620-161549",
    featureId: "auth-build-env-cleanup",
    status: "completed",
    events: [],
    reasoning: [],
  };
  const { lastFrame } = render(<RunTimeline run={run} expanded={false} />);
  const frame = lastFrame() ?? "";
  assert.match(frame, /auth-build-env-cleanup/);
  assert.match(frame, /completed/);
});
