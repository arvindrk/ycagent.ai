import { formatRelativeResearchedLabel } from '@/lib/format-relative-researched-label';

export type ResearchRunHeaderBadgeMode = 'none' | 'live' | 'completed';

export interface ResearchRunHeaderBadgeModel {
  mode: ResearchRunHeaderBadgeMode;
  /** Human-facing badge copy; null when mode is none. */
  primaryLabel: string | null;
  /** Elapsed seconds when both timestamps valid and completed >= started; else null. */
  durationSeconds: number | null;
  /** Tooltip with absolute timestamps and optional duration; null when mode is none. */
  title: string | null;
}

function parseTimestamp(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

function buildTitle(
  started: Date,
  completed: Date | null,
  durationSeconds: number | null,
): string {
  let title = `started_at: ${started.toISOString()}`;
  if (completed) {
    title += ` completed_at: ${completed.toISOString()}`;
  }
  if (durationSeconds !== null) {
    title += ` dur: ${durationSeconds}s`;
  }
  return title;
}

/**
 * Pure presentation model for ResearchViewer header run-status badge.
 * Injectable `now` for hermetic tests. Never throws on garbage dates.
 * At most one human-facing primary label; duration only in title.
 */
export function getResearchRunHeaderBadgeModel(input: {
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  now?: Date | number;
}): ResearchRunHeaderBadgeModel {
  try {
    const started = parseTimestamp(input.startedAt);
    if (!started) {
      return {
        mode: 'none',
        primaryLabel: null,
        durationSeconds: null,
        title: null,
      };
    }

    const completed = parseTimestamp(input.completedAt);
    if (!completed) {
      return {
        mode: 'live',
        primaryLabel: 'research live',
        durationSeconds: null,
        title: buildTitle(started, null, null),
      };
    }

    const elapsedMs = completed.getTime() - started.getTime();
    const durationSeconds =
      elapsedMs >= 0 ? Math.round(elapsedMs / 1000) : null;

    const primaryLabel = formatRelativeResearchedLabel(completed, input.now);

    return {
      mode: 'completed',
      primaryLabel,
      durationSeconds,
      title: buildTitle(started, completed, durationSeconds),
    };
  } catch {
    return {
      mode: 'none',
      primaryLabel: null,
      durationSeconds: null,
      title: null,
    };
  }
}
