import { NextRequest } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { Sandbox } from "@e2b/desktop";
import { DESKTOP_TIMEOUT } from "@/lib/llm/constants";
import type { researchOrchestrator } from "@/trigger/research-orchestrator";
import type { Company } from "@/types/company.types";
import { DEFAULT_RESOLUTION, Resolution } from "@/types/sandbox.types";

async function createSandbox(resolution: Resolution) {
  return Sandbox.create({
    resolution,
    dpi: 96,
    timeoutMs: DESKTOP_TIMEOUT,
  });
}

async function startStreamAndGetUrl(desktop: Sandbox) {
  await desktop.stream.start();
  return desktop.stream.getUrl({ viewOnly: true });
}

export async function POST(request: NextRequest) {
  const { company, resolution = DEFAULT_RESOLUTION, sandboxId } = await request.json() as {
    company: Company;
    resolution?: Resolution;
    sandboxId?: string;
  };

  if (!process.env.E2B_API_KEY) {
    return Response.json({ error: "E2B API key not configured" }, { status: 500 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  try {
    let desktop: Sandbox;
    if (sandboxId) {
      try {
        desktop = await Sandbox.connect(sandboxId);
      } catch {
        desktop = await createSandbox(resolution);
      }
    } else {
      desktop = await createSandbox(resolution);
    }
    const vncUrl = await startStreamAndGetUrl(desktop);

    const handle = await tasks.trigger<typeof researchOrchestrator>(
      "research-orchestrator",
      {
        company,
        resolution,
        sandboxId: desktop.sandboxId,
        vncUrl,
      }
    );

    return Response.json({
      runId: handle.id,
      sandboxId: desktop.sandboxId,
      vncUrl,
    });
  } catch (error) {
    console.error("Research API error:", error);
    return Response.json({ error: "Failed to start research task" }, { status: 500 });
  }
}
