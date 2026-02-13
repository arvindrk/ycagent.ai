'use client';

import { useQuery } from '@tanstack/react-query';
import type { SearchCompaniesParams, SearchResponse } from '@/types/semantic-search.types';

async function fetchSearchResults(
  q: string,
  limit: number,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const searchParams = new URLSearchParams({
    q,
    limit: String(limit)
  });

  const response = await fetch(`/api/companies/search?${searchParams}`, {
    signal
  });

  if (!response.ok) {
    throw new Error('Search failed');
  }

  return response.json();
}

export function useSearch(params: SearchCompaniesParams) {
  const { q, limit = 50 } = params;

  return useQuery({
    queryKey: ['search', q, limit],
    queryFn: ({ signal }) => fetchSearchResults(q, limit, signal),
    enabled: q.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}
