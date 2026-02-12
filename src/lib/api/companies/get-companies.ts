'use server';

import { unstable_cache } from 'next/cache';
import { getCompaniesInputSchema } from '@/lib/schemas/company.schema';
import { fetchCompaniesFromDB, getTotalCompaniesCount } from '@/lib/db/queries/companies.queries';
import type { PaginatedResponse, CompanyListItem, GetCompaniesInput } from '@/types/company';
import { CACHE_CONFIG, getCacheKey } from './cache';

async function getCompaniesCore(
  input: GetCompaniesInput
): Promise<PaginatedResponse<CompanyListItem>> {
  const validated = getCompaniesInputSchema.parse(input);
  const { cursor, page, limit } = validated;

  const [{ companies, nextCursor, hasMore }, total] = await Promise.all([
    fetchCompaniesFromDB({ cursor, page, limit }),
    getTotalCompaniesCount(),
  ]);

  return {
    data: companies,
    nextCursor,
    hasMore,
    total,
  };
}

export async function getCompanies(
  input: GetCompaniesInput = {}
): Promise<PaginatedResponse<CompanyListItem>> {
  const validated = getCompaniesInputSchema.parse(input);

  const getCached = unstable_cache(
    async () => getCompaniesCore(validated),
    getCacheKey(validated.cursor ?? `page-${validated.page}`, validated.limit),
    {
      tags: CACHE_CONFIG.COMPANIES_LIST.tags,
      revalidate: CACHE_CONFIG.COMPANIES_LIST.revalidate,
    }
  );

  return getCached();
}
