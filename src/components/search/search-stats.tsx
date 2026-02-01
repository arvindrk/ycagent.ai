'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface SearchStatsProps {
  total?: number;
  queryTime?: number;
  query: string;
  isLoading?: boolean;
}

export function SearchStats({
  total,
  queryTime,
  query,
  isLoading = false,
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
    <div className="flex items-center justify-between h-5">
      <p className="text-sm text-text-secondary">
        Showing top{' '}
        <span className="font-medium text-text-primary">
          {total.toLocaleString()}
        </span>{' '}
        {total === 1 ? 'result' : 'results'} for{' '}
        <span className="font-medium text-text-primary">&quot;{query}&quot;</span>
      </p>
      <p className="text-xs text-text-tertiary">{queryTime}ms</p>
    </div>
  );
}
