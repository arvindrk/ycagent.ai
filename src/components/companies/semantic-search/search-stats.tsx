'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { SearchPath } from '@/lib/schemas/search.schema';

interface SearchStatsProps {
  total?: number;
  queryTime?: number;
  query: string;
  isLoading?: boolean;
  /** Explicit API meta only; do not infer from result scores or tiers. */
  searchPath?: SearchPath;
}

export function SearchStats({
  total,
  queryTime,
  query,
  isLoading = false,
  searchPath,
}: SearchStatsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-between h-5">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-3 w-12" />
      </div>
    );
  }

  if (total === undefined || total === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between h-5 gap-3">
      <p className="text-sm text-text-secondary min-w-0">
        Showing top{' '}
        <span className="font-medium text-text-primary">
          {total.toLocaleString()}
        </span>{' '}
        {total === 1 ? 'result' : 'results'} for{' '}
        <span className="font-medium text-text-primary">&quot;{query}&quot;</span>
      </p>
      <div className="flex items-center gap-2 shrink-0">
        {searchPath === 'vector' && (
          <Badge
            variant="info"
            className="text-xs"
            title="Semantic vector ranking is active for this query"
          >
            Semantic
          </Badge>
        )}
        {searchPath === 'keyword' && (
          <Badge
            variant="secondary"
            className="text-xs"
            title="Filter-only path: query tokens were consumed as structured filters"
          >
            Filter-only
          </Badge>
        )}
        <p className="text-xs text-text-tertiary">{queryTime}ms</p>
      </div>
    </div>
  );
}
