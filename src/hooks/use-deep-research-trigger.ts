import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRealtimeRun, useRealtimeStream } from "@trigger.dev/react-hooks";
import type { researchOrchestrator } from '@/trigger/research-orchestrator';
import { researchStream } from '@/trigger/streams';
import { SSEEvent, StreamChunk } from '@/types/llm.types';
import { Company } from '@/types/company.types';

interface UseDeepResearchTriggerProps {
  company: Company;
  accessToken: string;
}

export function useDeepResearchTrigger({ company, accessToken }: UseDeepResearchTriggerProps) {
  const [runId, setRunId] = useState<string | null>(null);
  const [initialVncUrl, setInitialVncUrl] = useState<string | null>(null);
  const [syntheticEvents, setSyntheticEvents] = useState<StreamChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sandboxIdRef = useRef<string | null>(null);
  const researchContainerRef = useRef<HTMLDivElement>(null);

  const runIdOrEmpty = runId || "";
  const opts = { accessToken, enabled: !!runId };

  const { run, error: runError } = useRealtimeRun<typeof researchOrchestrator>(runIdOrEmpty, opts);

  const { parts, error: streamError } = useRealtimeStream(researchStream, runIdOrEmpty, {
    ...opts,
    timeoutInSeconds: 600,
    throttleInMs: 16,
  });

  const error = runError ?? streamError;

  const events = useMemo(() => {
    const streamData = parts ?? [];
    const allEvents = [...streamData, ...syntheticEvents];

    if (error) {
      allEvents.push({
        type: SSEEvent.ERROR,
        error: error.message
      });
    }

    return allEvents;
  }, [parts, syntheticEvents, error]);

  const vncUrl = useMemo(() => {
    // Priority: initial response > stream event > run output
    if (initialVncUrl) return initialVncUrl;
    if (run?.output && Array.isArray(run.output) && run.output.length > 0) {
      return run.output[0].vncUrl;
    }
    const initEvent = events.find(e => e.type === SSEEvent.INIT);
    return initEvent?.vncUrl;
  }, [initialVncUrl, events, run]);

  const isResearching = useMemo(() => {
    return run?.status === "QUEUED" || run?.status === "EXECUTING";
  }, [run?.status]);

  useEffect(() => {
    if (run?.status) setIsLoading(false);
  }, [run?.status]);

  const startResearch = useCallback(async () => {
    setRunId(null);
    setSyntheticEvents([]);
    setIsLoading(true);

    setTimeout(() => {
      researchContainerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);

    try {
      const response = await fetch(`/api/companies/${company.id}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, sandboxId: sandboxIdRef.current ?? undefined }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to start research:', error);
        setIsLoading(false);
        return;
      }

      const { runId: newRunId, sandboxId: newSandboxId, vncUrl } = await response.json();
      sandboxIdRef.current = newSandboxId;
      setInitialVncUrl(vncUrl);
      setRunId(newRunId);
    } catch (error) {
      console.error('Failed to start research:', error);
      setIsLoading(false);
    }
  }, [company]);

  const stopResearch = useCallback(async () => {
    if (!runId) return;

    try {
      const response = await fetch(`/api/research/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });

      const data = await response.json();

      if (data.success && data.message) {
        setSyntheticEvents(curr => [...curr, {
          type: SSEEvent.ERROR,
          error: data.message
        }]);
      }
    } catch (error) {
      console.error('Failed to cancel research:', error);
    }
  }, [runId]);

  return {
    isResearching,
    isLoading,
    vncUrl,
    events,
    startResearch,
    stopResearch,
    researchContainerRef,
    run,
  };
}
