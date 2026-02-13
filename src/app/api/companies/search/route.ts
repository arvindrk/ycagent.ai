import { NextRequest, NextResponse } from 'next/server';
import { searchCompanies as dbSearchCompanies } from '@/lib/semantic-search/query';
import { parseSearchFilters } from '@/lib/semantic-search/filters/parse';
import { generateEmbedding } from '@/lib/semantic-search/embeddings/generate';
import { searchInputSchema } from '@/lib/schemas/search.schema';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const limit = Number(searchParams.get('limit')) || 50;

    const validatedParams = searchInputSchema.parse({ q, limit });

    if (!validatedParams.q || validatedParams.q.trim().length === 0) {
      return NextResponse.json({
        data: [],
        total: 0,
        limit: validatedParams.limit,
        query_time_ms: 0,
      });
    }

    const filters = parseSearchFilters(validatedParams);
    const embedding = await generateEmbedding(validatedParams.q, request.signal);

    const results = await dbSearchCompanies({
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
    if (error instanceof Error && error.name === 'AbortError') {
      return new NextResponse('Request aborted', { status: 499 });
    }

    console.error('Search error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Search failed' 
      },
      { status: 500 }
    );
  }
}
