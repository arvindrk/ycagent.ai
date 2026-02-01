import { z } from 'zod';

export const companyResearchPayloadSchema = z.object({
  companyId: z.string().uuid('Invalid company ID format'),
  companyName: z.string().min(1, 'Company name is required'),
  companyWebsite: z.string().url().optional(),
  companyDescription: z.string().optional(),
  companyBatch: z.string().optional(),
  companyTags: z.array(z.string()).optional(),
});

export const triggerResearchRequestSchema = z.object({
  company: companyResearchPayloadSchema,
  forceRefresh: z.boolean().optional().default(false),
});

export const researchStepResultSchema = z.object({
  step: z.number(),
  name: z.string(),
  status: z.enum(['completed', 'failed', 'skipped']),
  data: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
  durationMs: z.number(),
});

export const researchOutputSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  steps: z.array(researchStepResultSchema),
  summary: z.string(),
  totalDurationMs: z.number(),
  completedAt: z.string(),
  cached: z.boolean(),
});

export type CompanyResearchPayload = z.infer<typeof companyResearchPayloadSchema>;
export type TriggerResearchRequest = z.infer<typeof triggerResearchRequestSchema>;
export type ResearchStepResult = z.infer<typeof researchStepResultSchema>;
export type ResearchOutput = z.infer<typeof researchOutputSchema>;
