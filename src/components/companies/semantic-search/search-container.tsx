'use client';

import { useState } from 'react';
import { SearchInput } from './search-input';
import { SearchStats } from './search-stats';
import { SearchEmpty } from './search-empty';
import { TieredResultsDisplay } from './tiered-results-display';
import { CompanyListSkeleton } from '@/components/companies/list/company-list-skeleton';
import { useSearch } from '@/hooks/use-search';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

interface SearchContainerProps {
  onSearchStateChange: (isSearching: boolean) => void;
}

export function SearchContainer({ onSearchStateChange }: SearchContainerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const { data, isLoading, error } = useSearch({
    q: debouncedQuery,
  });

  const hasQuery = searchQuery.trim().length > 0;
  const showLoading = searchQuery.length > 0 && isLoading;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchStateChange(value.trim().length > 0);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearchStateChange(false);
  };

  return (
    <div className="space-y-6">
      <SearchInput
        value={searchQuery}
        onChange={handleSearchChange}
        isLoading={showLoading}
      />

      {hasQuery && (
        <div className="space-y-6">
          <SearchStats
            total={data?.total}
            queryTime={data?.query_time_ms}
            query={searchQuery}
            isLoading={isLoading}
          />

          {isLoading && <CompanyListSkeleton />}

          {!isLoading && error && (
            <div className="text-center py-8 text-destructive">
              Error loading search results. Please try again.
            </div>
          )}

          {!isLoading && data && data.total === 0 && (
            <SearchEmpty query={searchQuery} onClear={handleClearSearch} />
          )}

          {!isLoading && data && data.total > 0 && (
            <TieredResultsDisplay results={data.data} />
          )}
        </div>
      )}
    </div>
  );
}
