'use client';

import { useEffect, useState } from 'react';
import { useDebouncedValue } from './use-debounced-value';

export const SEARCH_QUERY_PARAM = 'q';

const DEBOUNCE_MS = 300;

export interface SearchQueryState {
  /** What the user has typed, rendered in the input every keystroke. */
  input: string;
  /** The debounced query everything downstream reacts to. */
  committed: string;
  setInput: (value: string) => void;
  clear: () => void;
}

/**
 * Single owner of "what is being searched". Previously the raw input decided
 * whether to hide the browse grid while the debounced value decided what to
 * fetch, so one keystroke unmounted the grid ~300ms before anything replaced
 * it and the page rendered empty.
 *
 * The initial query comes from the server, which already parsed searchParams.
 * Reading it on the client instead would either break hydration or, via
 * useSearchParams, force a client-render bailout whose fallback leaves the
 * input mounted but inert so early keystrokes are silently dropped.
 */
export function useSearchQueryState(initialQuery = ''): SearchQueryState {
  const [input, setInput] = useState(initialQuery);
  const committed = useDebouncedValue(input, DEBOUNCE_MS).trim();

  // The address bar is an external system. replaceState keeps a search
  // linkable and reloadable without a server round-trip per keystroke, and
  // without one history entry per character.
  useEffect(() => {
    const url = new URL(window.location.href);
    if ((url.searchParams.get(SEARCH_QUERY_PARAM) ?? '') === committed) return;

    if (committed) url.searchParams.set(SEARCH_QUERY_PARAM, committed);
    else url.searchParams.delete(SEARCH_QUERY_PARAM);

    window.history.replaceState(null, '', url);
  }, [committed]);

  return { input, committed, setInput, clear: () => setInput('') };
}
