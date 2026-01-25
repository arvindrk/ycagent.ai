import { type NextRequest, NextResponse } from 'next/server';
import { searchCompanies, getSearchCount } from '@/lib/search/query';
import { parseSearchFilters } from '@/lib/search/filters/parse';
import { searchInputSchema } from '@/lib/validations/search.schema';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = request.nextUrl;
    const rawParams = Object.fromEntries(searchParams);
    const validatedParams = searchInputSchema.parse(rawParams);
    const filters = parseSearchFilters(validatedParams);

    const [results, total] = await Promise.all([
      searchCompanies({
        query: validatedParams.q,
        filters,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
      }),
      getSearchCount(validatedParams.q, filters),
    ]);

    const queryTime = Date.now() - startTime;

    return NextResponse.json({
      data: results,
      total,
      limit: validatedParams.limit,
      offset: validatedParams.offset,
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
