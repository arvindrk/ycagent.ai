import { getDBClient } from '../db/client';
import { generateEmbedding } from './embeddings/generate';
import { buildFilterClauses, buildWhereClause } from './filters/build';
import { SEARCH_SCORING, HNSW_CONFIG } from './scoring/weights';
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
  params: SearchParams
): Promise<SearchResult[]> {
  const { query, filters, limit, offset } = params;
  const sql = getDBClient();

  const embeddingPromise = generateEmbedding(query);
  const filterClauses = buildFilterClauses(sql, filters);
  const whereClause = buildWhereClause(sql, filterClauses);
  const queryEmbedding = await embeddingPromise;

  await sql`SET hnsw.ef_search = ${HNSW_CONFIG.EF_SEARCH}`;

  const results = await sql<SearchResult[]>`
    SELECT 
      id, name, slug, website, logo_url, one_liner,
      tags, industries, regions, batch, team_size,
      all_locations, is_hiring, stage,
      (1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector)) AS semantic_score,
      similarity(name, ${query}) AS name_score,
      ts_rank_cd(search_vector, plainto_tsquery('english', ${query})) AS text_score,
      (
        (1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector)) * ${SEARCH_SCORING.SEMANTIC_WEIGHT} + 
        similarity(name, ${query}) * ${SEARCH_SCORING.NAME_WEIGHT} +
        ts_rank_cd(search_vector, plainto_tsquery('english', ${query})) * ${SEARCH_SCORING.FULLTEXT_WEIGHT}
      ) AS final_score
      
    FROM companies
    ${whereClause}
    ORDER BY final_score DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return results;
}

export async function getSearchCount(
  query: string,
  filters: ParsedFilters
): Promise<number> {
  const sql = getDBClient();

  const embeddingPromise = generateEmbedding(query);
  const filterClauses = buildFilterClauses(sql, filters);
  const whereClause = buildWhereClause(sql, filterClauses);
  const queryEmbedding = await embeddingPromise;

  const result = await sql`
    SELECT COUNT(*)::int as count
    FROM companies
    ${whereClause}
    AND (1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector)) >= ${SEARCH_SCORING.MIN_SEMANTIC_SCORE}
  `;

  return result[0].count;
}
