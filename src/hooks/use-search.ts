'use client';

import { useQuery } from '@tanstack/react-query';
import { searchCompanies } from '@/lib/api/semantic-search/search-companies';
import type { SearchCompaniesParams } from '@/types/semantic-search.types';

export function useSearch(params: SearchCompaniesParams) {
  const { q, limit = 50 } = params;

  return useQuery({
    queryKey: ['search', q, limit],
    queryFn: () => searchCompanies({ q, limit }),
    enabled: q.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}
