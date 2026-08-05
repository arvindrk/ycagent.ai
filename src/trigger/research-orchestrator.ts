import { task, metadata, logger } from "@trigger.dev/sdk/v3";
import { deepResearchAgent } from "./deep-research-agent";
import { DOMAIN_REGISTRY, getResearchDomains } from "@/lib/research/domain-registry";
import { DeepResearchAgentPayload, DomainResearchResult, ResearchOrchestratorPayload } from "@/types/trigger.types";
import { getToolsForDomain } from "@/lib/schemas/tool.schema";
import { updateResearchRunStatus } from "@/lib/db/queries/research-runs.queries";
import { resolveResearchRunStatus } from "@/lib/research/resolve-research-run-status";

export const researchOrchestrator = task({
  id: "research-orchestrator",
  run: async (payload: ResearchOrchestratorPayload, { ctx }) => {
    metadata.set("status", "starting");

    const domains = getResearchDomains();
    const results: DomainResearchResult[] = [];

    logger.info("Research started", { companyId: payload.company.id, companyName: payload.company.name, domains });

    // A domain failure used to throw, which discarded every domain that had
    // already succeeded. Failures are collected so a partial result still
    // reaches the user.
    const failures: { domain: string; error: string }[] = [];

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
        const error = String(result.error);
        logger.error("Domain agent failed", { domainKey, companyId: payload.company.id, error });
        failures.push({ domain: domainKey, error });
        continue;
      }

      logger.info("Domain complete", { domainKey, companyId: payload.company.id });
      results.push({
        domain: domainKey,
        ...result.output
      });
    }

    const status = resolveResearchRunStatus({
      succeeded: results.length,
      failed: failures.length,
    });

    logger.info("Research finished", {
      companyId: payload.company.id,
      status,
      domainCount: results.length,
      failedDomains: failures.map(f => f.domain),
    });
    metadata.set("status", status);

    await updateResearchRunStatus({
      triggerRunId: ctx.run.id,
      status: status === "failed" ? "failed" : "completed",
      ...(failures.length > 0
        ? { errorMessage: failures.map(f => `${f.domain}: ${f.error}`).join("; ") }
        : {}),
    });

    // Only a total loss is worth failing the run: with any domain complete the
    // user has something to read.
    if (status === "failed") {
      throw new Error(failures.map(f => `Agent failed on ${f.domain}: ${f.error}`).join("; "));
    }

    return results;
  }
});
