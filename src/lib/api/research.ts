import type { Company } from "@/types/company";
import type { TriggerResearchRequest } from "@/lib/validations/research.schema";

export interface TriggerResearchResponse {
  success: boolean;
  runId: string;
  publicAccessToken: string;
  idempotencyKey: string;
  message: string;
}

export interface TriggerResearchError {
  success: false;
  error: string;
  details?: string;
}

export class ResearchApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: string
  ) {
    super(message);
    this.name = "ResearchApiError";
  }
}

export async function triggerResearch(
  company: Company,
  options: { forceRefresh?: boolean } = {}
): Promise<TriggerResearchResponse> {
  const payload: TriggerResearchRequest = {
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

  const response = await fetch("/api/research/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ResearchApiError(
      data.error || "Failed to trigger research",
      response.status,
      data.details
    );
  }

  return data;
}

export async function getResearchStatus(runId: string) {
  const response = await fetch(`/api/research/status?runId=${runId}`);

  if (!response.ok) {
    const data = await response.json();
    throw new ResearchApiError(
      data.error || "Failed to get research status",
      response.status
    );
  }

  return response.json();
}
