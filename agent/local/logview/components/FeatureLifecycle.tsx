import React from "react";
import { Box, Text } from "ink";
import type { Feature } from "../model.ts";

export function FeatureLifecycle({ feature }: { feature: Feature }) {
  return (
    <Box flexDirection="column">
      <Text bold>{feature.featureId} <Text dimColor>({feature.status ?? "?"})</Text></Text>
      {feature.description ? <Text>{"  inception   "}<Text dimColor>{feature.description.slice(0, 100)}</Text></Text> : null}
      {feature.runs.map((r, i) => <Text key={i}>{`  selected    run ${r.runId}`}{r.why ? <Text dimColor> - {r.why}</Text> : null}</Text>)}
      {feature.prs.map((p, i) => <Text key={i}>{`  pr          #${p.number} ${p.title} `}<Text dimColor>[{p.state}]</Text></Text>)}
    </Box>
  );
}
