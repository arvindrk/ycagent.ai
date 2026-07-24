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

/**
 * Enabled domain tabs from present coverage only (registry order).
 * Matches useResearchTabs domain tabs: excludes timeline and Coming Soon
 * (investor_profile / hiring).
 */
export function getPresentDomainTabs(
  presentDomainIds: Iterable<string | null | undefined>,
): Array<{ id: string; label: string }> {
  return getDomainCoverage(presentDomainIds)
    .filter((item) => item.present)
    .map((item) => ({ id: item.domain, label: item.label }));
}

/**
 * Enabled domain tab ids only (registry order).
 * Pure SoT for presentDomainIds ↔ present coverage ↔ domain tab parity.
 */
export function getPresentDomainTabIds(
  presentDomainIds: Iterable<string | null | undefined>,
): string[] {
  return getPresentDomainTabs(presentDomainIds).map((tab) => tab.id);
}
