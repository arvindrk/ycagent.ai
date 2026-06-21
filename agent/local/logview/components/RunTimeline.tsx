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
