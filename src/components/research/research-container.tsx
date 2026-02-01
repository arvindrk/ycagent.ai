"use client";

import { useState } from "react";
import { ResearchTriggerButton } from "./research-trigger-button";
import { ResearchProgress } from "./research-progress";
import type { Company } from "@/types/company";

interface ResearchContainerProps {
  company: Company;
}

export function ResearchContainer({ company }: ResearchContainerProps) {
  const [activeResearch, setActiveResearch] = useState<{
    runId: string;
    accessToken: string;
  } | null>(null);

  const handleResearchStarted = (runId: string, accessToken: string) => {
    setActiveResearch({ runId, accessToken });
  };

  const handleResearchComplete = () => {
    // Keep research results visible after completion
  };

  return (
    <div className="space-y-6">
      <ResearchTriggerButton
        company={company}
        onResearchStarted={handleResearchStarted}
        disabled={!!activeResearch}
      />

      {activeResearch && (
        <ResearchProgress
          runId={activeResearch.runId}
          accessToken={activeResearch.accessToken}
          onComplete={handleResearchComplete}
        />
      )}
    </div>
  );
}
