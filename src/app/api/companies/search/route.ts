import { NextRequest, NextResponse } from 'next/server';
import { searchCompanies as dbSearchCompanies } from '@/lib/semantic-search/query';
import { parseSearchFilters } from '@/lib/semantic-search/filters/parse';
import { extractFiltersFromQuery } from '@/lib/semantic-search/filters/extract-from-query';
import { generateEmbedding } from '@/lib/semantic-search/embeddings/generate';
import { searchInputSchema } from '@/lib/schemas/search.schema';
import type { ParsedFilters } from '@/lib/semantic-search/filters/parse';

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

    const { extractedFilters, cleanedQuery } = extractFiltersFromQuery(validatedParams.q);
    const explicitFilters = parseSearchFilters(validatedParams);
    const definedExplicitFilters = Object.fromEntries(
      Object.entries(explicitFilters).filter(([, v]) => v !== undefined)
    ) as Partial<ParsedFilters>;
    const mergedFilters: ParsedFilters = { ...extractedFilters, ...definedExplicitFilters };

    // Skip vector search only when ALL tokens were consumed by filter extraction
    const skipVectorSearch = cleanedQuery.trim().length === 0;

    const embedding = skipVectorSearch
      ? null
      : await generateEmbedding(validatedParams.q, request.signal);

    const results = await dbSearchCompanies({
      query: validatedParams.q,
      filters: mergedFilters,
      limit: validatedParams.limit,
      skipVectorSearch,
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
