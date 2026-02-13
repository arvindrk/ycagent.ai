import { getDBClient } from '../db/client';
import { TIER_META, type TierKey } from './scoring/weights';
import { buildFilterSQL } from './filters/build';
import type { ParsedFilters } from './filters/parse';
import { HNSW_CONFIG } from '@/constants/embedding.constants';

export interface SearchParams {
  query: string;
  filters: ParsedFilters;
  limit?: number;
}

export interface SearchResult {
  id: string;
  name: string;
  slug: string | null;
  website: string | null;
  logo_url: string | null;
  one_liner: string | null;
  tags: string[];
  industries: string[];
  regions: string[];
  batch: string | null;
  team_size: number | null;
  all_locations: string | null;
  is_hiring: boolean;
  stage: string | null;
  semantic_score: number;
  name_score: number;
  text_score: number;
  final_score: number;
  tier: TierKey;
  tier_label: string;
  tier_order: number;
}

export async function searchCompanies(
  params: SearchParams,
  embedding: number[]
): Promise<SearchResult[]> {
  const { query, filters, limit = 50 } = params;
  const sql = getDBClient();

  const embeddingJSON = JSON.stringify(embedding);

  await sql.query(`SET hnsw.ef_search = ${HNSW_CONFIG.EF_SEARCH}`);

  const filterConditions = buildFilterSQL(filters, 2);
  const values: (string | number | boolean | string[])[] = [
    embeddingJSON,
    query,
    ...filterConditions.values,
  ];

  const queryText = `
    SELECT 
      id, name, slug, website, logo_url, one_liner,
      tags, industries, regions, batch, team_size,
      all_locations, is_hiring, stage,
      (1 - (embedding <=> $1::vector)) AS semantic_score,
      similarity(name, $2) AS name_score,
      ts_rank_cd(search_vector, plainto_tsquery('english', $2)) AS text_score,
      CASE
        WHEN (
          similarity(name, $2) >= 0.9
          OR (LOWER(name) LIKE LOWER($2) || '%' AND LENGTH($2) >= 3)
        ) THEN 'exact_match'
        WHEN (1 - (embedding <=> $1::vector)) >= 0.7 THEN 'high_confidence'
        WHEN (1 - (embedding <=> $1::vector)) >= 0.5 THEN 'strong_match'
        WHEN (1 - (embedding <=> $1::vector)) >= 0.3 THEN 'relevant'
        ELSE 'keyword_match'
      END AS tier,
      (
        (1 - (embedding <=> $1::vector)) * 0.8 + 
        similarity(name, $2) * 0.15 +
        ts_rank_cd(search_vector, plainto_tsquery('english', $2)) * 0.05
      ) * 
      CASE
        WHEN (
          similarity(name, $2) >= 0.9
          OR (LOWER(name) LIKE LOWER($2) || '%' AND LENGTH($2) >= 3)
        ) THEN 2.5
        WHEN (1 - (embedding <=> $1::vector)) >= 0.7 THEN 1.5
        WHEN (1 - (embedding <=> $1::vector)) >= 0.5 THEN 1.0
        WHEN (1 - (embedding <=> $1::vector)) >= 0.3 THEN 0.8
        ELSE 0.5
      END AS final_score
    FROM companies
    WHERE ${filterConditions.sql}
      AND (
        (1 - (embedding <=> $1::vector)) >= 0.25
        OR similarity(name, $2) >= 0.7
      )
    ORDER BY final_score DESC
    LIMIT ${limit}
  `;

  const results = await sql.query(queryText, values);

  return results.map(row => ({
    ...row,
    tier_label: TIER_META[row.tier as TierKey].label,
    tier_order: TIER_META[row.tier as TierKey].order,
  })) as SearchResult[];
}

