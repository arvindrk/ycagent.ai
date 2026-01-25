'use client';

import { useQuery } from '@tanstack/react-query';
import { searchCompanies } from '@/lib/api/search/search-companies';
import type { SearchCompaniesParams } from '@/lib/api/search/types';

export function useSearch(params: SearchCompaniesParams) {
  const { q, limit = 100, offset = 0 } = params;

  return useQuery({
    queryKey: ['search', q, limit, offset],
    queryFn: () => searchCompanies({ q, limit, offset }),
    enabled: q.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}
