import { getDBClient } from '../db/client';
import { SEARCH_SCORING, HNSW_CONFIG } from './scoring/weights';
import { buildFilterSQL } from './filters/build';
import type { ParsedFilters } from './filters/parse';

export interface SearchParams {
  query: string;
  filters: ParsedFilters;
  limit: number;
  offset: number;
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
}

export async function searchCompanies(
  params: SearchParams,
  embedding: number[]
): Promise<SearchResult[]> {
  const { query, filters, limit, offset } = params;
  const sql = getDBClient();

  const embeddingJSON = JSON.stringify(embedding);

  await sql.query(`SET hnsw.ef_search = ${HNSW_CONFIG.EF_SEARCH}`);

  const filterConditions = buildFilterSQL(filters, 2);
  const values: (string | number | boolean | string[])[] = [
    embeddingJSON,
    query,
    ...filterConditions.values,
    limit,
    offset,
  ];

  const queryText = `
    SELECT 
      id, name, slug, website, logo_url, one_liner,
      tags, industries, regions, batch, team_size,
      all_locations, is_hiring, stage,
      (1 - (embedding <=> $1::vector)) AS semantic_score,
      similarity(name, $2) AS name_score,
      ts_rank_cd(search_vector, plainto_tsquery('english', $2)) AS text_score,
      (
        (1 - (embedding <=> $1::vector)) * ${SEARCH_SCORING.SEMANTIC_WEIGHT} + 
        similarity(name, $2) * ${SEARCH_SCORING.NAME_WEIGHT} +
        ts_rank_cd(search_vector, plainto_tsquery('english', $2)) * ${SEARCH_SCORING.FULLTEXT_WEIGHT}
      ) AS final_score
    FROM companies
    WHERE ${filterConditions.sql}
    ORDER BY final_score DESC
    LIMIT $${values.length - 1}
    OFFSET $${values.length}
  `;

  const results = await sql.query(queryText, values);
  return results as SearchResult[];
}

export async function getSearchCount(
  filters: ParsedFilters,
  embedding: number[]
): Promise<number> {
  const sql = getDBClient();

  const embeddingJSON = JSON.stringify(embedding);

  const filterConditions = buildFilterSQL(filters, 1);
  const values: (string | number | boolean | string[])[] = [
    embeddingJSON,
    ...filterConditions.values,
  ];

  const queryText = `
    SELECT COUNT(*)::int as count
    FROM companies
    WHERE ${filterConditions.sql}
      AND (1 - (embedding <=> $1::vector)) >= ${SEARCH_SCORING.MIN_SEMANTIC_SCORE}
  `;

  const result = await sql.query(queryText, values);
  return result[0].count;
}
