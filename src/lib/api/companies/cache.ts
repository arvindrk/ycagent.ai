export const CACHE_CONFIG = {
  COMPANIES_LIST: {
    tags: ['companies'] as string[],
    revalidate: 300,
  },
} as const;

export function getCacheKey(cursor?: string, limit?: number): string[] {
  const key = ['companies-list'];
  if (cursor) key.push(`cursor-${cursor}`);
  if (limit) key.push(`limit-${limit}`);
  return key;
}
