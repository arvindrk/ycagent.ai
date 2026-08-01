/**
 * Short relative freshness label for research run completedAt badges.
 * Pure: injectable `now` for hermetic tests. Never throws on bad input.
 * Distinct from formatRelativeSyncedLabel (synced *) used by company preview.
 */
export function formatRelativeResearchedLabel(
  completedAt: string | Date,
  now: Date | number = Date.now(),
): string {
  let raw: string;
  let completedMs: number;

  if (completedAt instanceof Date) {
    completedMs = completedAt.getTime();
    if (Number.isNaN(completedMs)) {
      return '';
    }
    raw = completedAt.toISOString();
  } else if (typeof completedAt === 'string') {
    raw = completedAt;
    if (!raw) {
      return '';
    }
    completedMs = Date.parse(raw);
    if (Number.isNaN(completedMs)) {
      return raw.length >= 10 ? raw.slice(0, 10) : raw;
    }
  } else {
    return '';
  }

  const fallback = raw.length >= 10 ? raw.slice(0, 10) : raw;

  const nowMs = typeof now === 'number' ? now : now.getTime();
  if (Number.isNaN(nowMs)) {
    return fallback;
  }

  // Future timestamps (clock skew): treat as current.
  const diffMs = Math.max(0, nowMs - completedMs);
  const dayMs = 86_400_000;
  const days = Math.floor(diffMs / dayMs);

  if (days < 1) return 'researched today';
  if (days < 30) return `researched ${days}d ago`;
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return `researched ${months}mo ago`;
  }
  const years = Math.max(1, Math.floor(days / 365));
  return `researched ${years}y ago`;
}
