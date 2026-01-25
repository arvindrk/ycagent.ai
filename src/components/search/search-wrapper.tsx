'use client';

import { useState, type ReactNode } from 'react';
import { SearchContainer } from './search-container';

interface SearchWrapperProps {
  children: ReactNode;
}

export function SearchWrapper({ children }: SearchWrapperProps) {
  const [isSearching, setIsSearching] = useState(false);

  return (
    <>
      <SearchContainer onSearchStateChange={setIsSearching} />

      {!isSearching && <div className="mt-8">{children}</div>}
    </>
  );
}
