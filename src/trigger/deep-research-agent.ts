import { task } from "@trigger.dev/sdk/v3";
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

    try {
      desktop = await Sandbox.connect(payload.sandboxId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown connection error";
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
      provider: LLMProvider.GOOGLE,
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

    return {
      sandboxId: desktop.sandboxId,
      vncUrl,
    };
  }
});
