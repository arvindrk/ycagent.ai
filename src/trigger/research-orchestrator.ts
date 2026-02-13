import { task, metadata } from "@trigger.dev/sdk/v3";
import { deepResearchAgent } from "./deep-research-agent";
import { DEFAULT_SYSTEM_PROMPT } from "@/constants/llm.constants";
import { DeepResearchAgentPayload, ResearchOrchestratorPayload } from "@/types/trigger.types";
import { Message } from "@/types/llm.types";

export const researchOrchestrator = task({
  id: "research-orchestrator",
  run: async (payload: ResearchOrchestratorPayload) => {
    metadata.set("status", "starting");

    const initialMessage: Message = {
      role: "user",
      content: `Find information about ${payload.company.name}${payload.company.website ? `. Their website is ${payload.company.website}` : ""
        }`
    };

    const newPayload: DeepResearchAgentPayload = {
      ...payload,
      initialMessage,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    }

    const result = await deepResearchAgent.triggerAndWait(newPayload);

    if (!result.ok) {
      metadata.set("status", "failed");
      throw new Error(`Agent failed: ${result.error}`);
    }

    metadata.set("status", "complete");

    return result.output;
  }
});
