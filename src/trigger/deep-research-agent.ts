import { task, logger } from "@trigger.dev/sdk/v3";
import { Sandbox } from "@e2b/desktop";
import { researchStream } from "./streams";
import { StreamerFactory } from "@/lib/llm/factory";
import { LLMProvider, SSEEvent } from "@/types/llm.types";
import { DEFAULT_RESOLUTION } from "@/types/sandbox.types";
import { DeepResearchAgentPayload } from "@/types/trigger.types";

export const deepResearchAgent = task({
  id: "deep-research-agent",
  maxDuration: 600,
  run: async (payload: DeepResearchAgentPayload) => {
    const {
      vncUrl,
      systemPrompt,
      initialMessage,
      resolution = DEFAULT_RESOLUTION,
    } = payload;
    let desktop: Sandbox;

    logger.info("Agent started", { companyId: payload.company.id, domain: payload.domain, sandboxId: payload.sandboxId });

    try {
      desktop = await Sandbox.connect(payload.sandboxId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown connection error";
      logger.error("Sandbox connection failed", { sandboxId: payload.sandboxId, companyId: payload.company.id, domain: payload.domain, error: errorMessage });
      await researchStream.append(
        {
          type: SSEEvent.ERROR,
          error: `Failed to connect to sandbox: ${errorMessage}`,
          sandboxId: payload.sandboxId,
        },
        { target: "parent" }
      );
      throw new Error(`Sandbox connection failed: ${errorMessage}`);
    }

    const streamer = StreamerFactory.getStreamer({
      provider: LLMProvider.OPENAI,
      desktop,
      resolution,
      systemPrompt,
      tools: payload.tools,
    });

    const agentStream = streamer.executeAgentLoop(
      [initialMessage],
      payload.company.website ?? undefined
    );

    const { waitUntilComplete } = researchStream.pipe(agentStream, {
      target: "parent",
    });

    await waitUntilComplete();

    logger.info("Agent loop complete", { sandboxId: desktop.sandboxId, companyId: payload.company.id, domain: payload.domain });

    return {
      sandboxId: desktop.sandboxId,
      vncUrl,
    };
  }
});
