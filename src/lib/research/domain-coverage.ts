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

/**
 * Missing registry domain labels in DOMAIN_REGISTRY order.
 * Pure SoT for ResearchViewer missing-domain prompt list (not Coming Soon).
 */
export function getMissingDomainLabels(
  presentDomainIds: Iterable<string | null | undefined>,
): string[] {
  return getDomainCoverage(presentDomainIds)
    .filter((item) => !item.present)
    .map((item) => item.label);
}

/**
 * Active visual class tokens for present coverage badges when activeTab matches.
 * Pure SoT for ResearchViewer coverage row, Timeline Results jumps, and hermetic
 * smoke (no hand-mirrored strings).
 */
export const COVERAGE_BADGE_ACTIVE_CLASS_TOKENS = [
  "bg-blue/20",
  "font-semibold",
  "ring-1",
  "ring-blue/60",
] as const;

export const COVERAGE_BADGE_ACTIVE_CLASS =
  COVERAGE_BADGE_ACTIVE_CLASS_TOKENS.join(" ");

export type CoverageBadgeActiveState = {
  active: boolean;
  /** Matches ResearchViewer aria-current: 'true' when active, else undefined. */
  ariaCurrent: "true" | undefined;
  /** Active visual class string when active; empty when not. */
  activeClassName: string;
};

/**
 * Whether a coverage badge is interactive-active.
 * Only present registry domains can be active; missing never is.
 */
export function isCoverageBadgeActive(
  domain: string,
  present: boolean,
  activeTab: string,
): boolean {
  return present && activeTab === domain;
}

/**
 * Pure SoT for present coverage badge / Timeline Results jump active visual + aria.
 */
export function getCoverageBadgeActiveState(
  domain: string,
  present: boolean,
  activeTab: string,
): CoverageBadgeActiveState {
  const active = isCoverageBadgeActive(domain, present, activeTab);
  return {
    active,
    ariaCurrent: active ? "true" : undefined,
    activeClassName: active ? COVERAGE_BADGE_ACTIVE_CLASS : "",
  };
}

/**
 * Present coverage domain ids that are active for the given activeTab (registry order).
 * Unknown / Coming Soon never appear (getDomainCoverage is registry-only).
 */
export function getActiveCoverageDomainIds(
  presentDomainIds: Iterable<string | null | undefined>,
  activeTab: string,
): string[] {
  return getDomainCoverage(presentDomainIds)
    .filter((item) => isCoverageBadgeActive(item.domain, item.present, activeTab))
    .map((item) => item.domain);
}

export type MissingDomainPromptState = {
  show: boolean;
  labels: string[];
  /** Full prompt copy when show; null when hidden. */
  text: string | null;
};

function countNonEmptyIds(
  presentDomainIds: Iterable<string | null | undefined>,
): number {
  let n = 0;
  for (const key of presentDomainIds) {
    if (typeof key === "string" && key.length > 0) n++;
  }
  return n;
}

/**
 * Missing-domain prompt gate + copy for ResearchViewer.
 * show when any registry domain missing AND research is live, has stream
 * events, or has at least one present domain id.
 */
export function getMissingDomainPromptState(input: {
  presentDomainIds: Iterable<string | null | undefined>;
  isResearching: boolean;
  eventCount: number;
}): MissingDomainPromptState {
  // Materialize once so one-shot iterables stay consistent across label + gate.
  const presentList = Array.from(input.presentDomainIds);
  const labels = getMissingDomainLabels(presentList);
  const show =
    labels.length > 0 &&
    (input.isResearching ||
      input.eventCount > 0 ||
      countNonEmptyIds(presentList) > 0);
  const text = show
    ? input.isResearching
      ? `Research may still be gathering: ${labels.join(", ")}.`
      : `Not produced in this run: ${labels.join(", ")}.`
    : null;
  return { show, labels, text };
}
