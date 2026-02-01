import { useMutation } from "@tanstack/react-query";
import { triggerResearch, ResearchApiError } from "@/lib/api/research";
import type { Company } from "@/types/company";

export interface UseTriggerResearchOptions {
  onSuccess?: (data: { runId: string; accessToken: string }) => void;
  onError?: (error: ResearchApiError) => void;
}

export function useTriggerResearch(options?: UseTriggerResearchOptions) {
  return useMutation({
    mutationFn: async ({
      company,
      forceRefresh = false,
    }: {
      company: Company;
      forceRefresh?: boolean;
    }) => {
      return await triggerResearch(company, { forceRefresh });
    },
    onSuccess: (data) => {
      options?.onSuccess?.({
        runId: data.runId,
        accessToken: data.publicAccessToken,
      });
    },
    onError: (error) => {
      console.error("Research trigger error:", error);
      options?.onError?.(error as ResearchApiError);
    },
    retry: false,
  });
}
