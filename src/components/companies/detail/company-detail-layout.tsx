"use client";

import { useState, useEffect, useRef } from 'react';
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
  autoStart?: boolean;
}

export function CompanyDetailLayout({
  company,
  researchAccessToken,
  autoStart = false,
}: CompanyDetailLayoutProps) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [signInOpen, setSignInOpen] = useState(false);
  const hasAutoStarted = useRef(false);
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

  useEffect(() => {
    if (!autoStart || sessionPending || hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    handleStartResearch();
  // handleStartResearch intentionally excluded — fires once after session resolves
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, sessionPending]);

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
