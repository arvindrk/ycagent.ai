import { z } from 'zod';
import { companySchema } from './company.schema';

export const companyDeepResearchPayloadSchema = companySchema;

export const triggerDeepResearchRequestSchema = z.object({
  company: companyDeepResearchPayloadSchema,
  forceRefresh: z.boolean().optional().default(false),
});

export const deepResearchStepResultSchema = z.object({
  step: z.number(),
  name: z.string(),
  status: z.enum(['completed', 'failed', 'skipped']),
  data: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
  durationMs: z.number(),
});

export const deepResearchOutputSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  steps: z.array(deepResearchStepResultSchema),
  summary: z.string(),
  totalDurationMs: z.number(),
  completedAt: z.string(),
  cached: z.boolean(),
});

export type CompanyDeepResearchPayload = z.infer<typeof companyDeepResearchPayloadSchema>;
export type TriggerDeepResearchRequest = z.infer<typeof triggerDeepResearchRequestSchema>;
export type DeepResearchStepResult = z.infer<typeof deepResearchStepResultSchema>;
export type DeepResearchOutput = z.infer<typeof deepResearchOutputSchema>;
