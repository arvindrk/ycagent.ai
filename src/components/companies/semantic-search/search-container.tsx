'use client';

import type { ReactNode } from 'react';
import { SearchInput } from './search-input';
import { SearchStats } from './search-stats';
import { SearchEmpty } from './search-empty';
import { SearchResults } from './search-results';
import { CompanyListSkeleton } from '@/components/companies/list/company-list-skeleton';
import { useSearch } from '@/hooks/use-search';
import { useSearchQueryState } from '@/hooks/use-search-query-state';

interface SearchContainerProps {
  /** Browse listing, shown whenever there is no committed query. */
  children: ReactNode;
  /** Query parsed from the URL on the server, so a shared link renders it. */
  initialQuery?: string;
}

export function SearchContainer({ children, initialQuery }: SearchContainerProps) {
  const { input, committed, setInput, clear } = useSearchQueryState(initialQuery);
  const { data, isPending, isFetching, error, refetch } = useSearch({ q: committed });

  const isSearching = committed.length > 0;
  // isPending is only true with no data at all; a refetch keeps the previous
  // results on screen, so the skeleton is reserved for the first search.
  const showSkeleton = isSearching && isPending;

  return (
    <div className="space-y-6">
      <SearchInput value={input} onChange={setInput} isLoading={isSearching && isFetching} />

      {!isSearching && <div className="mt-8">{children}</div>}

      {isSearching && (
        <div className="space-y-6">
          <SearchStats
            total={data?.total}
            queryTime={data?.query_time_ms}
            query={committed}
            isLoading={showSkeleton}
            searchPath={data?.search_path}
          />

          {showSkeleton && <CompanyListSkeleton count={8} />}

          {!showSkeleton && error && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-text-secondary">Search is unavailable right now.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-md border border-border-primary px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:border-border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Try again
              </button>
            </div>
          )}

          {!showSkeleton && !error && data?.total === 0 && (
            <SearchEmpty query={committed} onClear={clear} />
          )}

          {!showSkeleton && !error && data && data.total > 0 && (
            <SearchResults key={committed} results={data.data} query={committed} />
          )}
        </div>
      )}
    </div>
  );
}
