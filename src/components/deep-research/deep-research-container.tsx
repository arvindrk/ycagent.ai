"use client";

import { useState } from "react";
import { DeepResearchTriggerButton } from "./deep-research-trigger-button";
import { DeepResearchProgress } from "./deep-research-progress";
import type { Company } from "@/types/company";

interface DeepResearchContainerProps {
  company: Company;
}

export function DeepResearchContainer({ company }: DeepResearchContainerProps) {
  const [activeDeepResearch, setActiveDeepResearch] = useState<{
    runId: string;
    accessToken: string;
  } | null>(null);

  const handleDeepResearchStarted = (runId: string, accessToken: string) => {
    setActiveDeepResearch({ runId, accessToken });
  };

  const handleDeepResearchComplete = () => {
    // Keep deep research results visible after completion
  };

  return (
    <div className="space-y-6">
      <DeepResearchTriggerButton
        company={company}
        onDeepResearchStarted={handleDeepResearchStarted}
        disabled={!!activeDeepResearch}
      />

      {activeDeepResearch && (
        <DeepResearchProgress
          runId={activeDeepResearch.runId}
          accessToken={activeDeepResearch.accessToken}
          onComplete={handleDeepResearchComplete}
        />
      )}
    </div>
  );
}
