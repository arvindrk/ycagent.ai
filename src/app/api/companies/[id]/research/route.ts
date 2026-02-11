import { Sandbox } from "@e2b/desktop";
import { NextRequest } from "next/server";
import { StreamerFactory } from "@/lib/llm/factory";
import { CreateResponseStream } from "@/lib/llm";
import { ComputerAgent, SSEEvent } from "@/lib/llm/types";
import { StreamChunk } from "@/lib/llm/types";
import { DESKTOP_TIMEOUT } from "@/lib/llm/constants";
import { Company } from "@/types/company";

export async function POST(request: NextRequest) {
  const { signal } = request;
  const { company, sandboxId, resolution = [1024, 768] } = await request.json() as {
    company: Company;
    sandboxId?: string;
    resolution?: [number, number];
  };

  let desktop: Sandbox | undefined;

  signal.addEventListener("abort", async () => {
    if (desktop) {
      await desktop.kill().catch((err: Error) =>
        console.error("Failed to kill sandbox on abort:", err)
      );
    }
  });

  if (!process.env.E2B_API_KEY) {
    return Response.json({ error: "E2B API key not configured" }, { status: 500 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  let activeSandboxId = sandboxId;
  let vncUrl: string | undefined;

  try {
    if (!activeSandboxId) {
      desktop = await Sandbox.create({
        resolution,
        dpi: 96,
        timeoutMs: DESKTOP_TIMEOUT,
      });
      activeSandboxId = desktop.sandboxId;
      await desktop.stream.start();
      vncUrl = desktop.stream.getUrl({ viewOnly: true });
    } else {
      desktop = await Sandbox.connect(activeSandboxId);
    }

    if (!desktop) {
      return Response.json({ error: "Failed to connect to sandbox" }, { status: 500 });
    }

    const streamer = StreamerFactory.getStreamer(ComputerAgent.ANTHROPIC, desktop, resolution);

    const initialMessage = {
      role: "user" as const,
      content: `Find information about ${company.name}${company.website ? `. Their website is ${company.website}` : ""}`
    };

    const agentStream = streamer.executeAgentLoop([initialMessage], company.website ?? undefined, { signal });

    if (!sandboxId && activeSandboxId && vncUrl) {
      async function* stream(): AsyncGenerator<StreamChunk> {
        yield {
          type: SSEEvent.INIT,
          sandboxId: activeSandboxId,
          vncUrl
        };
        yield* agentStream;
      }
      return CreateResponseStream(stream());
    }

    return CreateResponseStream(agentStream);
  } catch (error) {
    console.error("Research API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
