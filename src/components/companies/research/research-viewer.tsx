"use client";

import { useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { StreamChunk, ResearchResult } from '@/types/llm.types';
import { Laptop, Activity, Square } from 'lucide-react';
import { TimelineEvent } from './timeline-event';
import { ResearchViewerSkeleton } from './research-viewer-skeleton';
import { ResearchViewerCardSkeleton } from './research-viewer-card-skeleton';
import { ResearchSummary } from './research-summary';
import { useResearchTabs } from '../../../hooks/use-research-tabs';
import {
  getCoverageBadgeActiveState,
  getCoverageBadgePresentationModel,
  getMissingDomainPromptState,
  getPresentDomainTabs,
} from '@/lib/research/domain-coverage';
import { getResearchRunHeaderBadgeModel } from '@/lib/get-research-run-header-badge-model';
import { cn } from '@/lib/utils';

interface ResearchViewerProps {
  companyName: string;
  vncUrl?: string;
  events: StreamChunk[];
  isResearching: boolean;
  onStopResearch: () => void;
  run?: { startedAt?: string | Date; completedAt?: string | Date } | null;
}

function signalCountForResult(result: ResearchResult): number {
  if (result.domain === 'traction') {
    return result.tractionSignals.length;
  }
  return (result.founderRelationship?.length || 0)
    + (result.complementarySkills?.length || 0)
    + (result.socialPresence?.length || 0)
    + (result.trackRecord?.length || 0);
}

export function ResearchViewer({
  companyName,
  vncUrl,
  events,
  isResearching,
  onStopResearch,
  run
}: ResearchViewerProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const {
    activeTab,
    setActiveTab,
    tabs,
    processedEvents,
    researchResultsByDomain,
    presentDomainIds,
  } = useResearchTabs(events);

  const runHeaderBadge = useMemo(
    () =>
      getResearchRunHeaderBadgeModel({
        startedAt: run?.startedAt,
        completedAt: run?.completedAt,
      }),
    [run?.startedAt, run?.completedAt],
  );

  const headerResult =
    researchResultsByDomain[activeTab]
    ?? (presentDomainIds[0] ? researchResultsByDomain[presentDomainIds[0]] : undefined);
  const signalCount = headerResult ? signalCountForResult(headerResult) : 0;

  const presentDomainTabs = useMemo(
    () => getPresentDomainTabs(presentDomainIds),
    [presentDomainIds],
  );
  const coveragePresentation = useMemo(
    () =>
      getCoverageBadgePresentationModel({
        presentDomainIds,
        isResearching,
        eventCount: events.length,
      }),
    [presentDomainIds, isResearching, events.length],
  );
  const missingDomainPrompt = useMemo(
    () =>
      getMissingDomainPromptState({
        presentDomainIds,
        isResearching,
        eventCount: events.length,
      }),
    [presentDomainIds, isResearching, events.length],
  );

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTo({ top: timelineRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [events]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Laptop className="w-5 h-5" aria-hidden="true" />
          Deep Research - {companyName}
          {runHeaderBadge.mode !== 'none' && runHeaderBadge.primaryLabel ? (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0"
              title={runHeaderBadge.title ?? undefined}
            >
              {runHeaderBadge.primaryLabel}
            </Badge>
          ) : null}
          {headerResult && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0"
              title={
                headerResult.domain === 'traction'
                  ? `domain: traction sources: ${headerResult.sources.length} tractionSignals: ${headerResult.tractionSignals.length}`
                  : `domain: ${headerResult.domain} sources: ${headerResult.sources.length} founderRelationship: ${headerResult.founderRelationship?.length || 0} complementarySkills: ${headerResult.complementarySkills?.length || 0} socialPresence: ${headerResult.socialPresence?.length || 0} trackRecord: ${headerResult.trackRecord?.length || 0}`
              }
            >
              {headerResult.domain} {signalCount}sig/{headerResult.sources.length}src
            </Badge>
          )}
        </CardTitle>
        <div
          className="flex flex-wrap items-center gap-1.5 mt-2"
          role="list"
          aria-label="Research domain coverage"
        >
          {coveragePresentation.badges.map(
            ({ domain, label, present, badgeText, title }) => {
              const activeState = getCoverageBadgeActiveState(
                domain,
                present,
                activeTab,
              );
              return present ? (
                <span key={domain} role="listitem" className="inline-flex">
                  <button
                    type="button"
                    onClick={() => setActiveTab(domain)}
                    className={cn(
                      badgeVariants({ variant: 'info' }),
                      'text-[10px] px-1.5 py-0 cursor-pointer',
                      activeState.activeClassName,
                    )}
                    title={title}
                    aria-label={`Show ${label} research results`}
                    aria-current={activeState.ariaCurrent}
                  >
                    {badgeText}
                  </button>
                </span>
              ) : (
                <span key={domain} role="listitem" className="inline-flex">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 text-text-tertiary"
                    title={title}
                  >
                    {badgeText}
                  </Badge>
                </span>
              );
            },
          )}
        </div>
        {coveragePresentation.discoveryLine && (
          <p className="mt-1.5 text-[11px] leading-snug text-text-tertiary">
            {coveragePresentation.discoveryLine}
          </p>
        )}
        {missingDomainPrompt.show && missingDomainPrompt.text && (
          <p className="mt-1.5 text-[11px] leading-snug text-text-tertiary">
            {missingDomainPrompt.text}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {vncUrl ? (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-[60%] flex flex-col h-[600px] rounded-md">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
                <div className="py-2 flex items-center justify-between">
                  <TabsList variant="line">
                    {tabs.map(tab => (
                      <TabsTrigger key={tab.id} value={tab.id} disabled={tab.disabled}>
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <Button
                    onClick={onStopResearch}
                    disabled={!isResearching}
                    variant="destructive"
                    size="sm"
                    aria-label="Stop research"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Stop
                  </Button>
                </div>

                {presentDomainTabs.length > 0 && (
                  <div
                    className="flex flex-wrap items-center gap-1.5 shrink-0 pb-2"
                    role="navigation"
                    aria-label="Jump to domain research results"
                  >
                    <span className="text-[11px] text-text-tertiary mr-0.5">Results</span>
                    {presentDomainTabs.map(({ id, label }) => {
                      const jumpActive = getCoverageBadgeActiveState(
                        id,
                        true,
                        activeTab,
                      );
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setActiveTab(id)}
                          className={cn(
                            badgeVariants({ variant: 'info' }),
                            'text-[10px] px-1.5 py-0 cursor-pointer',
                            jumpActive.activeClassName,
                          )}
                          title={`Open ${label} results tab`}
                          aria-label={`Jump to ${label} research results`}
                          aria-current={jumpActive.ariaCurrent}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <TabsContent value="timeline" className="flex-1 overflow-hidden mt-0">
                  <div className="flex flex-col h-full overflow-hidden">
                    <div ref={timelineRef} className="flex-1 min-h-0 overflow-y-scroll" role="feed" aria-label="Research event timeline">
                      {events.length === 0 ? (
                        <ResearchViewerSkeleton />
                      ) : (
                        <div className="relative">
                          <div className="absolute left-2.5 top-0 bottom-0 w-0.5 border-l-2 border-border-secondary" />
                          <div className="space-y-4">
                            {processedEvents.map((event, index) => (
                              <TimelineEvent
                                key={index}
                                event={event}
                                isLatest={index === processedEvents.length - 1 && isResearching}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {presentDomainIds.map((domainId) => {
                  const domainResult = researchResultsByDomain[domainId];
                  return (
                    <TabsContent key={domainId} value={domainId} className="flex-1 overflow-hidden mt-0">
                      <div className="h-full overflow-y-scroll">
                        <div className="px-4 pt-3">
                          <button
                            type="button"
                            onClick={() => setActiveTab('timeline')}
                            className={cn(
                              badgeVariants({ variant: 'outline' }),
                              'text-[10px] px-1.5 py-0 cursor-pointer text-text-tertiary hover:text-text-secondary',
                            )}
                            title="Back to research timeline"
                            aria-label="Back to research timeline"
                          >
                            Timeline
                          </button>
                        </div>
                        {domainResult ? (
                          <ResearchSummary result={domainResult} />
                        ) : (
                          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                            No summary available yet
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>

            <div className="lg:w-[40%]">
              <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                <iframe
                  src={vncUrl}
                  className="absolute top-0 left-0 w-full h-full rounded-md border border-border"
                  title={`Desktop view for ${companyName} research`}
                  allow="clipboard-read; clipboard-write"
                />
              </div>
              <p className="text-xs text-text-tertiary italic mt-3">
                Note: Agents extract data directly from the DOM without waiting for visual rendering (CSS layout, paint, composite), so data collection completes before the display updates.
              </p>
            </div>
          </div>
        ) : isResearching ? (
          <ResearchViewerCardSkeleton />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center h-[600px]">
            <Activity className="w-12 h-12 text-text-tertiary mb-4" aria-hidden="true" />
            <p className="text-text-secondary">Click &ldquo;Deep Research&rdquo; to start exploring this company</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
