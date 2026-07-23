import { useMemo, useState } from 'react';
import { StreamChunk, SSEEvent, ResearchResult } from '@/types/llm.types';
import { getDomainCoverage } from '@/lib/research/domain-coverage';
import {
  buildResearchResultsByDomain,
  getDefaultActiveTab,
  getPresentDomainIds,
} from '@/lib/research/multi-domain-stream';

export interface TabConfig {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface UseResearchTabsResult {
  activeTab: string;
  setActiveTab: (id: string) => void;
  tabs: TabConfig[];
  processedEvents: StreamChunk[];
  /** Last-wins map of domain id -> ResearchResult from all RESULT events. */
  researchResultsByDomain: Record<string, ResearchResult>;
  /** Registry domains that have a result, in DOMAIN_REGISTRY key order. */
  presentDomainIds: string[];
}

export function useResearchTabs(events: StreamChunk[]): UseResearchTabsResult {
  const [userSelectedTab, setUserSelectedTab] = useState<string | null>(null);

  const researchResultsByDomain = useMemo(
    () => buildResearchResultsByDomain(events),
    [events],
  );

  const presentDomainIds = useMemo(
    () => getPresentDomainIds(researchResultsByDomain),
    [researchResultsByDomain],
  );

  const tabs = useMemo((): TabConfig[] => {
    const domainTabs = getDomainCoverage(presentDomainIds)
      .filter((item) => item.present)
      .map((item) => ({ id: item.domain, label: item.label }));

    return [
      { id: 'timeline', label: 'Timeline' },
      ...domainTabs,
      { id: 'investor_profile', label: 'Investor Profile (Coming Soon)', disabled: true },
      { id: 'hiring', label: 'Jobs (Coming Soon)', disabled: true },
    ];
  }, [presentDomainIds]);

  const activeTab = useMemo(() => {
    if (userSelectedTab) return userSelectedTab;
    return getDefaultActiveTab(presentDomainIds);
  }, [userSelectedTab, presentDomainIds]);

  const processedEvents = useMemo(() => {
    const result: StreamChunk[] = [];

    events.forEach(event => {
      if (event.type !== SSEEvent.THINKING) {
        const lastThinkingIndex = result.findLastIndex(e => e.type === SSEEvent.THINKING);
        if (lastThinkingIndex !== -1) {
          result.splice(lastThinkingIndex, 1);
        }
      }

      if (event.type === SSEEvent.ACTION_COMPLETED) {
        for (let i = result.length - 1; i >= 0; i--) {
          if (result[i].type === SSEEvent.ACTION) {
            result[i].isCompleted = true;
            break;
          }
        }
      } else if (event.type !== SSEEvent.RESULT) {
        result.push(event);
      }
    });

    return result;
  }, [events]);

  return {
    activeTab,
    setActiveTab: setUserSelectedTab,
    tabs,
    processedEvents,
    researchResultsByDomain,
    presentDomainIds,
  };
}
