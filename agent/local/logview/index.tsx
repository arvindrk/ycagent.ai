import React from "react";
import { render } from "ink";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Dashboard } from "./components/Dashboard.tsx";
import { FeatureLifecycle } from "./components/FeatureLifecycle.tsx";
import { RunTimeline } from "./components/RunTimeline.tsx";
import { loadRun, buildFeature, listRunIds, logsDir } from "./model.ts";
import { renderReport } from "./report.ts";

function repoRoot(): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
}

const [cmd, arg] = process.argv.slice(2);
const root = repoRoot();

if (!cmd || cmd === "live") {
  render(<Dashboard repoRoot={root} />);
} else if (cmd === "run") {
  const id = arg ?? listRunIds(root)[0];
  if (!id) { console.error("no runs found"); process.exit(1); }
  render(<RunTimeline run={loadRun(root, id)} expanded={true} />);
} else if (cmd === "feature") {
  if (!arg) { console.error("usage: logs feature <feature_id>"); process.exit(1); }
  render(<FeatureLifecycle feature={buildFeature(root, arg)} />);
} else if (cmd === "report") {
  const id = arg ?? listRunIds(root)[0];
  if (!id) { console.error("no runs found"); process.exit(1); }
  const md = renderReport(loadRun(root, id));
  const out = join(logsDir(root), "runs", id, "report.md");
  writeFileSync(out, md);
  console.log(`wrote ${out}`);
} else {
  console.log("usage: logs [live] | run <id> | feature <id> | report <id>");
}
