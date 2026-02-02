import { schemaTask, logger, metadata, wait, idempotencyKeys, AbortTaskRunError } from "@trigger.dev/sdk/v3";
import { companyDeepResearchPayloadSchema } from "@/lib/validations/deep-research.schema";
import type { DeepResearchStepResult, DeepResearchOutput } from "@/lib/validations/deep-research.schema";

const RESEARCH_STEPS = [
  {
    name: "Analyzing company website",
    action: async () => ({
      websiteAnalysis: {
        url: "https://example.com",
        hasSSL: true,
        loadTime: "1.2s",
        mobileOptimized: true,
      },
    }),
  },
  {
    name: "Gathering market data",
    action: async () => ({
      marketData: {
        industry: "Technology",
        marketSize: "$500B",
        growthRate: "15% YoY",
        competitors: ["Competitor A", "Competitor B"],
      },
    }),
  },
  {
    name: "Reviewing competitor landscape",
    action: async () => ({
      competitorAnalysis: {
        directCompetitors: 12,
        marketPosition: "Top 25%",
        uniqueAdvantages: ["Strong brand", "Innovative product"],
      },
    }),
  },
  {
    name: "Analyzing customer reviews",
    action: async () => ({
      customerSentiment: {
        averageRating: 4.5,
        totalReviews: 1234,
        sentiment: "Positive",
        commonPraise: ["Great support", "Easy to use"],
        commonComplaints: ["Pricing", "Limited features"],
      },
    }),
  },
  {
    name: "Generating insights report",
    action: async () => ({
      insights: {
        strengths: ["Strong market position", "Positive customer feedback"],
        weaknesses: ["Pricing concerns", "Feature gaps"],
        opportunities: ["Market expansion", "Product diversification"],
        threats: ["Increasing competition", "Market saturation"],
      },
    }),
  },
];

export const deepResearchOrchestrator = schemaTask({
  id: "deep-research-orchestrator",
  schema: companyDeepResearchPayloadSchema,
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
  catchError: async ({ error, ctx }) => {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorName = error instanceof Error ? error.name : "Error";

    logger.error("Deep research orchestration failed", {
      error: errorMessage,
      errorName,
      runId: ctx.run.id,
      attemptNumber: ctx.attempt.number,
      maxAttempts: ctx.run.maxAttempts,
    });

    metadata.set("status", "error");
    metadata.set("errorDetails", {
      message: errorMessage,
      name: errorName,
      timestamp: new Date().toISOString(),
      attemptNumber: ctx.attempt.number,
    });
  },
  run: async (payload, { ctx }) => {
    const startTime = Date.now();
    const { companyId, companyName } = payload;

    logger.info("Starting deep research orchestration", {
      companyId,
      companyName,
      runId: ctx.run.id,
      attemptNumber: ctx.attempt.number,
    });

    metadata.set("status", "in_progress");
    metadata.set("companyId", companyId);
    metadata.set("companyName", companyName);
    metadata.set("totalSteps", RESEARCH_STEPS.length);
    metadata.set("currentStep", 0);
    metadata.set("progress", 0);
    metadata.set("startedAt", new Date().toISOString());

    const stepResults: DeepResearchStepResult[] = [];

    for (let i = 0; i < RESEARCH_STEPS.length; i++) {
      const stepNum = i + 1;
      const step = RESEARCH_STEPS[i];
      const stepStartTime = Date.now();

      logger.info(`Starting step ${stepNum}/${RESEARCH_STEPS.length}: ${step.name}`, {
        companyId,
        stepNum,
      });

      metadata.set("currentStep", stepNum);
      metadata.set("currentStepName", step.name);
      metadata.set("progress", Math.round((stepNum / RESEARCH_STEPS.length) * 100));
      metadata.set("stepMessage", `Processing: ${step.name}`);
      metadata.set("stepTimestamp", new Date().toISOString());

      const stepIdempotencyKey = await idempotencyKeys.create(`step-${stepNum}-wait`);
      await wait.for({
        seconds: 5,
        idempotencyKey: stepIdempotencyKey,
        idempotencyKeyTTL: "1h",
      });

      let stepResult: DeepResearchStepResult;
      try {
        const stepData = await step.action();
        const stepDuration = Date.now() - stepStartTime;

        stepResult = {
          step: stepNum,
          name: step.name,
          status: "completed" as const,
          data: stepData,
          timestamp: new Date().toISOString(),
          durationMs: stepDuration,
        };

        logger.info(`Completed step ${stepNum}/${RESEARCH_STEPS.length}`, {
          companyId,
          stepNum,
          durationMs: stepDuration,
        });
      } catch (error) {
        const stepDuration = Date.now() - stepStartTime;

        stepResult = {
          step: stepNum,
          name: step.name,
          status: "failed" as const,
          data: { error: error instanceof Error ? error.message : "Unknown error" },
          timestamp: new Date().toISOString(),
          durationMs: stepDuration,
        };

        logger.error(`Failed step ${stepNum}/${RESEARCH_STEPS.length}`, {
          companyId,
          stepNum,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      stepResults.push(stepResult);

      metadata.append("completedSteps", step.name);
    }

    const totalDuration = Date.now() - startTime;
    const completedAt = new Date().toISOString();

    const output: DeepResearchOutput = {
      companyId,
      companyName,
      steps: stepResults,
      summary: `Completed ${stepResults.filter(s => s.status === 'completed').length}/${RESEARCH_STEPS.length} deep research steps successfully`,
      totalDurationMs: totalDuration,
      completedAt,
      cached: false,
    };

    metadata.set("status", "completed");
    metadata.set("completedAt", completedAt);
    metadata.set("progress", 100);
    metadata.set("totalDurationMs", totalDuration);
    metadata.set("stepMessage", "All deep research steps completed successfully");

    logger.info("Deep research orchestration completed", {
      companyId,
      runId: ctx.run.id,
      totalDurationMs: totalDuration,
      successfulSteps: stepResults.filter(s => s.status === 'completed').length,
    });

    return output;
  },
});
