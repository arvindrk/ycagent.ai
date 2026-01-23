import { cache } from 'react';
import { getDBClient } from '../client';
import { companyListItemSchema } from '@/lib/validations/company.schema';
import type { CompanyListItem } from '@/types/company';

interface FetchCompaniesParams {
  cursor?: string;
  limit: number;
}

interface FetchCompaniesResult {
  companies: CompanyListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const fetchCompaniesFromDB = cache(
  async (params: FetchCompaniesParams): Promise<FetchCompaniesResult> => {
    const sql = getDBClient();
    const { cursor, limit } = params;

    const rows = cursor
      ? await sql`
          SELECT 
            id, name, slug, website, logo_url, one_liner, 
            tags, batch, is_hiring, all_locations
          FROM companies
          WHERE id < ${cursor}
          ORDER BY batch DESC, id DESC
          LIMIT ${limit + 1}
        `
      : await sql`
          SELECT 
            id, name, slug, website, logo_url, one_liner, 
            tags, batch, is_hiring, all_locations
          FROM companies
          ORDER BY batch DESC, id DESC
          LIMIT ${limit + 1}
        `;

    const hasMore = rows.length > limit;
    const companies = (hasMore ? rows.slice(0, limit) : rows).map((row) =>
      companyListItemSchema.parse(row)
    );

    const nextCursor = hasMore && companies.length > 0
      ? companies[companies.length - 1].id
      : null;

    return {
      companies,
      nextCursor,
      hasMore,
    };
  }
);

export const getTotalCompaniesCount = cache(async (): Promise<number> => {
  const sql = getDBClient();
  const result = await sql`SELECT COUNT(*)::int as count FROM companies`;
  return result[0]?.count || 0;
});
