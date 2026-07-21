import { getDBClient } from '../db/client';
import { TIER_META, type TierKey } from './scoring/weights';
import {
  EXACT_NAME_SIM_MIN,
  EXACT_PREFIX_MIN_LEN,
  MULT_EXACT,
  MULT_HIGH,
  MULT_KEYWORD,
  MULT_RELEVANT,
  MULT_STRONG,
  PREFILTER_NAME_MIN,
  PREFILTER_SEMANTIC_MIN,
  TIER_HIGH_SEM,
  TIER_RELEVANT_SEM,
  TIER_STRONG_SEM,
  W_NAME,
  W_SEMANTIC,
  W_TEXT,
} from './scoring/score-constants';
import { buildFilterSQL } from './filters/build';
import type { ParsedFilters } from './filters/parse';
import { HNSW_CONFIG } from '@/constants/embedding.constants';

export interface SearchParams {
  query: string;
  filters: ParsedFilters;
  limit?: number;
  skipVectorSearch?: boolean;
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
  embedding: number[] | null
): Promise<SearchResult[]> {
  const { query, filters, limit = 50, skipVectorSearch = false } = params;
  const sql = getDBClient();

  const useVector = !skipVectorSearch && embedding !== null && embedding.length > 0;

  if (useVector) {
    await sql.query(`SET hnsw.ef_search = ${HNSW_CONFIG.EF_SEARCH}`);
  }

  const filterConditions = buildFilterSQL(filters, useVector ? 2 : 0);

  if (useVector) {
    const embeddingJSON = JSON.stringify(embedding);
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
            similarity(name, $2) >= ${EXACT_NAME_SIM_MIN}
            OR (LOWER(name) LIKE LOWER($2) || '%' AND LENGTH($2) >= ${EXACT_PREFIX_MIN_LEN})
          ) THEN 'exact_match'
          WHEN (1 - (embedding <=> $1::vector)) >= ${TIER_HIGH_SEM} THEN 'high_confidence'
          WHEN (1 - (embedding <=> $1::vector)) >= ${TIER_STRONG_SEM} THEN 'strong_match'
          WHEN (1 - (embedding <=> $1::vector)) >= ${TIER_RELEVANT_SEM} THEN 'relevant'
          ELSE 'keyword_match'
        END AS tier,
        (
          (1 - (embedding <=> $1::vector)) * ${W_SEMANTIC} + 
          similarity(name, $2) * ${W_NAME} +
          ts_rank_cd(search_vector, plainto_tsquery('english', $2)) * ${W_TEXT}
        ) * 
        CASE
          WHEN (
            similarity(name, $2) >= ${EXACT_NAME_SIM_MIN}
            OR (LOWER(name) LIKE LOWER($2) || '%' AND LENGTH($2) >= ${EXACT_PREFIX_MIN_LEN})
          ) THEN ${MULT_EXACT}
          WHEN (1 - (embedding <=> $1::vector)) >= ${TIER_HIGH_SEM} THEN ${MULT_HIGH}
          WHEN (1 - (embedding <=> $1::vector)) >= ${TIER_STRONG_SEM} THEN ${MULT_STRONG}
          WHEN (1 - (embedding <=> $1::vector)) >= ${TIER_RELEVANT_SEM} THEN ${MULT_RELEVANT}
          ELSE ${MULT_KEYWORD}
        END AS final_score
      FROM companies
      WHERE ${filterConditions.sql}
        AND (
          (1 - (embedding <=> $1::vector)) >= ${PREFILTER_SEMANTIC_MIN}
          OR similarity(name, $2) >= ${PREFILTER_NAME_MIN}
        )
      ORDER BY final_score DESC, team_size DESC NULLS LAST
      LIMIT ${limit}
    `;

    const results = await sql.query(queryText, values);
    return results.map(row => ({
      ...row,
      tier_label: TIER_META[row.tier as TierKey].label,
      tier_order: TIER_META[row.tier as TierKey].order,
    })) as SearchResult[];
  }

  const values: (string | number | boolean | string[])[] = [...filterConditions.values];
  const queryText = `
    SELECT 
      id, name, slug, website, logo_url, one_liner,
      tags, industries, regions, batch, team_size,
      all_locations, is_hiring, stage,
      0 AS semantic_score,
      0 AS name_score,
      0 AS text_score,
      'keyword_match' AS tier,
      0 AS final_score
    FROM companies
    WHERE ${filterConditions.sql}
    ORDER BY team_size DESC NULLS LAST
    LIMIT ${limit}
  `;

  const results = await sql.query(queryText, values);
  return results.map(row => ({
    ...row,
    tier_label: TIER_META['keyword_match'].label,
    tier_order: TIER_META['keyword_match'].order,
  })) as SearchResult[];
}

