import { z } from 'zod';

export const searchPlatformSchema = z.enum([
  'google',
  'github',
  'linkedin',
  'twitter',
  'perplexity',
  'llm',
]);

export type SearchPlatform = z.infer<typeof searchPlatformSchema>;

export const runStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export type RunStatus = z.infer<typeof runStatusSchema>;

export const queryStatusSchema = z.enum([
  'pending',
  'executing',
  'completed',
  'failed',
  'skipped',
]);

export type QueryStatus = z.infer<typeof queryStatusSchema>;

export const discoveryBudgetSchema = z.object({
  maxDepth: z.number().int().min(0).max(5).default(2),
  maxBreadth: z.number().int().min(1).max(10).default(3),
  maxQueries: z.number().int().min(1).max(200).default(50),
  maxSources: z.number().int().min(1).max(500).default(100),
  timeoutSeconds: z.number().int().min(60).max(1800).default(600),
});

export type DiscoveryBudget = z.infer<typeof discoveryBudgetSchema>;

export const discoveryConfigSchema = discoveryBudgetSchema.extend({
  platforms: z.array(searchPlatformSchema).min(1).default(['google']),
});

export type DiscoveryConfig = z.infer<typeof discoveryConfigSchema>;

export const discoverySeedDataSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional(),
  description: z.string().optional(),
  batch: z.string().optional(),
  tags: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
});

export type DiscoverySeedData = z.infer<typeof discoverySeedDataSchema>;

export const researchDomainSchema = z.enum([
  'vc_profile',
  'founder_profile',
  'product_info',
]);

export type ResearchDomain = z.infer<typeof researchDomainSchema>;

export const discoveryTaskPayloadSchema = z.object({
  runId: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  domain: researchDomainSchema.optional().default('product_info'),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  companyDescription: z.string().optional(),
  companyBatch: z.string().optional(),
  companyTags: z.array(z.string()).optional(),
  companyIndustries: z.array(z.string()).optional(),
  config: discoveryConfigSchema.partial().optional(),
});

export type DiscoveryTaskPayload = z.infer<typeof discoveryTaskPayloadSchema>;

export const discoveryStatsSchema = z.object({
  queriesExecuted: z.number().int().min(0),
  sourcesDiscovered: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  currentDepth: z.number().int().min(0),
  budgetExhausted: z.boolean(),
  budgetExhaustedReason: z.string().optional(),
});

export type DiscoveryStats = z.infer<typeof discoveryStatsSchema>;

export const discoveryTaskOutputSchema = z.object({
  runId: z.string().uuid(),
  companyId: z.string().uuid(),
  domain: researchDomainSchema,
  status: runStatusSchema,
  stats: discoveryStatsSchema,
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
      retryable: z.boolean().default(false),
    })
    .optional(),
  completedAt: z.string().datetime().optional(),
});

export type DiscoveryTaskOutput = z.infer<typeof discoveryTaskOutputSchema>;

export const searchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string().optional(),
  rank: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;

export const storedSearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string().optional(),
  rank: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type StoredSearchResult = z.infer<typeof storedSearchResultSchema>;

export const searchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  platform: searchPlatformSchema,
  maxResults: z.number().int().min(1).max(100).default(10),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

export const searchResponseSchema = z.object({
  query: z.string(),
  platform: searchPlatformSchema,
  results: z.array(searchResultSchema),
  totalResults: z.number().int().min(0),
  executionTimeMs: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;

export const researchRunSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  config: discoveryConfigSchema,
  seedData: discoverySeedDataSchema,
  triggerRunId: z.string().optional(),
  triggerIdempotencyKey: z.string().optional(),
  status: runStatusSchema,
  currentDepth: z.number().int().min(0).default(0),
  queriesExecuted: z.number().int().min(0).default(0),
  sourcesDiscovered: z.number().int().min(0).default(0),
  output: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.union([z.date(), z.string()]),
  startedAt: z.union([z.date(), z.string()]).optional(),
  completedAt: z.union([z.date(), z.string()]).optional(),
  errorMessage: z.string().optional(),
  retryCount: z.number().int().min(0).default(0),
});

export type ResearchRun = z.infer<typeof researchRunSchema>;

export const searchQueryRecordSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  depth: z.number().int().min(0),
  queryText: z.string(),
  platform: searchPlatformSchema,
  status: queryStatusSchema,
  executionAttempt: z.number().int().min(0).default(0),
  resultsCount: z.number().int().min(0).default(0),
  createdAt: z.union([z.date(), z.string()]),
  startedAt: z.union([z.date(), z.string()]).optional(),
  completedAt: z.union([z.date(), z.string()]).optional(),
  durationMs: z.number().int().min(0).optional(),
  errorMessage: z.string().optional(),
});

export type SearchQueryRecord = z.infer<typeof searchQueryRecordSchema>;

export const triggerDiscoveryRequestSchema = z.object({
  companyId: z.string().uuid(),
  forceRefresh: z.boolean().default(false),
  config: discoveryConfigSchema.partial().optional(),
});

export type TriggerDiscoveryRequest = z.infer<typeof triggerDiscoveryRequestSchema>;

export const triggerDiscoveryResponseSchema = z.object({
  cached: z.boolean(),
  runId: z.string().uuid(),
  triggerRunId: z.string().optional(),
  status: z.enum(['cached', 'triggered', 'running']),
  output: z.record(z.string(), z.unknown()).optional(),
});

export type TriggerDiscoveryResponse = z.infer<typeof triggerDiscoveryResponseSchema>;
