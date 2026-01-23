import { z } from 'zod';

export const companySchema = z.object({
  id: z.string().uuid(),
  source: z.string(),
  source_id: z.string(),
  source_url: z.string().nullable(),
  name: z.string(),
  slug: z.string().nullable(),
  website: z.string().nullable(),
  logo_url: z.string().nullable(),
  one_liner: z.string().nullable(),
  long_description: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  regions: z.array(z.string()).default([]),
  batch: z.string().nullable(),
  team_size: z.number().nullable(),
  founded_at: z.string().nullable(),
  stage: z.string().nullable(),
  status: z.string().default('Active'),
  is_hiring: z.boolean().default(false),
  is_nonprofit: z.boolean().default(false),
  all_locations: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  last_synced_at: z.string(),
});

export const companyListItemSchema = companySchema.pick({
  id: true,
  name: true,
  slug: true,
  website: true,
  logo_url: true,
  one_liner: true,
  tags: true,
  batch: true,
  is_hiring: true,
  all_locations: true,
});

export const getCompaniesInputSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(24),
});

export const paginatedResponseSchema = z.object({
  data: z.array(companyListItemSchema),
  nextCursor: z.string().uuid().nullable(),
  hasMore: z.boolean(),
  total: z.number().int(),
});
