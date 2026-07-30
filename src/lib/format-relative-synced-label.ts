/**
 * Short relative freshness label for company preview last_synced_at badges.
 * Pure: injectable `now` for hermetic tests. Never throws on bad input.
 */
export function formatRelativeSyncedLabel(
  lastSyncedAt: string,
  now: Date | number = Date.now(),
): string {
  const fallback =
    lastSyncedAt.length >= 10 ? lastSyncedAt.slice(0, 10) : lastSyncedAt;

  const syncedMs = Date.parse(lastSyncedAt);
  if (Number.isNaN(syncedMs)) {
    return fallback;
  }

  const nowMs = typeof now === 'number' ? now : now.getTime();
  if (Number.isNaN(nowMs)) {
    return fallback;
  }

  // Future timestamps (clock skew): treat as current.
  const diffMs = Math.max(0, nowMs - syncedMs);
  const dayMs = 86_400_000;
  const days = Math.floor(diffMs / dayMs);

  if (days < 1) return 'synced today';
  if (days < 30) return `synced ${days}d ago`;
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return `synced ${months}mo ago`;
  }
  const years = Math.max(1, Math.floor(days / 365));
  return `synced ${years}y ago`;
}
