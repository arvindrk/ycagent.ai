import { cache } from 'react';
import { getDBClient } from '../client';
import { companyListItemSchema, companySchema } from '@/lib/validations/company.schema';
import type { CompanyListItem, Company } from '@/types/company';

interface FetchCompaniesParams {
  cursor?: string;
  page?: number;
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
    const { cursor, page, limit } = params;

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
      : page
      ? await sql`
          SELECT 
            id, name, slug, website, logo_url, one_liner, 
            tags, batch, is_hiring, all_locations
          FROM companies
          ORDER BY batch DESC, id DESC
          LIMIT ${limit + 1}
          OFFSET ${(page - 1) * limit}
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

export const fetchCompanyById = cache(
  async (id: string): Promise<Company | null> => {
    const sql = getDBClient();
    
    const rows = await sql`
      SELECT * FROM companies WHERE id = ${id} LIMIT 1
    `;
    
    if (rows.length === 0) return null;
    
    return companySchema.parse(rows[0]);
  }
);
