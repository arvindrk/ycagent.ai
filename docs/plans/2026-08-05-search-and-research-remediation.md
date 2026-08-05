# Search and research remediation

Status: Phase A1/A2 shipped (PRs #101, #102). Phases 0 through 6 below are outstanding.

Every phase is a stack of small PRs. Each PR states its own architecture intent, Chrome
validation, and verification gate. Nothing merges without a Chrome run.

---

## Why the codebase got here

The autonomous harness merged 24 PRs in three weeks. Each added a visible affordance plus a
hermetic smoke eval; each passed lint, typecheck, build and evals; none of them ever rendered
the page. The result is measurable:

- Company names render in a **21px box** on every card, because four `flex-shrink-0` debug
  badges are siblings of the title.
- **Four empty tier rows** ("No Exact Match results") sit above the first real result.
- Twelve of the twenty-eight eval scripts assert the behaviour of presentation models that
  exist only to feed those badges.

The lesson drives Phase 0: verification that never looks at the rendered page will approve
anything. Phase 0 is therefore a prerequisite for every other phase, not optional polish.

---

## Architecture principles for this work

These are the specific violations found in the audit, and the rule each phase applies.

| Violation found | Rule |
| --- | --- |
| Tier taxonomy duplicated across `weights.ts`, `score-constants.ts`, the SQL `CASE`, `build-tier-bucket-model.ts`, `build-search-result-count-summary.ts`. Adding a tier means editing five files. | One registry owns a concept. Derive SQL and presentation from it. |
| `format-relative-synced-label.ts` and `format-relative-researched-label.ts` are the same algorithm with different signatures. | One `formatRelativeTime`. Callers pass a date, not a domain noun. |
| `detail/company-logo.tsx` exists; `company-preview-card.tsx` inlines a second copy of the same `Image` + error-state + fallback logic. | One `CompanyLogo`, size as a prop. |
| `company-preview-card.tsx` is 227 lines mixing link, analytics, image state, five badges, hover CTA, and mobile CTA. | Presentation separate from behaviour. A card renders; it does not own analytics policy. |
| `SearchWrapper` owns `isSearching`, `SearchContainer` owns the query, and the browse grid is a child of the wrapper. Typing one character unmounts the grid. | One owner for "is the user searching", derived from the committed query. |
| Six `get-*-model.ts` / `build-*-model.ts` files created to make badges testable without rendering. | Extract a model when logic is genuinely reusable, not to dodge rendering. Phase 0 makes rendering testable. |

Non-negotiables: no new dependencies without justification, no schema migration unless a phase
names one, and every deletion of an eval must be paired with the Chrome assertion that replaces it.

---

## Phase 0 — UI verification harness

**This gates everything else.** Without it, later phases repeat the mistake they are fixing.

### PR 0.1 — `scripts/ui-check.mts`

A Playwright runner that drives Chrome against a running dev server and asserts DOM invariants.
Scenarios are data, so each later phase appends cases instead of writing bespoke scripts.

```ts
// shape, not final code
type Scenario = {
  name: string;
  path: string;
  query?: string;
  assert: (page: Page) => Promise<void>;
};
```

Ships with the invariants the audit already proved are violated:

- No horizontal body overflow at 390px, 768px, 1440px.
- Every company name element renders at least 80px wide and its text is not clipped.
- No element whose visible text matches `/^No .* results$/` appears above the first result card.
- Zero console errors and zero failed same-origin requests.
- Search results appear within 2s of a committed query on the healthy path.

Add `npm run ui-check`, and wire it into `npm run verify` behind a flag so CI without a dev
server still passes. Assertions live next to the scenario, and failures print the offending
selector plus measured value.

**Chrome validation:** run against current `main` and confirm it **fails** on the name-width and
empty-tier assertions. A harness that passes on known-broken code is worthless.

**Verification gate:** `npm run ui-check` red on `main` for exactly the known defects; green
after Phase 2 and Phase 3 land.

---

## Phase 1 — Ranking quality (backend only, no UI)

Stacked on #102.

### PR A3 — cut the noise tail and reduce the tier set

Measured across six queries at `limit=50`: max semantic score observed is **0.59**, while
`TIER_HIGH_SEM` is 0.7. "Highly Relevant" is unreachable. `PREFILTER_SEMANTIC_MIN` of 0.25 is so
loose that `ai agents` returns 4 useful results and **46 noise results**.

- Add `scripts/measure-score-distribution.mts` to sample percentiles over a fixed query set.
  Thresholds become derived numbers with a recorded provenance, not guesses.
- Raise the semantic prefilter to the measured knee so the tail is cut server-side.
- Collapse the five-tier taxonomy to what the UI in Phase 3 actually consumes: `exact` (top hit)
  and `match`. Relevance is expressed by rank order, not by five opaque labels.
- Introduce `src/lib/semantic-search/scoring/tiers.ts` as the single registry: threshold, key,
  and label in one place, with the SQL `CASE` generated from it. Delete the parallel definitions.

**Chrome validation:** the same six queries, before/after screenshots, confirming the result
count drops to useful matches and nothing above the fold regresses.

**Verification gate:** `npm run verify`; distribution script output committed to the PR body;
result count for `ai agents` falls from 50 to the measured useful set.

### PR A4 — embed the cleaned query

The vector path embeds the raw string, so `W24 AI companies that are hiring` embeds the batch
and hiring tokens that were already consumed as structured filters, polluting the vector.

Embed `cleanedQuery`, falling back to the raw query when the residue is empty.

**Chrome validation:** filtered queries (`W24 AI companies that are hiring`,
`seed stage fintech in europe`) compared before/after.

**Verification gate:** `npm run verify`; a side-by-side relevance table in the PR body for at
least five filtered queries.

---

## Phase 2 — Cards

Parallel with Phase 1. No shared files.

### PR B1 — restore name legibility, remove debug telemetry

The direct cause of unreadable names: the tier badge, `0.00` score badge, sync-date badge and
"Deep research" badge are `flex-shrink-0` siblings of the title, so the title absorbs all the
collapse. Measured at 21px on every card.

- Delete the tier, score, sync and "Deep research" badges and the raw-field tooltips
  (`last_synced_at: … updated_at: …`).
- Restructure the header: logo, then name as the only flexible element, then the batch chip.
  Name gets `min-w-0 flex-1`; the chip is the only `shrink-0` sibling.
- Extract presentation from behaviour: the card renders, and the Deep Research affordance and
  its analytics move out of the card body.
- Fix the nested-interactive bug: a `<button>` currently sits inside the card's wrapping
  `<a>`, with `tabIndex={-1}` papering over it. Nested interactive controls are invalid and
  unreachable by keyboard. The card becomes a single link with the action as a sibling.
- Replace the saturated `bg-green-500` hiring pill with a quiet status marker.

**Chrome validation:** Phase 0 name-width assertion goes green; 24-card screenshot at 1440px
and 390px; keyboard tab order reaches both the card and the Deep Research action.

**Verification gate:** `npm run verify` and `npm run ui-check`.
Evals to delete with their subjects: `relative-freshness-label-smoke`,
`search-result-count-summary-smoke` (if the summary line goes), and PR #100 should be closed
rather than merged since it refactors the score badges this PR removes.

### PR B2 — one logo component, honest fallbacks

Measured: **632 companies (11.2%)** store `logo_url = '/company/thumb/missing.png'`, a relative
path that `next/image` resolves against our own origin, producing the 502s on the homepage.
Of the 5,021 real S3 URLs, roughly **2.5%** are dead (403 at origin). No rows have a null logo,
so the existing `logo_url ? … : <Building2/>` check never fires.

- Promote a single `CompanyLogo` used by both the list card and the detail hero, size as a prop.
  Deletes the inlined duplicate in `company-preview-card.tsx`.
- Treat a non-absolute `logo_url` as absent, which fixes all 632 rows with no migration.
- Replace the `/yc.png` fallback with a neutral monogram. Showing the Y Combinator logo for a
  company that has no logo is misattribution, and it renders at `grayscale opacity-30`, which
  reads as a broken image.
- Keep `onError` for the dead 2.5%.
- Fix the `width`/`height` aspect-ratio console warning.

**Chrome validation:** zero failed image requests on the homepage; screenshot showing monogram
fallbacks; confirm no card shows the YC logo as its own.

**Verification gate:** `npm run verify`; Phase 0 "zero failed same-origin requests" green.

---

## Phase 3 — Search results UX

C1 and C2 are parallel. C3 depends on B1 and A3.

### PR C1 — delete the empty tier wall

`buildTierBucketModel` deliberately emits a bucket for every tier above the best non-empty one.
Because nothing reaches the top two tiers, nearly every query renders two dead rows, and a
degraded response renders **four**, roughly 500px of "No X results" before the first result.
Above them sit two redundant summary lines: a count line and a dump of all five tier
descriptions.

- Remove empty-bucket emission and the empty-bucket render branch.
- Collapse the two summary lines into one honest line.
- Delete `build-tier-bucket-model.ts` and `build-search-result-count-summary.ts` once C3 replaces
  their consumers, along with `empty-tier-bucket-messaging-smoke`.

**Chrome validation:** first result card is above the fold at 1440px; Phase 0 `/^No .* results$/`
assertion green; verify in both healthy and degraded modes.

**Verification gate:** `npm run verify`, `npm run ui-check`.

### PR C2 — stable page while searching

Measured timeline on production: at t=0 the body drops to **77 characters**, skeletons appear at
350ms, and the error surfaces at **7 seconds**. Cause: `SearchWrapper` unmounts the browse grid on
`searchQuery` while results are gated on `debouncedQuery`.

- Single owner for search state, derived from the committed query, so the grid never unmounts
  on an uncommitted keystroke.
- `placeholderData: keepPreviousData` so refetching keeps the previous results visible.
- Real error state with a retry action; drop the retry backoff that makes failure take 7s.
- Put the query in the URL so results are shareable and the back button works. This is currently
  impossible and is table stakes for a discovery product.

**Chrome validation:** re-run the exact timeline probe from the audit. Assert the body never
drops below the browse-grid baseline, and that a failure surfaces in under 2s.

**Verification gate:** `npm run verify`, `npm run ui-check` with a new no-blank-frame scenario.

### PR C3 — top hit plus one ranked list

Five relevance tiers rendered as coloured, icon-led accordions is not an intuitive breakdown; it
asks the user to understand our scoring model. The conventional pattern that works is a pinned
top hit plus a single ranked list.

- If an exact match exists, pin it as a distinct "Top match".
- Everything else renders as one ranked grid, no accordion, no icons, no colour-coded chips.
- Progressive disclosure for the tail: show the first rows, then "Show more".
- Keep `tier` internally for the top-hit decision and analytics; stop rendering it.

**Chrome validation:** best result visible without scrolling at 1440px and 390px; measure page
height against the current 4,777px baseline for `ai agents`.

**Verification gate:** `npm run verify`, `npm run ui-check`.

---

## Phase 4 — Deep research

Fully parallel with Phases 1 through 3.

### PR D1 — configurable provider with fallback

`deep-research-agent.ts:41` hardcodes `LLMProvider.OPENAI`, so deep research dies from the same
dead key that took down search. `@anthropic-ai/sdk`, `@google/genai` and provider modules for
both already exist and are unused on this path.

Drive the provider from config with an ordered fallback, and fail with a clear user-facing
message rather than a silent hang. Rebases the stale draft #33.

**Chrome validation:** requires a signed-in session. Trigger a run and confirm the timeline
reaches a first event; then force a provider failure and confirm a legible error instead of an
indefinite spinner.

**Verification gate:** `npm run verify`; one real end-to-end run recorded in the PR body.

### PR D2 — stop discarding completed domains

The orchestrator loops domains sequentially and `throw`s on the first failure, so a failure in
`founder_profile` discards `traction` entirely and the user gets nothing.

Collect per-domain results, mark failures, and return partial output. Persist per-domain status.

**Verification gate:** `npm run verify`; extend `research-orchestrator-mock-eval` to cover
partial failure, which is a genuine behavioural contract rather than a badge model.

### PR D3 — research viewer

- The empty state is a **600px** black box containing one line of text.
- "Founder Profile · not yet researched" and "· missing" chips advertise absence before the
  user has done anything.
- Debug badges leak `sig/src` counts and raw ISO timestamps.
- Stop is rendered disabled rather than hidden when there is nothing to stop.

Rebuild the empty state at an honest size with a single clear action, remove the absence chips
and debug badges, and split the 295-line component along its seams (timeline, coverage, viewer).

**Chrome validation:** empty, running, partial-failure and complete states screenshotted.

**Verification gate:** `npm run verify`, `npm run ui-check`.
Evals to delete with their subjects: `research-domain-signal-badge-tooltip-smoke`,
`research-viewer-run-badge-state-smoke`, `research-viewer-run-status-aria-smoke`,
`coverage-empty-state-discovery-smoke`, `coverage-active-tab-highlight-smoke`,
`timeline-jump-active-state-smoke`, `timeline-results-nav-always-visible-smoke`,
`timeline-domain-crosslink-affordance-smoke`, `missing-domain-prompt-gating-smoke`.
Keep `domain-coverage-matrix-smoke` and `present-domain-tab-parity-smoke` only if their
subjects survive D3.

---

## Phase 5 — Facets (net-new, cuttable)

The one capability that makes "result breakdown" genuinely intuitive. Relevance tiers describe
our scoring; facets describe the actual result set.

Derive counts from the response we already return (batch, industry, region, hiring) and render
them as clickable filters that compose with the existing filter pipeline. The filter vocabulary,
parser and SQL builder already exist and are well tested; this is a UI surface over them.

Cut this if the earlier phases take longer than expected. Nothing depends on it.

---

## Phase 6 — Close the loop

1. Delete the now-orphaned presentation-model files and consolidate the two relative-time
   helpers into one.
2. Add a design constraint to the harness prompt in `agent/harness/` before restarting
   `agent/local/watch.sh`: no new badges, tooltips, or score surfaces on a card or result row;
   any UI change must run `npm run ui-check`. Without this the badges regrow within a week.
3. Update `AGENTS.md` so `npm run ui-check` is part of the documented pre-PR gate.

---

## Sequencing

```
Phase 0 ──────────────────────────────────────────────► gates everything
   │
   ├── Phase 1  A3 → A4                (backend, stacked on #102)
   ├── Phase 2  B1, B2                 (parallel)
   ├── Phase 3  C1, C2 ──► C3          (C3 needs B1 + A3)
   └── Phase 4  D1, D2, D3             (parallel)
                    │
                    └── Phase 5 → Phase 6
```

Fifteen PRs including the two already shipped. Phase 0 first, then 1 through 4 can run
concurrently.

## Open items owned outside this plan

- Production `OPENAI_API_KEY` points at an inactive account. The same key name works locally, so
  it is a Vercel env var, not code. Phases 1 and 4 cannot be validated end to end until it is fixed.
- Draft PR #100 refactors the score badges that B1 deletes. Close, do not merge.
- `agent/local/watch.sh` stays paused until Phase 6 item 2 lands.
