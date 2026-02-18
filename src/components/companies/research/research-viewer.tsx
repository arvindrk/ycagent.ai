"use client";

import { useRef, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StreamChunk, SSEEvent, ResearchResult } from '@/types/llm.types';
import { Laptop, Activity, Square, Loader2 } from 'lucide-react';
import { TimelineEvent } from './timeline-event';
import { ResearchSummary } from './research-summary';

interface ResearchViewerProps {
  companyName: string;
  vncUrl?: string;
  events: StreamChunk[];
  isResearching: boolean;
  onStopResearch: () => void;
}

export function ResearchViewer({
  companyName,
  vncUrl,
  events,
  isResearching,
  onStopResearch
}: ResearchViewerProps) {
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const [userSelectedTab, setUserSelectedTab] = useState<'timeline' | 'summary' | null>(null);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const processedEvents = useMemo(() => {
    const result: Array<StreamChunk & { isCompleted?: boolean }> = [];

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

  const researchResult = useMemo((): ResearchResult | null => {
    const resultEvent = events.find(e => e.type === SSEEvent.RESULT);
    if (resultEvent?.result) {
      return resultEvent.result;
    }

    return null;
  }, [events]);

  const activeTab = useMemo(() => {
    if (userSelectedTab) return userSelectedTab;
    return researchResult ? 'summary' : 'timeline';
  }, [userSelectedTab, researchResult]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Laptop className="w-5 h-5" aria-hidden="true" />
          Deep Research - {companyName}
        </CardTitle>
      </CardHeader>
      <CardContent className=''>
        {!vncUrl ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {isResearching ? (
              <Loader2 className="w-12 h-12 text-text-tertiary mb-4 animate-spin" aria-hidden="true" />
            ) : (
              <Activity className="w-12 h-12 text-text-tertiary mb-4" aria-hidden="true" />
            )}
            <p className="text-text-secondary">
              {isResearching
                ? 'Initializing research environment...'
                : 'Click "Deep Research" to start exploring this company'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-[60%] flex flex-col h-[600px] rounded-md">
              <div className="py-2 flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={(v) => setUserSelectedTab(v as 'timeline' | 'summary')} className="flex-1">
                  <TabsList variant="line">
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="summary" disabled={!researchResult}>
                      Summary
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
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

              <Tabs value={activeTab} onValueChange={(v) => setUserSelectedTab(v as 'timeline' | 'summary')} className="flex-1 flex flex-col overflow-y-auto">
                <TabsContent value="timeline" className="flex-1 overflow-y-auto mt-0" role="feed" aria-label="Research event timeline">
                  {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-40">
                      <div className="relative">
                        <div className="absolute left-2.5 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-border-secondary" />
                        <div className="space-y-8 ml-8">
                          <div className="w-3 h-3 rounded-full border-2 border-border-secondary bg-bg-tertiary" />
                          <div className="w-3 h-3 rounded-full border-2 border-border-secondary bg-bg-tertiary" />
                          <div className="w-3 h-3 rounded-full border-2 border-border-secondary bg-bg-tertiary" />
                        </div>
                      </div>
                      <p className="text-text-tertiary text-sm mt-6">Agent event will appear here...</p>
                    </div>
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
                      <div ref={eventsEndRef} />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="summary" className="flex-1 overflow-y-auto mt-0">
                  {researchResult ? (
                    <ResearchSummary result={researchResult} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                      No summary available yet
                    </div>
                  )}
                </TabsContent>
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
        )}
      </CardContent>
    </Card>
  );
}
