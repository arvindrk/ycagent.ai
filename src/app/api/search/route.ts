import { type NextRequest, NextResponse } from 'next/server';
import { searchCompanies } from '@/lib/semantic-search/query';
import { parseSearchFilters } from '@/lib/semantic-search/filters/parse';
import { generateEmbedding } from '@/lib/semantic-search/embeddings/generate';
import { searchInputSchema } from '@/lib/validations/search.schema';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = request.nextUrl;
    const rawParams = Object.fromEntries(searchParams);
    const validatedParams = searchInputSchema.parse(rawParams);
    const filters = parseSearchFilters(validatedParams);

    const embedding = await generateEmbedding(validatedParams.q);

    const results = await searchCompanies({
      query: validatedParams.q,
      filters,
      limit: validatedParams.limit,
    }, embedding);

    const queryTime = Date.now() - startTime;

    return NextResponse.json({
      data: results,
      total: results.length,
      limit: validatedParams.limit,
      query_time_ms: queryTime,
    });
  } catch (error) {
    console.error('Search error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Invalid search parameters',
          details: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
