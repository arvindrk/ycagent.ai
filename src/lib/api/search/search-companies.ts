'use server';

import type { SearchCompaniesParams, SearchResponse } from './types';

export async function searchCompanies(
  params: SearchCompaniesParams
): Promise<SearchResponse> {
  const { q, limit = 100, offset = 0 } = params;

  if (!q || q.trim().length === 0) {
    return {
      data: [],
      total: 0,
      limit,
      offset,
      query_time_ms: 0,
    };
  }

  const searchParams = new URLSearchParams({
    q: q.trim(),
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const baseUrl =
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      : '';

  const url = `${baseUrl}/api/search?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}
