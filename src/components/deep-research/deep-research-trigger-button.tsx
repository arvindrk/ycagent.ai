"use client";

import { Button } from "@/components/ui/button";
import { useTriggerDeepResearch } from "@/hooks/use-trigger-deep-research";
import type { Company } from "@/types/company";

interface DeepResearchTriggerButtonProps {
  company: Company;
  onDeepResearchStarted: (runId: string, accessToken: string) => void;
  disabled?: boolean;
}

export function DeepResearchTriggerButton({
  company,
  onDeepResearchStarted,
  disabled,
}: DeepResearchTriggerButtonProps) {
  const { mutate, isPending, error } = useTriggerDeepResearch({
    onSuccess: ({ runId, accessToken }) => {
      onDeepResearchStarted(runId, accessToken);
    },
  });

  const handleTriggerDeepResearch = () => {
    mutate({ company, forceRefresh: true });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleTriggerDeepResearch}
        disabled={isPending || disabled}
        className="w-full"
      >
        {isPending ? "Starting Deep Research..." : "Start Deep Research"}
      </Button>
      {error && (
        <p className="text-sm text-red-500">
          {error instanceof Error ? error.message : "Failed to trigger deep research"}
        </p>
      )}
    </div>
  );
}
