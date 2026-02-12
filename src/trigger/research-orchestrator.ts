import { task, metadata } from "@trigger.dev/sdk/v3";
import { deepResearchAgent } from "./deep-research-agent";
import type { Company } from "@/types/company";
import { Resolution } from "@/lib/sandbox-desktop/resolution";

export interface ResearchOrchestratorPayload {
  company: Company,
  sandboxId: string,
  vncUrl: string,
  resolution?: Resolution,
}

export const researchOrchestrator = task({
  id: "research-orchestrator",
  run: async (payload: ResearchOrchestratorPayload) => {
    metadata.set("status", "starting");

    const result = await deepResearchAgent.triggerAndWait(payload);

    if (!result.ok) {
      metadata.set("status", "failed");
      throw new Error(`Agent failed: ${result.error}`);
    }

    metadata.set("status", "complete");

    return result.output;
  }
});
