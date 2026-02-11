"use client";

import { useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StreamChunk, SSEEvent } from '@/lib/llm/types';
import { Laptop, Activity, Square } from 'lucide-react';
import { TimelineEvent } from './timeline-event';

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

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const processedEvents = useMemo(() => {
    const result: Array<StreamChunk & { isCompleted?: boolean }> = [];
    
    events.forEach(event => {
      if (event.type === SSEEvent.ACTION_COMPLETED) {
        for (let i = result.length - 1; i >= 0; i--) {
          if (result[i].type === SSEEvent.ACTION) {
            result[i].isCompleted = true;
            break;
          }
        }
      } else {
        result.push(event);
      }
    });
    
    return result;
  }, [events]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Laptop className="w-5 h-5" aria-hidden="true" />
          Deep Research - {companyName}
        </CardTitle>
      </CardHeader>
      <CardContent className='pl-0'>
        {!vncUrl ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Activity
              className="w-12 h-12 text-text-tertiary mb-4"
              aria-hidden="true"
            />
            <p className="text-text-secondary">
              {isResearching
                ? 'Initializing research environment...'
                : 'Click "Deep Research" to start exploring this company'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-[60%] flex flex-col h-[600px] rounded-md">
              <div className="border-b border-border px-6 py-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-text-primary">
                  Research Timeline
                </h3>
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

              <div
                className="flex-1 overflow-y-auto p-6"
                role="feed"
                aria-label="Research event timeline"
              >
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
                    <p className="text-text-tertiary text-sm mt-6">Agent will appear here...</p>
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
              </div>
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
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
