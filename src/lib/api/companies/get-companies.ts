'use server';

import { unstable_cache } from 'next/cache';
import { getCompaniesInputSchema } from '@/lib/schemas/company.schema';
import { fetchCompaniesFromDB, fetchCompanyById, getTotalCompaniesCount } from '@/lib/db/queries/companies.queries';
import type { PaginatedResponse, CompanyListItem, GetCompaniesInput, Company } from '@/types/company.types';
import { CACHE_CONFIG, getCacheKey } from './cache';
import { cache } from 'react';
import { notFound } from 'next/navigation';

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

  try {
    return await getCached();
  } catch {
    throw new Error('Unexpected Error. Please try again.');
  }
}

export const getCompany = cache(async (id: string): Promise<Company> => {
  try {
    const company = await fetchCompanyById(id);

    if (!company) {
      notFound();
    }

    return company;
  } catch (error) {
    console.log(error);
    throw new Error('Unexpected Error. Please try again.');
  }
});
