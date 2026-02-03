import { type NextRequest, NextResponse } from 'next/server';
import { tasks } from "@trigger.dev/sdk/v3";
import type { deepResearchOrchestrator } from "@/trigger/deep-research-orchestrator";
import { triggerDeepResearchRequestSchema } from "@/lib/validations/deep-research.schema";

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company, forceRefresh } = triggerDeepResearchRequestSchema.parse(body);

    const idempotencyKey = forceRefresh
      ? `deep-research_${company.id}_${Date.now()}`
      : `deep-research_${company.id}`;

    const handle = await tasks.trigger<typeof deepResearchOrchestrator>(
      "deep-research-orchestrator",
      company,
      {
        idempotencyKey,
        idempotencyKeyTTL: "30d",
        tags: [
          `company:${company.id}`,
          `batch:${company.batch || 'unknown'}`,
        ],
      }
    );

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
      idempotencyKey,
      message: "Deep Research task triggered successfully",
    });

  } catch (error) {
    console.error('Deep Research trigger error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger deep research task',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
