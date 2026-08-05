export type ResearchRunStatus = 'completed' | 'partial' | 'failed';

/**
 * Outcome of a multi-domain research run.
 *
 * The orchestrator used to throw on the first domain failure, so a failure in
 * founder_profile discarded a completed traction result and the user got
 * nothing. A run is only a failure when no domain produced anything.
 */
export function resolveResearchRunStatus(counts: {
  succeeded: number;
  failed: number;
}): ResearchRunStatus {
  if (counts.succeeded === 0) return 'failed';
  return counts.failed > 0 ? 'partial' : 'completed';
}
