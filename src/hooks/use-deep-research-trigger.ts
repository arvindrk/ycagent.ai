import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";
import type { researchOrchestrator } from '@/trigger/research-orchestrator';
import { StreamChunk, SSEEvent } from '@/lib/llm/types';
import { Company } from '@/types/company';

interface UseDeepResearchTriggerProps {
  company: Company;
  accessToken: string;
}

type ResearchStreams = {
  "research-stream": StreamChunk;
};

export function useDeepResearchTrigger({ company, accessToken }: UseDeepResearchTriggerProps) {
  const [runId, setRunId] = useState<string | null>(null);
  const [initialVncUrl, setInitialVncUrl] = useState<string | null>(null);
  const researchContainerRef = useRef<HTMLDivElement>(null);

  const { run, streams, error } = useRealtimeRunWithStreams<typeof researchOrchestrator, ResearchStreams>(
    runId || "",
    {
      accessToken,
      enabled: !!runId,
    }
  );

  useEffect(() => {
    if (error) {
      console.error('[useDeepResearchTrigger] Realtime error:', error);
    }
  }, [error]);

  useEffect(() => {
    if (run) {
      console.log('[useDeepResearchTrigger] Run status:', run.status);
      if (run.status === "COMPLETED") {
        console.log('[useDeepResearchTrigger] Run completed with output:', run.output);
      }
    }
  }, [run]);

  const events = useMemo(() => {
    const streamData = streams["research-stream"] || [];
    if (streamData.length > 0) {
      console.log(`[useDeepResearchTrigger] Received ${streamData.length} events`);
    }
    return streamData;
  }, [streams]);

  const vncUrl = useMemo(() => {
    // Priority: initial response > stream event > run output
    if (initialVncUrl) return initialVncUrl;
    if (run?.output?.vncUrl) return run.output.vncUrl;
    const initEvent = events.find(e => e.type === SSEEvent.INIT);
    return initEvent?.vncUrl;
  }, [initialVncUrl, events, run]);

  const isResearching = useMemo(() => {
    return run?.status === "QUEUED" || run?.status === "EXECUTING";
  }, [run?.status]);

  const startResearch = useCallback(async () => {
    setRunId(null);

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
        body: JSON.stringify({ company }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to start research:', error);
        return;
      }

      const { runId: newRunId, sandboxId, vncUrl } = await response.json();
      console.log('[useDeepResearchTrigger] Task triggered, runId:', newRunId);
      console.log('[useDeepResearchTrigger] Sandbox created:', sandboxId, 'VNC:', vncUrl);
      setInitialVncUrl(vncUrl);
      setRunId(newRunId);
    } catch (error) {
      console.error('Failed to start research:', error);
    }
  }, [company]);

  const stopResearch = useCallback(async () => {
    if (!runId) return;

    try {
      await fetch(`/api/research/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
    } catch (error) {
      console.error('Failed to cancel research:', error);
    }
  }, [runId]);

  useEffect(() => {
    return () => {
      // Cleanup handled by Trigger.dev
    };
  }, []);

  return {
    isResearching,
    vncUrl,
    events,
    startResearch,
    stopResearch,
    researchContainerRef,
    run,
  };
}
