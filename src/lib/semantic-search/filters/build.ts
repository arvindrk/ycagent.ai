import type { ParsedFilters } from './parse';

export function buildFilterSQL(
  filters: ParsedFilters,
  paramOffset = 0
): {
  sql: string;
  values: (string | number | boolean | string[])[];
} {
  const conditions: string[] = [];
  const values: (string | number | boolean | string[])[] = [];

  if (filters.batch) {
    values.push(filters.batch);
    conditions.push(`batch = $${paramOffset + values.length}`);
  }

  if (filters.stage) {
    values.push(filters.stage);
    conditions.push(`stage = $${paramOffset + values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${paramOffset + values.length}`);
  }

  if (filters.tags && filters.tags.length > 0) {
    values.push(filters.tags);
    conditions.push(`tags ?| $${paramOffset + values.length}`);
  }

  if (filters.industries && filters.industries.length > 0) {
    values.push(filters.industries);
    conditions.push(`industries ?| $${paramOffset + values.length}`);
  }

  if (filters.regions && filters.regions.length > 0) {
    values.push(filters.regions);
    conditions.push(`regions ?| $${paramOffset + values.length}`);
  }

  if (filters.team_size_min !== undefined) {
    values.push(filters.team_size_min);
    conditions.push(`team_size >= $${paramOffset + values.length}`);
  }

  if (filters.team_size_max !== undefined) {
    values.push(filters.team_size_max);
    conditions.push(`team_size <= $${paramOffset + values.length}`);
  }

  if (filters.is_hiring !== undefined) {
    values.push(filters.is_hiring);
    conditions.push(`is_hiring = $${paramOffset + values.length}`);
  }

  if (filters.is_nonprofit !== undefined) {
    values.push(filters.is_nonprofit);
    conditions.push(`is_nonprofit = $${paramOffset + values.length}`);
  }

  if (filters.location) {
    values.push(`%${filters.location}%`);
    conditions.push(`all_locations ILIKE $${paramOffset + values.length}`);
  }

  if (filters.founded_year_min !== undefined) {
    values.push(filters.founded_year_min);
    conditions.push(`EXTRACT(YEAR FROM founded_at) >= $${paramOffset + values.length}`);
  }

  if (filters.founded_year_max !== undefined) {
    values.push(filters.founded_year_max);
    conditions.push(`EXTRACT(YEAR FROM founded_at) <= $${paramOffset + values.length}`);
  }

  const whereSQL =
    conditions.length > 0
      ? `${conditions.join(' AND ')} AND embedding IS NOT NULL`
      : 'embedding IS NOT NULL';

  return { sql: whereSQL, values };
}
