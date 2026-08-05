import { NextRequest, NextResponse } from 'next/server';
import { searchCompanies as dbSearchCompanies } from '@/lib/semantic-search/query';
import { parseSearchFilters } from '@/lib/semantic-search/filters/parse';
import { extractFiltersFromQuery } from '@/lib/semantic-search/filters/extract-from-query';
import {
  resolveAchievedSearchPath,
  resolveSearchPath,
} from '@/lib/semantic-search/resolve-search-path';
import {
  EmbeddingAbortedError,
  generateEmbeddingBestEffort,
} from '@/lib/semantic-search/embeddings/generate';
import { searchInputSchema } from '@/lib/schemas/search.schema';
import type { SearchPath } from '@/lib/schemas/search.schema';
import type { ParsedFilters } from '@/lib/semantic-search/filters/parse';
import { captureServerEvent } from '@/lib/analytics/posthog';
import { getDistinctId, getIpAddress } from '@/lib/analytics/get-distinct-id';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const ip = getIpAddress(request.headers);
  const distinctId = getDistinctId(request.cookies, ip);

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  try {
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

    // Skip vector when cleaned residue is empty (all tokens consumed or whitespace-only)
    const skipVectorSearch = resolveSearchPath(cleanedQuery) === 'keyword';

    let embedding: number[] | null = null;
    let degraded = false;

    if (!skipVectorSearch) {
      const attempt = await generateEmbeddingBestEffort(validatedParams.q, request.signal);
      embedding = attempt.embedding;

      if (embedding === null) {
        degraded = true;
        console.error('[search] embedding provider unavailable, ranking on full text', {
          reason: attempt.failureReason,
        });
        captureServerEvent(distinctId, 'search_embedding_degraded', {
          query: validatedParams.q,
          reason: attempt.failureReason,
        });
      }
    }

    const search_path = resolveAchievedSearchPath({
      skipVectorSearch,
      hasEmbedding: embedding !== null,
    });

    const results = await dbSearchCompanies({
      query: validatedParams.q,
      textQuery: cleanedQuery,
      filters: mergedFilters,
      limit: validatedParams.limit,
      skipVectorSearch,
    }, embedding);

    const queryTime = Date.now() - startTime;

    captureServerEvent(distinctId, 'search_performed', {
      query: validatedParams.q,
      result_count: results.length,
      query_time_ms: queryTime,
      has_results: results.length > 0,
      search_path,
      degraded,
      results,
    });

    return NextResponse.json({
      data: results,
      total: results.length,
      limit: validatedParams.limit,
      query_time_ms: queryTime,
      search_path,
      ...(degraded ? { degraded } : {}),
    });
  } catch (error) {
    if (
      error instanceof EmbeddingAbortedError ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      return new NextResponse('Request aborted', { status: 499 });
    }

    const reason = error instanceof Error ? error.message : String(error);
    // Upstream messages can carry account and billing detail, so they stay server-side.
    console.error('[search] request failed', { reason });
    captureServerEvent(distinctId, 'semantic_search_failed', {
      query: q,
      error: reason,
    });
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
