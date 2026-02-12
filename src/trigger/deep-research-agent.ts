import { task } from "@trigger.dev/sdk/v3";
import { Sandbox } from "@e2b/desktop";
import { researchStream } from "./streams";
import { StreamerFactory } from "@/lib/llm/factory";
import { ComputerAgent, SSEEvent } from "@/lib/llm/types";
import { ResearchOrchestratorPayload } from "./research-orchestrator";
import { DEFAULT_RESOLUTION } from "@/lib/sandbox-desktop/types";

export const deepResearchAgent = task({
  id: "deep-research-agent",
  maxDuration: 600,
  run: async (payload: ResearchOrchestratorPayload) => {
    const resolution = payload.resolution || DEFAULT_RESOLUTION;
    const vncUrl = payload.vncUrl;
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

    const streamer = StreamerFactory.getStreamer(
      ComputerAgent.ANTHROPIC,
      desktop,
      resolution
    );

    const initialMessage = {
      role: "user" as const,
      content: `Find information about ${payload.company.name}${payload.company.website ? `. Their website is ${payload.company.website}` : ""
        }`
    };

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
