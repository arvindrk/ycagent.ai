import { task, metadata } from "@trigger.dev/sdk/v3";
import { deepResearchAgent } from "./deep-research-agent";
import { DOMAIN_REGISTRY, getResearchDomains } from "@/lib/research/domain-registry";
import { DeepResearchAgentPayload, DomainResearchResult, ResearchOrchestratorPayload } from "@/types/trigger.types";

export const researchOrchestrator = task({
  id: "research-orchestrator",
  run: async (payload: ResearchOrchestratorPayload) => {
    metadata.set("status", "starting");

    const domains = getResearchDomains();
    const results: DomainResearchResult[] = [];

    for (const domainKey of domains) {
      const config = DOMAIN_REGISTRY[domainKey];
      metadata.set("currentDomain", domainKey);

      const agentPayload: DeepResearchAgentPayload = {
        ...payload,
        domain: domainKey,
        initialMessage: config.generateInitialMessage(payload.company),
        systemPrompt: config.systemPrompt,
      };

      const result = await deepResearchAgent.triggerAndWait(agentPayload);

      if (!result.ok) {
        metadata.set("status", "failed");
        throw new Error(`Agent failed on ${domainKey}: ${result.error}`);
      }

      results.push({
        domain: domainKey,
        ...result.output
      });
    }

    metadata.set("status", "complete");

    return results;
  }
});
