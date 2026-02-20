import { NextRequest } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { Sandbox } from "@e2b/desktop";
import { DEFAULT_DESKTOP_TIMEOUT } from "@/constants/llm.constants";
import type { researchOrchestrator } from "@/trigger/research-orchestrator";
import type { Company } from "@/types/company.types";
import { DEFAULT_RESOLUTION, Resolution } from "@/types/sandbox.types";
import { getSession } from "@/lib/session";

async function createSandbox(resolution: Resolution) {
  return Sandbox.create({
    resolution,
    dpi: 96,
    timeoutMs: DEFAULT_DESKTOP_TIMEOUT,
  });
}

async function startStreamAndGetUrl(desktop: Sandbox) {
  await desktop.stream.start();
  return desktop.stream.getUrl({ viewOnly: true });
}

export async function POST(request: NextRequest) {
  const session = await getSession(request.headers);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    console.log(JSON.stringify({
      event: "research_triggered",
      runId: handle.id,
      companyId: company.id,
      companyName: company.name,
      sandboxId: desktop.sandboxId,
    }));

    return Response.json({
      runId: handle.id,
      sandboxId: desktop.sandboxId,
      vncUrl,
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "research_start_failed",
      companyId: company?.id,
      error: error instanceof Error ? error.message : String(error),
    }));
    return Response.json({ error: "Failed to start research task" }, { status: 500 });
  }
}
