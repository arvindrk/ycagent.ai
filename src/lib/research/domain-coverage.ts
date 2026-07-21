import { DOMAIN_REGISTRY } from "@/lib/research/domain-registry";

/** Static labels for registry domains only (not Coming Soon tabs). */
const DOMAIN_LABELS: Record<string, string> = {
  founder_profile: "Founder Profile",
  traction: "Traction",
};

export type DomainCoverageItem = {
  domain: string;
  label: string;
  present: boolean;
};

/**
 * Coverage checklist over DOMAIN_REGISTRY keys only.
 * present = keys in presentDomains; missing = registry - present.
 */
export function getDomainCoverage(
  presentDomains: Iterable<string | null | undefined>,
): DomainCoverageItem[] {
  const present = new Set<string>();
  for (const key of presentDomains) {
    if (typeof key === "string" && key.length > 0) {
      present.add(key);
    }
  }
  return Object.keys(DOMAIN_REGISTRY).map((domain) => ({
    domain,
    label: DOMAIN_LABELS[domain] ?? domain,
    present: present.has(domain),
  }));
}
