import { type NextRequest, NextResponse } from 'next/server';
import { tasks } from "@trigger.dev/sdk/v3";
import type { researchOrchestrator } from "@/trigger/research-orchestrator";
import { triggerResearchRequestSchema } from "@/lib/validations/research.schema";

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company, forceRefresh } = triggerResearchRequestSchema.parse(body);

    const idempotencyKey = forceRefresh
      ? `research_${company.companyId}_${Date.now()}`
      : `research_${company.companyId}`;

    const handle = await tasks.trigger<typeof researchOrchestrator>(
      "research-orchestrator",
      company,
      {
        idempotencyKey,
        idempotencyKeyTTL: "30d",
        tags: [
          `company:${company.companyId}`,
          `batch:${company.companyBatch || 'unknown'}`,
        ],
      }
    );

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
      idempotencyKey,
      message: "Research task triggered successfully",
    });

  } catch (error) {
    console.error('Research trigger error:', error);

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
        error: 'Failed to trigger research task',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
