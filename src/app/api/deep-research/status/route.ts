import { type NextRequest, NextResponse } from 'next/server';
import { runs } from "@trigger.dev/sdk/v3";
import type { deepResearchOrchestrator } from "@/trigger/deep-research-orchestrator";
import { z } from 'zod';

export const runtime = 'nodejs';

const statusQuerySchema = z.object({
  runId: z.string().min(1, 'Run ID is required'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawParams = Object.fromEntries(searchParams);
    const { runId } = statusQuerySchema.parse(rawParams);

    const run = await runs.retrieve<typeof deepResearchOrchestrator>(runId);

    return NextResponse.json({
      success: true,
      run: {
        id: run.id,
        status: run.status,
        metadata: run.metadata,
        output: run.output,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        isTest: run.isTest,
      },
    });

  } catch (error) {
    console.error('Deep Research status error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve deep research status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
