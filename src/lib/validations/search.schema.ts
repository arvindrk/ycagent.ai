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
  limit: z.coerce.number().int().min(1).max(50).default(50),
});

export type SearchInput = z.infer<typeof searchInputSchema>;

export const searchResponseSchema = z.object({
  data: z.array(z.any()),
  total: z.number(),
  limit: z.number(),
  query_time_ms: z.number(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;
