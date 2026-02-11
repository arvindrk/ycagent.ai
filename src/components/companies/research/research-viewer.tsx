"use client";

import { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StreamChunk, SSEEvent } from '@/lib/llm/types';
import { Laptop, Activity, Square } from 'lucide-react';

interface ResearchViewerProps {
  companyName: string;
  vncUrl?: string;
  events: StreamChunk[];
  isResearching: boolean;
  onStopResearch: () => void;
}

function formatEventDisplay(event: StreamChunk): { icon: string; text: string } {
  switch (event.type) {
    case SSEEvent.REASONING:
      return { icon: '💭', text: `Reasoning: ${event.content}` };
    case SSEEvent.ACTION:
      return { 
        icon: '⚡', 
        text: `Action: ${event.toolName} - ${JSON.stringify(event.action)}` 
      };
    case SSEEvent.ACTION_COMPLETED:
      return { icon: '✓', text: 'Action completed' };
    case SSEEvent.ERROR:
      return { icon: '❌', text: `Error: ${event.error}` };
    case SSEEvent.DONE:
      return { icon: '✅', text: 'Research completed' };
    default:
      return { icon: '•', text: JSON.stringify(event) };
  }
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

  return (
    <Card className="bg-bg-secondary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Laptop className="w-5 h-5" aria-hidden="true" />
          Deep Research - {companyName}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
            {/* Iframe - 60% on desktop */}
            <div className="lg:w-[60%]">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={vncUrl}
                  className="absolute top-0 left-0 w-full h-full rounded-md border border-border"
                  title={`Desktop view for ${companyName} research`}
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            </div>

            {/* Events panel - 40% on desktop */}
            <div className="lg:w-[40%] flex flex-col h-[600px] bg-bg-tertiary rounded-md border border-border">
              {/* Static header */}
              <div className="border-b border-border px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-text-primary">
                  Research Events
                </h3>
                <button
                  onClick={onStopResearch}
                  disabled={!isResearching}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-fast disabled:opacity-50 disabled:cursor-not-allowed bg-bg-quaternary hover:bg-bg-quaternary/80 text-text-primary border border-border"
                  aria-label="Stop research"
                >
                  <Square className="w-3.5 h-3.5" aria-hidden="true" />
                  Stop
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[13px]">
                {events.length === 0 ? (
                  <p className="text-text-tertiary">Waiting for events...</p>
                ) : (
                  events.map((event, index) => {
                    const { icon, text } = formatEventDisplay(event);
                    return (
                      <div key={index} className="text-text-primary">
                        <span className="text-text-secondary mr-2">{icon}</span>
                        {text}
                      </div>
                    );
                  })
                )}
                <div ref={eventsEndRef} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
