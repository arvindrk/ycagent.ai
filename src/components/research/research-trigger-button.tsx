"use client";

import { Button } from "@/components/ui/button";
import { useTriggerResearch } from "@/hooks/use-trigger-research";
import type { Company } from "@/types/company";

interface ResearchTriggerButtonProps {
  company: Company;
  onResearchStarted: (runId: string, accessToken: string) => void;
  disabled?: boolean;
}

export function ResearchTriggerButton({
  company,
  onResearchStarted,
  disabled,
}: ResearchTriggerButtonProps) {
  const { mutate, isPending, error } = useTriggerResearch({
    onSuccess: ({ runId, accessToken }) => {
      onResearchStarted(runId, accessToken);
    },
  });

  const handleTriggerResearch = () => {
    mutate({ company, forceRefresh: false });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleTriggerResearch}
        disabled={isPending || disabled}
        className="w-full"
      >
        {isPending ? "Starting Research..." : "Start Deep Research"}
      </Button>
      {error && (
        <p className="text-sm text-red-500">
          {error instanceof Error ? error.message : "Failed to trigger research"}
        </p>
      )}
    </div>
  );
}
