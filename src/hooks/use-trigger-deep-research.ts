import { useMutation } from "@tanstack/react-query";
import { triggerDeepResearch, DeepResearchApiError } from "@/lib/api/deep-research/deep-research";
import type { Company } from "@/types/company";

export interface UseTriggerDeepResearchOptions {
  onSuccess?: (data: { runId: string; accessToken: string }) => void;
  onError?: (error: DeepResearchApiError) => void;
}

export function useTriggerDeepResearch(options?: UseTriggerDeepResearchOptions) {
  return useMutation({
    mutationFn: async ({
      company,
      forceRefresh = false,
    }: {
      company: Company;
      forceRefresh?: boolean;
    }) => {
      return await triggerDeepResearch(company, { forceRefresh });
    },
    onSuccess: (data) => {
      options?.onSuccess?.({
        runId: data.runId,
        accessToken: data.publicAccessToken,
      });
    },
    onError: (error) => {
      console.error("Deep research trigger error:", error);
      options?.onError?.(error as DeepResearchApiError);
    },
    retry: false,
  });
}
