"use client";

import type { Company } from "@/types/company";

interface DeepResearchContainerProps {
  company: Company;
}

export function DeepResearchContainer({ company }: DeepResearchContainerProps) {

  return (
    <div className="space-y-6">
      Deep Research Container
    </div>
  );
}
