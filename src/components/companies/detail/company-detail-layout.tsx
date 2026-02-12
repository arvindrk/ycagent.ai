"use client";

import { CompanyHero } from './company-hero';
import { CompanyAboutSection } from './company-about-section';
import { CompanyTaxonomySection } from './company-taxonomy-section';
import { useDeepResearchTrigger } from '@/hooks/use-deep-research-trigger';
import { Company } from '@/types/company.types';
import { ResearchViewer } from '../research/research-viewer';

interface CompanyDetailLayoutProps {
  company: Company;
  researchAccessToken: string;
}

export function CompanyDetailLayout({
  company,
  researchAccessToken,
}: CompanyDetailLayoutProps) {
  const {
    isResearching,
    vncUrl,
    events,
    startResearch,
    stopResearch,
    researchContainerRef
  } = useDeepResearchTrigger({ company, accessToken: researchAccessToken });

  return (
    <>
      <article className="space-y-8">
        <CompanyHero
          company={company}
          onStartResearch={startResearch}
          onStopResearch={stopResearch}
          isResearching={isResearching}
        />
        <CompanyAboutSection company={company} />
        <CompanyTaxonomySection company={company} />
      </article>

      <div ref={researchContainerRef}>
        <ResearchViewer
          companyName={company.name}
          vncUrl={vncUrl}
          events={events}
          isResearching={isResearching}
          onStopResearch={stopResearch}
        />
      </div>
    </>
  );
}
