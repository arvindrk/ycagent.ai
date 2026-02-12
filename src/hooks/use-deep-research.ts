import { useState, useRef, useCallback, useEffect } from 'react';
import { StreamChunk, SSEEvent } from '@/lib/llm/types';
import { Company } from '@/types/company';

export function useDeepResearch(company: Company) {
  const [isResearching, setIsResearching] = useState(false);
  const [sandboxId, setSandboxId] = useState<string>();
  const [vncUrl, setVncUrl] = useState<string>();
  const [events, setEvents] = useState<StreamChunk[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const researchContainerRef = useRef<HTMLDivElement>(null);

  const handleEvent = useCallback((event: StreamChunk) => {
    switch (event.type) {
      case SSEEvent.INIT:
        if (event.sandboxId) setSandboxId(event.sandboxId);
        if (event.vncUrl) setVncUrl(event.vncUrl);
        break;
      case SSEEvent.REASONING:
      case SSEEvent.ACTION:
      case SSEEvent.ACTION_COMPLETED:
        setEvents(prev => [...prev, event]);
        break;
      case SSEEvent.ERROR:
        setEvents(prev => [...prev, event]);
        setIsResearching(false);
        break;
      case SSEEvent.DONE:
        setEvents(prev => [...prev, event]);
        setIsResearching(false);
        break;
    }
  }, []);

  const startResearch = useCallback(async () => {
    setIsResearching(true);
    setEvents([]);

    setTimeout(() => {
      researchContainerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/api/companies/${company.id}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          sandboxId: sandboxId || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        setEvents(prev => [...prev, {
          type: SSEEvent.ERROR,
          error: error.error || 'Request failed'
        }]);
        setIsResearching(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setIsResearching(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              handleEvent(event);
            } catch (err) {
              console.error('Failed to parse SSE event:', err);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setEvents(prev => [...prev, {
          type: SSEEvent.ERROR,
          error: error.message
        }]);
      }
      setIsResearching(false);
    }
  }, [company, sandboxId, handleEvent]);

  const stopResearch = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsResearching(false);
    setEvents(prev => [...prev, {
      type: SSEEvent.ERROR,
      error: 'Research stopped by user'
    }]);
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    isResearching,
    vncUrl,
    events,
    startResearch,
    stopResearch,
    researchContainerRef
  };
}
