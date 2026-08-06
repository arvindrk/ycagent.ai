'use client';

import { useState } from 'react';
import { CompanyPreviewCard } from '@/components/companies/list/company-preview-card';
import { groupSearchResults } from '@/lib/semantic-search/group-search-results';
import type { SearchResult } from '@/types/semantic-search.types';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
}

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

export function SearchResults({ results, query }: SearchResultsProps) {
  const { topMatch, visible, hidden, total } = groupSearchResults(results);
  // Collapsed state resets per query because the caller keys this component on
  // the query, which is cheaper and less error-prone than syncing in an effect.
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-6">
      {topMatch && (
        <section aria-label="Top match" className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Top match
          </h2>
          <div className={GRID}>
            <CompanyPreviewCard company={topMatch} />
          </div>
        </section>
      )}

      <section aria-label="Search results" className="space-y-4">
        {topMatch && (
          <h2 className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Other results
          </h2>
        )}
        <div className={GRID}>
          {visible.map(company => (
            <CompanyPreviewCard key={company.id} company={company} />
          ))}
          {expanded &&
            hidden.map(company => <CompanyPreviewCard key={company.id} company={company} />)}
        </div>

        {hidden.length > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full rounded-md border border-border-primary py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-border-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Show {hidden.length} more {hidden.length === 1 ? 'result' : 'results'}
          </button>
        )}
      </section>

      <p className="sr-only" role="status">
        {total} {total === 1 ? 'result' : 'results'} for {query}
      </p>
    </div>
  );
}
