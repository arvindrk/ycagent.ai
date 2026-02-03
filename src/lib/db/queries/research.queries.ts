import { getDBClient } from '../client';
import type {
  DiscoveryConfig,
  DiscoverySeedData,
  SearchPlatform,
  RunStatus,
  QueryStatus,
} from '@/lib/validations/research.schema';

interface CreateResearchRunParams {
  companyId: string;
  domain?: string;
  config: DiscoveryConfig;
  seedData: DiscoverySeedData;
  triggerRunId?: string;
  triggerIdempotencyKey?: string;
  status?: RunStatus;
  startedAt?: Date;
}

interface CreateResearchRunResult {
  id: string;
  companyId: string;
  status: RunStatus;
  createdAt: Date;
}

export async function createResearchRun(
  params: CreateResearchRunParams
): Promise<CreateResearchRunResult> {
  const sql = getDBClient();
  const {
    companyId,
    domain,
    config,
    seedData,
    triggerRunId,
    triggerIdempotencyKey,
    status = 'pending',
    startedAt,
  } = params;

  const rows = await sql`
    INSERT INTO research_runs (
      company_id,
      domain,
      config,
      seed_data,
      trigger_run_id,
      trigger_idempotency_key,
      status,
      started_at,
      current_depth,
      queries_executed,
      sources_discovered
    ) VALUES (
      ${companyId},
      ${domain || null},
      ${JSON.stringify(config)},
      ${JSON.stringify(seedData)},
      ${triggerRunId || null},
      ${triggerIdempotencyKey || null},
      ${status},
      ${startedAt || null},
      0,
      0,
      0
    )
    RETURNING id, company_id, status, created_at
  `;

  return {
    id: rows[0].id,
    companyId: rows[0].company_id,
    status: rows[0].status,
    createdAt: new Date(rows[0].created_at),
  };
}

interface UpdateResearchRunStatusParams {
  runId: string;
  status: RunStatus;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export async function updateResearchRunStatus(
  params: UpdateResearchRunStatusParams
): Promise<void> {
  const sql = getDBClient();
  const { runId, status, startedAt, completedAt, errorMessage } = params;

  await sql`
    UPDATE research_runs
    SET 
      status = ${status},
      started_at = ${startedAt || null},
      completed_at = ${completedAt || null},
      error_message = ${errorMessage || null}
    WHERE id = ${runId}
  `;
}

interface IncrementQueryCounterParams {
  runId: string;
  increment?: number;
}

export async function incrementQueryCounter(
  params: IncrementQueryCounterParams
): Promise<void> {
  const sql = getDBClient();
  const { runId, increment = 1 } = params;

  await sql`
    UPDATE research_runs
    SET queries_executed = queries_executed + ${increment}
    WHERE id = ${runId}
  `;
}

interface CreateSearchQueryParams {
  runId: string;
  domain?: string;
  queryText: string;
  platform: SearchPlatform;
  depth: number;
  parentId?: string;
}

interface CreateSearchQueryResult {
  id: string;
  runId: string;
  queryText: string;
  platform: SearchPlatform;
  depth: number;
  status: QueryStatus;
  createdAt: Date;
}

export async function createSearchQuery(
  params: CreateSearchQueryParams
): Promise<CreateSearchQueryResult> {
  const sql = getDBClient();
  const { runId, domain, queryText, platform, depth, parentId } = params;

  const rows = await sql`
    INSERT INTO search_queries (
      run_id,
      domain,
      query_text,
      platform,
      depth,
      parent_id,
      status,
      execution_attempt,
      results_count
    ) VALUES (
      ${runId},
      ${domain || null},
      ${queryText},
      ${platform},
      ${depth},
      ${parentId || null},
      'pending',
      0,
      0
    )
    RETURNING id, run_id, query_text, platform, depth, status, created_at
  `;

  return {
    id: rows[0].id,
    runId: rows[0].run_id,
    queryText: rows[0].query_text,
    platform: rows[0].platform,
    depth: rows[0].depth,
    status: rows[0].status,
    createdAt: new Date(rows[0].created_at),
  };
}

interface UpdateQueryStatusParams {
  queryId: string;
  status: QueryStatus;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  resultsCount?: number;
  resultsJson?: unknown[];
  errorMessage?: string;
}

export async function updateQueryStatus(
  params: UpdateQueryStatusParams
): Promise<void> {
  const sql = getDBClient();
  const {
    queryId,
    status,
    startedAt,
    completedAt,
    durationMs,
    resultsCount,
    resultsJson,
    errorMessage,
  } = params;

  await sql`
    UPDATE search_queries
    SET 
      status = ${status},
      started_at = ${startedAt || null},
      completed_at = ${completedAt || null},
      duration_ms = ${durationMs || null},
      results_count = ${resultsCount || null},
      results_json = ${resultsJson ? JSON.stringify(resultsJson) : null},
      error_message = ${errorMessage || null},
      execution_attempt = execution_attempt + 1
    WHERE id = ${queryId}
  `;
}

interface GetResearchRunParams {
  runId: string;
}

interface GetResearchRunResult {
  id: string;
  companyId: string;
  config: DiscoveryConfig;
  seedData: DiscoverySeedData;
  status: RunStatus;
  currentDepth: number;
  queriesExecuted: number;
  sourcesDiscovered: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export async function getResearchRun(
  params: GetResearchRunParams
): Promise<GetResearchRunResult | null> {
  const sql = getDBClient();
  const { runId } = params;

  const rows = await sql`
    SELECT 
      id,
      company_id,
      config,
      seed_data,
      status,
      current_depth,
      queries_executed,
      sources_discovered,
      created_at,
      started_at,
      completed_at,
      error_message
    FROM research_runs
    WHERE id = ${runId}
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    companyId: row.company_id,
    config: row.config as DiscoveryConfig,
    seedData: row.seed_data as DiscoverySeedData,
    status: row.status,
    currentDepth: row.current_depth,
    queriesExecuted: row.queries_executed,
    sourcesDiscovered: row.sources_discovered,
    createdAt: new Date(row.created_at),
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    errorMessage: row.error_message || undefined,
  };
}

interface GetPendingQueriesParams {
  runId: string;
  depth: number;
}

interface PendingQuery {
  id: string;
  queryText: string;
  platform: SearchPlatform;
  depth: number;
}

export async function getPendingQueries(
  params: GetPendingQueriesParams
): Promise<PendingQuery[]> {
  const sql = getDBClient();
  const { runId, depth } = params;

  const rows = await sql`
    SELECT id, query_text, platform, depth
    FROM search_queries
    WHERE run_id = ${runId}
      AND depth = ${depth}
      AND status = 'pending'
    ORDER BY created_at
  `;

  return rows.map((row) => ({
    id: row.id,
    queryText: row.query_text,
    platform: row.platform,
    depth: row.depth,
  }));
}

interface GetQueryResultsParams {
  queryId: string;
}

export async function getQueryResults(
  params: GetQueryResultsParams
): Promise<unknown[]> {
  const sql = getDBClient();
  const { queryId } = params;

  const rows = await sql`
    SELECT results_json
    FROM search_queries
    WHERE id = ${queryId}
    LIMIT 1
  `;

  if (rows.length === 0 || !rows[0].results_json) {
    return [];
  }

  return rows[0].results_json as unknown[];
}

interface CompleteDiscoveryParams {
  runId: string;
  queryId: string;
  queryStartedAt: Date;
  queryDurationMs: number;
  resultsCount: number;
  resultsJson: unknown[];
}

export async function completeDiscovery(
  params: CompleteDiscoveryParams
): Promise<void> {
  const sql = getDBClient();
  const {
    runId,
    queryId,
    queryStartedAt,
    queryDurationMs,
    resultsCount,
    resultsJson,
  } = params;

  await Promise.all([
    sql`
      UPDATE search_queries
      SET 
        status = 'completed',
        started_at = ${queryStartedAt},
        completed_at = NOW(),
        duration_ms = ${queryDurationMs},
        results_count = ${resultsCount},
        results_json = ${JSON.stringify(resultsJson)},
        execution_attempt = execution_attempt + 1
      WHERE id = ${queryId}
    `,
    sql`
      UPDATE research_runs
      SET 
        queries_executed = queries_executed + 1,
        status = 'completed',
        completed_at = NOW()
      WHERE id = ${runId}
    `,
  ]);
}
