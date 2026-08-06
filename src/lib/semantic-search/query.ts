import { getDBClient } from '../db/client';
import { DEFAULT_TIER, EXACT_MATCH_TIER, TIERS, type TierKey } from './scoring/tiers';
import {
  EXACT_NAME_SIM_MIN,
  EXACT_PREFIX_MIN_LEN,
  PREFILTER_LEX_NAME_MIN,
  PREFILTER_NAME_MIN,
  PREFILTER_SEMANTIC_MIN,
  TS_RANK_NORMALIZATION,
  W_LEX_NAME,
  W_LEX_TEXT,
  W_NAME,
  W_SEMANTIC,
  W_TEXT,
} from './scoring/score-constants';
import { buildFilterSQL } from './filters/build';
import type { ParsedFilters } from './filters/parse';
import { HNSW_CONFIG } from '@/constants/embedding.constants';

export interface SearchParams {
  query: string;
  /**
   * Semantic residue after structured filters were extracted, used for text
   * ranking. Falls back to `query` when the caller does not supply it.
   */
  textQuery?: string;
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
}

/** Which ranking strategy a request resolves to. */
export type SearchMode = 'vector' | 'lexical' | 'filter';

/**
 * Vector needs an embedding; lexical needs text to rank on; anything else is a
 * pure structured-filter lookup. A query with neither text nor filters matches
 * everything, so it resolves to `null` rather than dumping the table.
 */
export function resolveSearchMode(input: {
  hasEmbedding: boolean;
  hasText: boolean;
  hasFilters: boolean;
}): SearchMode | null {
  if (input.hasEmbedding) return 'vector';
  if (input.hasText) return 'lexical';
  return input.hasFilters ? 'filter' : null;
}

const SELECT_COLUMNS = `
  id, name, slug, website, logo_url, one_liner,
  tags, industries, regions, batch, team_size,
  all_locations, is_hiring, stage`;

/** Exact match is a near-identical name or a long-enough prefix of one. */
const exactMatchSQL = (p: string) => `(
  similarity(name, ${p}) >= ${EXACT_NAME_SIM_MIN}
  OR (LOWER(name) LIKE LOWER(${p}) || '%' AND LENGTH(${p}) >= ${EXACT_PREFIX_MIN_LEN})
)`;

const tierSQL = (p: string) =>
  `CASE WHEN ${exactMatchSQL(p)} THEN '${EXACT_MATCH_TIER}' ELSE '${DEFAULT_TIER}' END`;

const boostSQL = (p: string) =>
  `CASE WHEN ${exactMatchSQL(p)} THEN ${TIERS[EXACT_MATCH_TIER].boost} ELSE ${TIERS[DEFAULT_TIER].boost} END`;

const textScoreSQL = (p: string) =>
  `ts_rank_cd(search_vector, websearch_to_tsquery('english', ${p}), ${TS_RANK_NORMALIZATION})`;

function withTierMeta(rows: Record<string, unknown>[]): SearchResult[] {
  return rows.map(row => {
    const tier = row.tier as TierKey;
    return { ...row, tier_label: TIERS[tier].label };
  }) as SearchResult[];
}

export async function searchCompanies(
  params: SearchParams,
  embedding: number[] | null
): Promise<SearchResult[]> {
  const { query, filters, limit = 50, skipVectorSearch = false } = params;
  const sql = getDBClient();

  const textQuery = (params.textQuery ?? query).trim();
  const useVector = !skipVectorSearch && embedding !== null && embedding.length > 0;
  const mode = resolveSearchMode({
    hasEmbedding: useVector,
    hasText: textQuery.length > 0,
    hasFilters: Object.keys(filters).length > 0,
  });

  if (mode === null) {
    return [];
  }

  if (mode === 'vector') {
    await sql.query(`SET hnsw.ef_search = ${HNSW_CONFIG.EF_SEARCH}`);

    const filterConditions = buildFilterSQL(filters, 2);
    const values: (string | number | boolean | string[])[] = [
      JSON.stringify(embedding),
      textQuery,
      ...filterConditions.values,
      limit,
    ];
    const limitParam = `$${values.length}`;

    const semantic = `(1 - (embedding <=> $1::vector))`;
    const tier = tierSQL('$2');
    const multiplier = boostSQL('$2');

    const rows = await sql.query(
      `
      SELECT ${SELECT_COLUMNS},
        ${semantic} AS semantic_score,
        similarity(name, $2) AS name_score,
        ${textScoreSQL('$2')} AS text_score,
        ${tier} AS tier,
        (
          ${semantic} * ${W_SEMANTIC} +
          similarity(name, $2) * ${W_NAME} +
          ${textScoreSQL('$2')} * ${W_TEXT}
        ) * ${multiplier} AS final_score
      FROM companies
      WHERE ${filterConditions.sql}
        AND (
          ${semantic} >= ${PREFILTER_SEMANTIC_MIN}
          OR similarity(name, $2) >= ${PREFILTER_NAME_MIN}
        )
      ORDER BY final_score DESC, team_size DESC NULLS LAST
      LIMIT ${limitParam}
    `,
      values
    );

    return withTierMeta(rows);
  }

  if (mode === 'lexical') {
    const filterConditions = buildFilterSQL(filters, 1);
    const values: (string | number | boolean | string[])[] = [
      textQuery,
      ...filterConditions.values,
      limit,
    ];
    const limitParam = `$${values.length}`;

    const rows = await sql.query(
      `
      SELECT ${SELECT_COLUMNS},
        0 AS semantic_score,
        similarity(name, $1) AS name_score,
        ${textScoreSQL('$1')} AS text_score,
        ${tierSQL('$1')} AS tier,
        (
          ${textScoreSQL('$1')} * ${W_LEX_TEXT} +
          similarity(name, $1) * ${W_LEX_NAME}
        ) * ${boostSQL('$1')} AS final_score
      FROM companies
      WHERE ${filterConditions.sql}
        AND (
          search_vector @@ websearch_to_tsquery('english', $1)
          OR similarity(name, $1) >= ${PREFILTER_LEX_NAME_MIN}
        )
      ORDER BY final_score DESC, team_size DESC NULLS LAST
      LIMIT ${limitParam}
    `,
      values
    );

    return withTierMeta(rows);
  }

  const filterConditions = buildFilterSQL(filters, 0);
  const values: (string | number | boolean | string[])[] = [
    ...filterConditions.values,
    limit,
  ];

  const rows = await sql.query(
    `
    SELECT ${SELECT_COLUMNS},
      0 AS semantic_score,
      0 AS name_score,
      0 AS text_score,
      '${DEFAULT_TIER}' AS tier,
      0 AS final_score
    FROM companies
    WHERE ${filterConditions.sql}
    ORDER BY team_size DESC NULLS LAST
    LIMIT $${values.length}
  `,
    values
  );

  return withTierMeta(rows);
}
