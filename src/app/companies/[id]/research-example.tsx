"use client";

import { ResearchContainer } from "@/components/research/research-container";
import type { Company } from "@/types/company";

interface CompanyResearchExampleProps {
  company: Company;
}

export function CompanyResearchExample({ company }: CompanyResearchExampleProps) {
  return (
    <div className="mt-8 space-y-4">
      <div className="border-t border-bg-quaternary pt-6">
        <h2 className="text-xl-semibold text-text-primary mb-2">
          Deep Research
        </h2>
        <p className="text-sm-regular text-text-secondary mb-4">
          Run comprehensive research analysis on {company.name}. 
          This includes market analysis, competitor review, customer sentiment, and strategic insights.
        </p>
        
        <ResearchContainer company={company} />
      </div>
    </div>
  );
}
