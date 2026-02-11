"use client";

import { CompanyHero } from './company-hero';
import { CompanyAboutSection } from './company-about-section';
import { CompanyTaxonomySection } from './company-taxonomy-section';
import { ResearchViewer } from '../research/research-viewer';
import { useDeepResearch } from '@/hooks/use-deep-research';
import { Company } from '@/types/company';

interface CompanyDetailLayoutProps {
  company: Company;
}

export function CompanyDetailLayout({ company }: CompanyDetailLayoutProps) {
  const {
    isResearching,
    vncUrl,
    events,
    startResearch,
    stopResearch,
    researchContainerRef
  } = useDeepResearch(company);

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
