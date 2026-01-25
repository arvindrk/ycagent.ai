import type { SearchInput } from '@/lib/validations/search.schema';

export interface ParsedFilters {
  batch?: string;
  stage?: string;
  status?: string;
  tags?: string[];
  industries?: string[];
  regions?: string[];
  team_size_min?: number;
  team_size_max?: number;
  is_hiring?: boolean;
  is_nonprofit?: boolean;
  location?: string;
}

function parseArrayFilter(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseBooleanFilter(value: 'true' | 'false' | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export function parseSearchFilters(params: SearchInput): ParsedFilters {
  return {
    batch: params.batch,
    stage: params.stage,
    status: params.status,
    tags: parseArrayFilter(params.tags),
    industries: parseArrayFilter(params.industries),
    regions: parseArrayFilter(params.regions),
    team_size_min: params.team_size_min,
    team_size_max: params.team_size_max,
    is_hiring: parseBooleanFilter(params.is_hiring),
    is_nonprofit: parseBooleanFilter(params.is_nonprofit),
    location: params.location,
  };
}
