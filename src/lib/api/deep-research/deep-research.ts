import type { Company } from "@/types/company";
import type { TriggerDeepResearchRequest } from "@/lib/validations/deep-research.schema";

export interface TriggerDeepResearchResponse {
  success: boolean;
  runId: string;
  publicAccessToken: string;
  idempotencyKey: string;
  message: string;
}

export interface TriggerDeepResearchError {
  success: false;
  error: string;
  details?: string;
}

export class DeepResearchApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: string
  ) {
    super(message);
    this.name = "DeepResearchApiError";
  }
}

export async function triggerDeepResearch(
  company: Company,
  options: { forceRefresh?: boolean } = {}
): Promise<TriggerDeepResearchResponse> {
  const payload: TriggerDeepResearchRequest = {
    company: {
      companyId: company.id,
      companyName: company.name,
      companyWebsite: company.website ?? undefined,
      companyDescription: company.one_liner ?? undefined,
      companyBatch: company.batch ?? undefined,
      companyTags: company.tags ?? undefined,
    },
    forceRefresh: options.forceRefresh ?? false,
  };

  const response = await fetch("/api/deep-research/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new DeepResearchApiError(
      data.error || "Failed to trigger deep research",
      response.status,
      data.details
    );
  }

  return data;
}

export async function getDeepResearchStatus(runId: string) {
  const response = await fetch(`/api/deep-research/status?runId=${runId}`);

  if (!response.ok) {
    const data = await response.json();
    throw new DeepResearchApiError(
      data.error || "Failed to get deep research status",
      response.status
    );
  }

  return response.json();
}
