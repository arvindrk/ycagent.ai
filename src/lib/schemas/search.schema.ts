import { z } from 'zod';

export const searchInputSchema = z.object({
  q: z.string().min(1).max(500),
  batch: z.string().optional(),
  stage: z.string().optional(),
  status: z.string().optional(),
  tags: z.string().optional(),
  industries: z.string().optional(),
  regions: z.string().optional(),
  team_size_min: z.coerce.number().int().min(1).optional(),
  team_size_max: z.coerce.number().int().min(1).optional(),
  is_hiring: z.enum(['true', 'false']).optional(),
  is_nonprofit: z.enum(['true', 'false']).optional(),
  location: z.string().optional(),
  founded_year_min: z.coerce.number().int().min(1990).max(2100).optional(),
  founded_year_max: z.coerce.number().int().min(1990).max(2100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});

export type SearchInput = z.infer<typeof searchInputSchema>;

/**
 * Ranking actually used for the response. `lexical` means a vector search was
 * intended but the embedding provider was unavailable, so results were ranked
 * on full text instead.
 */
export const searchPathSchema = z.enum(['vector', 'lexical', 'keyword']);

export const searchResponseSchema = z.object({
  data: z.array(z.any()),
  total: z.number(),
  limit: z.number(),
  query_time_ms: z.number(),
  search_path: searchPathSchema.optional(),
  /** True when semantic ranking was intended but unavailable. */
  degraded: z.boolean().optional(),
});

export type SearchPath = z.infer<typeof searchPathSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
