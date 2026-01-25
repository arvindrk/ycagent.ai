import type { NeonQueryFunction } from '@neondatabase/serverless';
import type { ParsedFilters } from './parse';

type SQLFragment = ReturnType<
  ReturnType<typeof import('@neondatabase/serverless').neon>['sql']
>;

export function buildFilterClauses(
  sql: NeonQueryFunction<false, false>,
  filters: ParsedFilters
): SQLFragment[] {
  const clauses: SQLFragment[] = [];

  if (filters.batch) {
    clauses.push(sql`batch = ${filters.batch}`);
  }

  if (filters.stage) {
    clauses.push(sql`stage = ${filters.stage}`);
  }

  if (filters.status) {
    clauses.push(sql`status = ${filters.status}`);
  }

  if (filters.tags && filters.tags.length > 0) {
    clauses.push(sql`tags ?| ${filters.tags}`);
  }

  if (filters.industries && filters.industries.length > 0) {
    clauses.push(sql`industries ?| ${filters.industries}`);
  }

  if (filters.regions && filters.regions.length > 0) {
    clauses.push(sql`regions ?| ${filters.regions}`);
  }

  if (filters.team_size_min !== undefined) {
    clauses.push(sql`team_size >= ${filters.team_size_min}`);
  }

  if (filters.team_size_max !== undefined) {
    clauses.push(sql`team_size <= ${filters.team_size_max}`);
  }

  if (filters.is_hiring !== undefined) {
    clauses.push(sql`is_hiring = ${filters.is_hiring}`);
  }

  if (filters.is_nonprofit !== undefined) {
    clauses.push(sql`is_nonprofit = ${filters.is_nonprofit}`);
  }

  if (filters.location) {
    clauses.push(sql`all_locations ILIKE ${'%' + filters.location + '%'}`);
  }

  return clauses;
}

export function buildWhereClause(
  sql: NeonQueryFunction<false, false>,
  clauses: SQLFragment[]
): SQLFragment {
  if (clauses.length === 0) {
    return sql`WHERE embedding IS NOT NULL`;
  }

  return sql`WHERE ${sql.join(clauses, sql` AND `)} AND embedding IS NOT NULL`;
}
