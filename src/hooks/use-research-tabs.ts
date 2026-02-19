import { useMemo, useState } from 'react';
import { StreamChunk, SSEEvent, ResearchResult } from '@/types/llm.types';

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
  researchResult: ResearchResult | null;
}

export function useResearchTabs(events: StreamChunk[]): UseResearchTabsResult {
  const [userSelectedTab, setUserSelectedTab] = useState<string | null>(null);

  const researchResult = useMemo((): ResearchResult | null => {
    const resultEvent = events.find(e => e.type === SSEEvent.RESULT);
    return resultEvent?.result ?? null;
  }, [events]);

  const tabs = useMemo((): TabConfig[] => [
    { id: 'timeline', label: 'Timeline' },
    { id: 'founder_profile', label: 'Founder Profile', disabled: !researchResult },
    { id: 'investor_profile', label: 'Investor Profile (Coming Soon)', disabled: true },
    { id: 'hiring', label: 'Jobs (Coming Soon)', disabled: true },
  ], [researchResult]);

  const activeTab = useMemo(() => {
    if (userSelectedTab) return userSelectedTab;
    return researchResult ? 'founder_profile' : 'timeline';
  }, [userSelectedTab, researchResult]);

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
    researchResult,
  };
}
