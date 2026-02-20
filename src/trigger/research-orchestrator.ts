import { task, metadata, logger } from "@trigger.dev/sdk/v3";
import { deepResearchAgent } from "./deep-research-agent";
import { DOMAIN_REGISTRY, getResearchDomains } from "@/lib/research/domain-registry";
import { DeepResearchAgentPayload, DomainResearchResult, ResearchOrchestratorPayload } from "@/types/trigger.types";
import { getToolsForDomain } from "@/lib/schemas/tool.schema";
import { updateResearchRunStatus } from "@/lib/db/queries/research-runs.queries";

export const researchOrchestrator = task({
  id: "research-orchestrator",
  run: async (payload: ResearchOrchestratorPayload, { ctx }) => {
    metadata.set("status", "starting");

    const domains = getResearchDomains();
    const results: DomainResearchResult[] = [];

    logger.info("Research started", { companyId: payload.company.id, companyName: payload.company.name, domains });

    try {
      for (const domainKey of domains) {
        const config = DOMAIN_REGISTRY[domainKey];
        metadata.set("currentDomain", domainKey);
        logger.info("Domain started", { domainKey, companyId: payload.company.id });

        const agentPayload: DeepResearchAgentPayload = {
          ...payload,
          domain: domainKey,
          systemPrompt: config.systemPrompt,
          tools: getToolsForDomain(domainKey),
          initialMessage: config.generateInitialMessage(payload.company),
        };

        const result = await deepResearchAgent.triggerAndWait(agentPayload);

        if (!result.ok) {
          logger.error("Domain agent failed", { domainKey, companyId: payload.company.id, error: result.error });
          metadata.set("status", "failed");
          await updateResearchRunStatus({ triggerRunId: ctx.run.id, status: "failed", errorMessage: `Agent failed on ${domainKey}: ${result.error}` });
          throw new Error(`Agent failed on ${domainKey}: ${result.error}`);
        }

        logger.info("Domain complete", { domainKey, companyId: payload.company.id });
        results.push({
          domain: domainKey,
          ...result.output
        });
      }
    } catch (error) {
      await updateResearchRunStatus({
        triggerRunId: ctx.run.id,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    logger.info("Research complete", { companyId: payload.company.id, domainCount: results.length });
    metadata.set("status", "complete");

    await updateResearchRunStatus({ triggerRunId: ctx.run.id, status: "completed" });

    return results;
  }
});
