'use client';

import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchEmptyProps {
  query: string;
  onClear: () => void;
}

export function SearchEmpty({ query, onClear }: SearchEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center mb-4">
        <SearchX className="w-8 h-8 text-text-tertiary" />
      </div>

      <h3 className="text-lg font-medium text-text-primary mb-2">
        No companies found
      </h3>

      <p className="text-sm text-text-secondary mb-6 text-center max-w-sm">
        We couldn&apos;t find any companies matching{' '}
        <span className="font-medium">&quot;{query}&quot;</span>. Try different keywords
        or clear your search.
      </p>

      <Button variant="secondary" onClick={onClear}>
        Clear search
      </Button>
    </div>
  );
}
