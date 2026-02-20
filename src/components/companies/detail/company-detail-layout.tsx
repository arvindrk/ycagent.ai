"use client";

import { useState } from 'react';
import { CompanyHero } from './company-hero';
import { CompanyAboutSection } from './company-about-section';
import { CompanyTaxonomySection } from './company-taxonomy-section';
import { useDeepResearchTrigger } from '@/hooks/use-deep-research-trigger';
import { authClient } from '@/lib/auth-client';
import { SignInDialog } from '@/components/auth/sign-in-dialog';
import { Company } from '@/types/company.types';
import { ResearchViewer } from '../research/research-viewer';

interface CompanyDetailLayoutProps {
  company: Company;
  researchAccessToken: string | null;
}

export function CompanyDetailLayout({
  company,
  researchAccessToken,
}: CompanyDetailLayoutProps) {
  const { data: session } = authClient.useSession();
  const [signInOpen, setSignInOpen] = useState(false);
  const {
    isResearching,
    isLoading,
    vncUrl,
    events,
    startResearch,
    stopResearch,
    researchContainerRef
  } = useDeepResearchTrigger({ company, accessToken: researchAccessToken ?? "" });

  const handleStartResearch = () => {
    if (!session) {
      setSignInOpen(true);
      return;
    }
    startResearch();
  };

  return (
    <>
      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        companyName={company.name}
      />
      <article className="space-y-8">
        <CompanyHero
          company={company}
          onStartResearch={handleStartResearch}
          onStopResearch={stopResearch}
          isResearching={isLoading || isResearching}
        />
        <CompanyAboutSection company={company} />
        <CompanyTaxonomySection company={company} />
      </article>

      <div ref={researchContainerRef}>
        <ResearchViewer
          companyName={company.name}
          vncUrl={vncUrl}
          events={events}
          isResearching={isLoading || isResearching}
          onStopResearch={stopResearch}
        />
      </div>
    </>
  );
}
