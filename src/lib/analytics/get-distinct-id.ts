import { createHash } from 'crypto';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';

/**
 * Reads the PostHog anonymous distinct_id from the cookie set by posthog-js.
 * Falls back to an IP-derived ID so server captures always have a stable identifier.
 */
export function getDistinctId(
  cookies: { get: (name: string) => { value: string } | undefined },
  ipAddress?: string | null
): string {
  const cookieName = `ph_${POSTHOG_KEY}_posthog`;
  const raw = cookies.get(cookieName)?.value;

  if (raw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as { distinct_id?: string };
      if (parsed.distinct_id) return parsed.distinct_id;
    } catch {
      // malformed cookie — fall through
    }
  }

  if (ipAddress) {
    const hash = createHash('sha256').update(ipAddress).digest('hex').slice(0, 12);
    return `anon_${hash}`;
  }

  return 'anonymous';
}

/**
 * Extracts client IP from request headers, checking common proxy headers first.
 */
export function getIpAddress(headers: Headers): string | null {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    null
  );
}
