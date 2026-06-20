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
