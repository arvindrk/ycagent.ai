import { NextRequest } from "next/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { Sandbox } from "@e2b/desktop";
import { DEFAULT_DESKTOP_TIMEOUT } from "@/constants/llm.constants";
import type { researchOrchestrator } from "@/trigger/research-orchestrator";
import { DEFAULT_RESOLUTION, Resolution } from "@/types/sandbox.types";
import { companySchema } from "@/lib/schemas/company.schema";
import { getSession } from "@/lib/session";
import { insertResearchRun } from "@/lib/db/queries/research-runs.queries";
import { captureServerEvent } from "@/lib/analytics/posthog";

const researchRequestSchema = z.object({
  company: companySchema,
  resolution: z.tuple([z.number(), z.number()]).optional(),
  sandboxId: z.string().min(1).optional(),
});

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

  const body = await request.json();
  const parsed = researchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { company, resolution = DEFAULT_RESOLUTION, sandboxId } = parsed.data;

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

    await insertResearchRun({
      userId: session.user.id,
      userEmail: session.user.email,
      companyId: company.id,
      companyName: company.name,
      triggerRunId: handle.id,
      sandboxId: desktop.sandboxId,
    });

    captureServerEvent(session.user.id, 'research_triggered', {
      company_id: company.id,
      company_name: company.name,
      run_id: handle.id,
      $set: { email: session.user.email },
    });

    return Response.json({
      runId: handle.id,
      sandboxId: desktop.sandboxId,
      vncUrl,
    });
  } catch (error) {
    captureServerEvent(session.user.id, 'research_failed', {
      company_id: company?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Failed to start research task" }, { status: 500 });
  }
}
