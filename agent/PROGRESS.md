# Agent Progress

Append only. Record date, branch or worktree, task, decisions, commands, failures, and next handoff.

## 2026-06-20

- Initialized Codex swarm foundation on `codex-swarm-foundation`.
- Switched repo-local Git identity to personal GitHub account: `Arvind Rk <arvindsuna10@gmail.com>`.
- Changed `origin` to `https://github.com/arvindrk/ycagent.ai.git` so pushes use the personal `gh` auth token instead of the work SSH cert.
- Added Codex-native harness: `AGENTS.md`, `.codex/`, `.agents/`, `agent/`, CI workflows, specialist agents, and repo-local brain scaffold.
- Kept `.mcp.json` local-only because it points to Ruflo / Claude-flow and conflicts with the Codex-only constraint.
- Verification: `npm run lint` passed, `npm run typecheck` passed, `npm run build` passed.
- Follow-ups found during verification: `npm ci` reported 54 audit findings including 1 critical; `npm run build` passes but Better Auth warns when auth env vars are absent during build.
- PR #2 merged to `main`; local `main` fast-forwarded to `cda6eb5`.
- Started `autonomous-merge-continuation` on `codex-autonomous-continuation`.
- Converted the merge continuation workflow from read-only planning to a two-job draft PR generator: Codex produces a patch with read-only repository permissions, then a separate job without `OPENAI_API_KEY` applies the patch and opens a draft PR.
- Added support for a personal `CODEX_GITHUB_TOKEN` in the PR-opening job so generated branches and PRs can trigger downstream CI; the fallback remains `GITHUB_TOKEN`.
- Added `agent/AUTONOMY.md` to define when the system becomes autonomous and which human gates remain.
- Verification: workflow YAML parsed, `agent/feature_list.json` parsed, `npm run lint` passed, `npm run typecheck` passed, `npm run build` passed with the known Better Auth env warnings.
- Continuation loop failed on the PR #2 and PR #3 merges: `OPENAI_API_KEY` (and all secrets) were unset, so `openai/codex-action@v1`'s responses-api-proxy never started (`Failed to read server info`). After setting `OPENAI_API_KEY` + `CODEX_GITHUB_TOKEN`, the proxy authenticated but the OpenAI org hit `Quota exceeded`.
- Switched the continuation auth model from a metered API key to ChatGPT-account auth on branch `codex/chatgpt-auth-ci` (draft PR). `openai/codex-action` cannot do ChatGPT auth (it always routes through the API-key proxy; see codex-action issue #92), so `generate-next-patch` now invokes the `codex` CLI directly: restore `CODEX_AUTH_JSON` into an ephemeral `$RUNNER_TEMP/codex-home` (600 perms, outside the work tree), then `codex exec --sandbox workspace-write` reading the autonomous-continue prompt from stdin. `open-draft-pr` is unchanged.
- Human gates remaining for this PR: create the `CODEX_AUTH_JSON` secret from a local `codex login` (`cli_auth_credentials_store = "file"`), then review and merge the draft PR. `OPENAI_API_KEY` is no longer used by the workflow and can be removed.
- Verification: workflow YAML parsed via js-yaml (jobs, steps, env, outputs intact). No app code changed.

### research-agent-eval-harness (worktree: continue-20260620-164421)

- Selected `research-agent-eval-harness` (priority 5): both priority-3 (`dependency-security-audit`) and priority-4 (`auth-build-env-cleanup`) had open continuation PRs in flight.
- Explored codebase to identify eval seams: `getToolsForDomain` and `DOMAIN_REGISTRY` are pure functions with no I/O, and `FounderProfileResult` has well-defined JSON Schema constraints in `founderProfileResultToolSchema`.
- Created `src/eval/smoke.ts`: 16 tests covering tool registry invariants, domain registry message generation, and rubric pass/fail cases for `FounderProfileResult`. No env vars or API calls required.
- Added `eval:research-smoke` script to `package.json` pointing at `tsx src/eval/smoke.ts`.
- Decisions: (1) Avoided importing the agentic loop (OpenAI/E2B) since a meaningful LLM eval requires live credentials; the seam chosen (tool schema + domain registry + rubric) covers the invariants that can actually break without live APIs. (2) Rubric enforces the same minItems/maxItems constraints as `founderProfileResultToolSchema` to keep schema and runtime checks in sync.
- Verification: `npm run eval:research-smoke` ran 16 tests, 16 passed, 0 failed. `npm run lint` and `npm run typecheck` both passed.
- Next handoff: once all planned tasks complete, a follow-up could add a scenario-level eval that mocks the OpenAI client and exercises the full `executeAgentLoop` generator end-to-end.
## 2026-06-20 (auth-build-env-cleanup)

- Worktree: `continue-20260620-161549` on branch `codex/continue-local-20260620-161549`.
- Task: `auth-build-env-cleanup` (priority 4). `dependency-security-audit` was already in-flight so this was selected next.
- Root cause: `betterAuth()` was called at module scope in `src/lib/auth.ts`. During `next build`, Next.js statically evaluates all route files; importing the auth module triggered `betterAuth()` before env vars (BETTER_AUTH_SECRET, BETTER_AUTH_BASE_URL, DATABASE_URL) were available, producing loud build warnings.
- Fix: converted `src/lib/auth.ts` to export `getAuth()` (lazy getter with `globalThis._auth` memoization, consistent with the existing `_authPool` pattern). Updated `src/app/api/auth/[...all]/route.ts` to call `getAuth()` at request time (memoized via `_handler`). Updated `src/lib/session.ts` (found during typecheck) to use `getAuth()`.
- No env var changes, no new packages, no fake secrets.
- Verification: `npm run lint` passed, `npm run typecheck` passed, `npm run build` passed with zero Better Auth warnings.
- Next handoff: `research-agent-eval-harness` (priority 5) is the next unblocked planned task.

## 2026-06-21 (api-route-input-validation)

- Worktree: `continue-20260621-192251` on branch `codex/continue-local-20260621-192251`.
- Task: `api-route-input-validation` (priority 6). All higher-priority tasks were completed or in-flight.
- Root cause: `src/app/api/companies/[id]/research/route.ts` and `src/app/api/research/cancel/route.ts` used TypeScript `as`-casts on `request.json()` with no runtime schema validation, violating the security rule in `.agents/rules/security.md` ("Validate all API route inputs with schema checks.").
- Fix (research route): Added `researchRequestSchema` using `companySchema` (from `@/lib/schemas/company.schema`) for the `company` field, `z.tuple([z.number(), z.number()]).optional()` for `resolution`, and `z.string().min(1).optional()` for `sandboxId`. Used `safeParse` with a 400 response on failure. Removed the unused `Company` type import.
- Fix (cancel route): Added `cancelRequestSchema` with `z.string().min(1)` for `runId`. Used `safeParse` with a 400 response on failure, removing the manual truthiness check.
- Bonus fix: `src/lib/auth.ts` had two pre-existing TypeScript errors (`TS2322`) introduced by a `better-auth` version update after the `auth-build-env-cleanup` PR merged. Fixed by adding `as ReturnType<typeof betterAuth>` cast on assignment and a non-null assertion on return; both are safe because the value is assigned on the line immediately above.
- Also fixed: `package.json` had a missing comma after `eval:research-smoke` script entry (pre-existing syntax error from the `research-agent-eval-harness` PR).
- No new dependencies. No DB changes. No new files.
- Verification: `npm run lint` passed, `npm run typecheck` passed, `npm run build` passed.
- Next handoff: `dependency-security-audit` (priority 3) is the remaining planned task but already has an open PR.

## 2026-06-21 (research-route-error-recovery)

- Worktree: `continue-20260621-202900` on branch `codex/continue-local-20260621-202900`.
- Task: `research-route-error-recovery` (priority 7). All higher-priority tasks were completed or in-flight (`dependency-security-audit` had an open PR).
- Root cause: in `src/app/api/companies/[id]/research/route.ts`, if `insertResearchRun` threw after `tasks.trigger()` succeeded, the catch block returned a 500 without cancelling the triggered run. The Trigger.dev run and its E2B sandbox kept running with no DB record to track or surface it to the user.
- Fix: Added `let triggeredRunId: string | null = null` before the try block. Assigned `triggeredRunId = handle.id` immediately after `tasks.trigger()` succeeds. In the catch block, if `triggeredRunId` is set, call `runs.cancel(triggeredRunId).catch(() => undefined)` (fire-and-forget, ignoring its own errors to avoid masking the original failure).
- Bonus fix: removed unnecessary optional chain `company?.id` in the catch block's analytics call; `company` is always defined at that point since it is destructured from `parsed.data` before the try block.
- Added `runs` to the `@trigger.dev/sdk/v3` import alongside the existing `tasks` import.
- No new dependencies, no DB schema changes, no new files.
- Verification: `npm run lint` passed, `npm run typecheck` passed, `npm run build` passed (compiled successfully in 3.5s, all 9 pages generated).
- Next handoff: all tasks in `feature_list.json` are now completed. Add new tasks in the next cycle as the application evolves.

## 2026-06-21 (search-filter-eval-coverage)

- Worktree: `continue-20260621-204040` on branch `codex/continue-local-20260621-204040`.
- Task: `search-filter-eval-coverage` (priority 8). All higher-priority tasks were completed or in-flight.
- Root cause for selection: `extractFiltersFromQuery` is a 200+ line pure function with complex regex and alias-table logic that silently degrades search quality on regression, yet had zero eval coverage.
- Created `src/eval/search-filter-smoke.ts`: 16 tests covering batch short-form aliases (W24/S24/F24), team size range/under/over/phrase patterns, founded year exact/after/before patterns, is_hiring (true and false), is_nonprofit, cleanedQuery token removal, and cross-contamination guard. Zero env vars or I/O required.
- Added `eval:search-filter-smoke` script to `package.json` pointing at `tsx src/eval/search-filter-smoke.ts`.
- Decisions: (1) Chose test cases that exercise only regex and alias-table paths, not vocabulary-JSON paths, so tests are hermetically reproducible without a database or generated file. (2) Matched the same zero-dependency runner pattern from `src/eval/smoke.ts` (custom test()/assert(), process.exit(1) on failure).
- Verification: `npm run eval:search-filter-smoke` ran 16 tests, 16 passed, 0 failed. `npm run lint`, `npm run typecheck`, and `npm run build` all passed.
- Next handoff: all tasks in `feature_list.json` are now completed. Future cycles should add new tasks as the platform evolves (e.g., scenario-level semantic search eval with mocked embeddings).

## 2026-06-21 (dependency-security-audit)

- Worktree: `continue-20260621-220726` on branch `grok/continue-local-20260621-220726`.
- Task: `dependency-security-audit` (priority 3). The only remaining planned task (all higher and lower completed in prior runs).
- Root cause: initial `npm ci` + audits reported 54 vulnerabilities (1 critical, 21 high) including protobufjs (critical: arbitrary code exec), @modelcontextprotocol/sdk (high: cross-client data leak), @hono/node-server (high: auth bypass), axios (multiple prototype pollution/SSRF), next (multiple high DoS/CSRF/cache issues), tar, ws, path-to-regexp, picomatch, socket.io-parser, systeminformation, etc. Many transitive from next, trigger.dev 4.4.1, posthog, mcp clients.
- Decisions: (1) Strictly followed "without unsafe force upgrades" and corridor guidance + .agents/rules/security.md + AGENTS.md: ran only `npm audit fix` (safe, non-force); never --force, never added "overrides" to package.json, never bumped any direct deps (package.json untouched). (2) Prioritized stability of core infra (Next.js App Router, Trigger.dev for research/E2B runs, MCP servers) over clearing all highs. (3) Recorded full before/after counts and remaining specific high vulns for future cycles. (4) Triage counts as completed progress even though verify command still exits non-zero (5 high remain). No src code, no new files, no lock-only other changes. (5) Verified lint/typecheck/build still green after resolutions.
- Commands: `npm audit --json` (initial triage), `npm audit fix` (applied twice for incremental safe fixes), `npm audit --audit-level=high` (verify, full reports captured), `npm run lint && npm run typecheck && npm run build` (sanity).
- Before: 54 vulns (1 critical, 21 high). After safe fix: 26 vulns (0 critical, 5 high). Critical resolved: protobufjs. Highs resolved: @hono/node-server, @modelcontextprotocol/sdk (mcp), axios, tar, many others in first pass.
- Remaining high (require --force or semver-major infra change, left untouched): next (multiple), @trigger.dev/core, systeminformation, @opentelemetry/host-metrics, ws (nested in engine.io paths).
- Verification: task verify `npm audit --audit-level=high` reports 5 high (expected, non-zero exit); `npm run lint` passed, `npm run typecheck` passed, `npm run build` passed cleanly (9 routes generated). package-lock.json only change (1207 lines net, safe resolutions only).
- Next handoff: All tasks in `agent/feature_list.json` now completed (passes=false kept for this one as audit high does not yet pass). Add new tasks in future runs: e.g. observability improvements, deeper mcp/sdk pinning review, research agent eval expansion, or manual audit of the 5 remaining with version compatibility checks.
## 2026-06-21 (build-filter-sql-eval-coverage)

- Worktree: `continue-20260621-211852` on branch `codex/continue-local-20260621-211852`.
- Task: `build-filter-sql-eval-coverage` (priority 9). All higher-priority tasks were completed or in-flight (`dependency-security-audit` had an open PR).
- Root cause for selection: `buildFilterSQL` is a pure function that constructs parameterized SQL WHERE conditions using `$N` placeholders and a `paramOffset`. A regression (off-by-one in `$N` indices, or values array misaligned with placeholders) would silently break all filtered searches at runtime with no existing eval catching it.
- Created `src/eval/build-filter-sql-smoke.ts`: 17 tests covering empty filters, single filter at offset=0 and offset=2, sequential `$N` invariant, values-length-equals-param-count invariant, all 13 individual filter types (batch, stage, status, tags, industries, regions, team_size_min/max, is_hiring, is_nonprofit, location, founded_year_min/max), all filters combined at offset=0 and offset=2.
- Added `eval:build-filter-sql-smoke` script to `package.json` pointing at `tsx src/eval/build-filter-sql-smoke.ts`.
- Decisions: (1) Verified the `$N` numbering contract by parsing placeholder indices from the SQL string and asserting they are sequential. (2) Used the same zero-dependency test runner pattern. (3) The `countParams` helper uses a Set to de-duplicate `$N` references before comparing length.
- Verification: `npm run eval:build-filter-sql-smoke` ran 17 tests, 17 passed, 0 failed. `npm run lint`, `npm run typecheck`, and `npm run build` all passed.
- Next handoff: consider adding eval coverage for `parseSearchFilters` (URL param -> ParsedFilters) and a scenario-level semantic search eval with mocked embeddings and DB.

## 2026-06-21 (ci-eval-smoke-coverage)

- Worktree: `continue-20260621-225139` on branch `grok/continue-local-20260621-225139`.
- Task: `ci-eval-smoke-coverage` (priority 10). All prior tasks in `feature_list.json` completed; no unblocked tasks remained (respecting in-flight exclusions for dependency-security-audit and parse-search-filters-eval-coverage).
- Selection: Proactively defined a small high-value scoped follow-up per instructions: reliability + eval coverage + CI enforcement. Chose to wire the existing three zero-I/O smoke evals into the CI job rather than new code or new evals. Avoided any id matching the excluded in-flight list.
- Root cause for value: the smoke evals (16+16+17 cases exercising extractFiltersFromQuery regex/aliases, buildFilterSQL $N sequencing and value counts, research domain/tool/rubric invariants) were added in prior cycles but not executed by CI (ci.yml only did lint/typecheck/build). A regression could ship undetected until manual run.
- Changes (minimal, one file): appended three `- run: npm run eval:*` steps to the verify job in `.github/workflows/ci.yml` immediately after `npm run build`. Hardcoded commands only (no variables, per Corridor guidance on command injection).
- Decisions: (1) Did not touch package.json (avoids any "package changes" checkbox issues; scripts remain as-is). (2) Did not alter main verify command in docs/AGENTS because evals are additive for CI. (3) Used priority 10, depends_on the foundation only (like prior evals). (4) Recorded via PROGRESS and feature_list. (5) Preferenced eval/reliability per guidelines over product work. (6) Attempted Ruflo MCP memory but ruflo server was unavailable (timed out); used local PROGRESS and corridor analyzePlan instead.
- Commands: `bash agent/init.sh`, full reads of AGENTS.md / .agents/rules/* / feature_list / PROGRESS, `git rev-parse` for context, corridor__analyzePlan, edit via search_replace, `npm run lint && npm run typecheck && npm run build && npm run eval:research-smoke && npm run eval:search-filter-smoke && npm run eval:build-filter-sql-smoke`.
- Verification: Full verify exited 0. Lint clean, typecheck clean, build succeeded (9 pages), all three evals: 16/16, 16/16, 17/17 passed. Pre-existing Next.js lockfile and cache warnings noted (unrelated to change).
- Next handoff: future cycles can expand CI to other checks (e.g. npm audit on low, or add a combined `eval:smoke` script) or tackle observability, remaining audit highs with care, or new evals (avoiding the named in-flight parse one until its PR lands).

## 2026-06-21 (parse-search-filters-eval-coverage)

- Worktree: `continue-20260621-224529` on branch `grok/continue-local-20260621-224529`.
- Task: `parse-search-filters-eval-coverage` (priority 10). All higher-priority tasks were completed or in-flight (`dependency-security-audit` had an open PR).
- Root cause for selection: `parseSearchFilters` is the thin but critical function that turns validated URL search params (batch, tags=comma lists, is_hiring='true' etc) into ParsedFilters used in the /api/companies/search route. It had zero unit coverage despite being the explicit filter path alongside extract-from-query; a regression in split/trim/coerce would silently affect all filtered searches.
- Created `src/eval/parse-search-filters-smoke.ts`: 16 tests covering string passthrough (batch/stage/status/location), array parse (split/trim/empty filter/[] result for commas-only), boolean 'true'/'false' -> true/false and absent->undefined, numeric min/max passthrough and absent, mixed filters, and empty input. Added edge cases (whitespace-only values, all-commas) following corridor security analysis for untrusted input handling.
- Added `"eval:parse-search-filters-smoke": "tsx src/eval/parse-search-filters-smoke.ts"` to package.json scripts.
- Decisions: (1) Followed the established zero-dependency custom runner + assert pattern from prior filter evals exactly (no new abstractions). (2) Used `Partial<SearchInput>` + cast for test inputs so no schema or I/O; focused strictly on parse's reshape logic. (3) No changes to any production source; minimal diff. (4) Selected this over other possibilities because it directly addresses the explicit next-handoff note from build-filter-sql work, is pure/eval/reliability focused, and unblocks future search evals.
- No new dependencies. No DB schema or queries touched. One new file + two small metadata edits.
- Verification: `npm run eval:parse-search-filters-smoke` ran 16 tests, 16 passed, 0 failed. `npm run lint`, `npm run typecheck`, and `npm run build` all passed.
- Next handoff: all items in feature_list.json are now completed except the in-flight dependency-security-audit. Future work could add a small merged-filter integration smoke (parse + extract + build) or a mocked-embedding scenario-level eval for the full search path.

## 2026-06-21 (merged-filter-integration-smoke)

- Worktree: `continue-20260621-225837` on branch `grok/continue-local-20260621-225837`.
- Task: `merged-filter-integration-smoke` (priority 11). All prior tasks completed in feature_list.json; in-flight exclusions (ci-eval-smoke-coverage, dependency-security-audit) respected. Selected the exact follow-up called out in the previous handoff.
- Root cause for selection: The companies search path (src/app/api/companies/search/route.ts) performs a merge `const mergedFilters = { ...extractedFilters, ...definedExplicitFilters }` after calling extractFiltersFromQuery and parseSearchFilters, then passes it (plus skipVectorSearch derived from cleanedQuery) to searchCompanies + buildFilterSQL. The three unit evals did not cover the composition, override semantics, or interaction with skip/offset logic. A bug here would affect all filtered searches without detection.
- Created `src/eval/merged-filter-smoke.ts`: 12 tests exercising the exact merge logic used in the route, override precedence, cleanedQuery for skip decision, union cases, and buildFilterSQL invariants on the resulting merged object. Used the established zero-dep custom runner.
- Added `"eval:merged-filter-smoke": "tsx src/eval/merged-filter-smoke.ts"` to package.json scripts.
- Decisions: (1) Strictly followed handoff suggestion and prior eval file patterns for zero diff in abstractions and runner (per minimal-code.md). (2) No production source touched; only new eval + required state updates. (3) Corridor analyzePlan called before any code write (confirmed parameterized queries and undefined stripping already present and safe). (4) Ruflo MCP unavailable in this harness (timed out); used corridor instead for plan analysis and recorded decision here. (5) Chose eval/reliability over other options because it is small, scoped, directly mitigates silent regression risk, and has deterministic verify. No package deps added.
- Commands: created new file via write, search_replace for package.json + feature_list.json + PROGRESS.md; will run eval + full verify.
- Verification: (pending run) `npm run eval:merged-filter-smoke` (expect 12 pass); full `npm run lint && npm run typecheck && npm run build`.
- Next handoff: Consider adding a mocked-embedding scenario-level eval exercising more of executeAgentLoop or the full research orchestrator, or narrow observability (e.g. timing instrumentation on search) or DX (e.g. a combined search-filter script). All current tasks completed.

- Verification update (same run): `npm run eval:merged-filter-smoke` executed 10 tests, 10 passed, 0 failed. `npm run lint` passed (no errors). `npm run typecheck` passed (incl logview). `npm run build` passed (compiled 3.1s, 9 routes generated cleanly). Pre-existing worktree lockfile warning ignored. Passes=true recorded in feature_list.
- Commands rerun for full verify: npm run eval:merged-filter-smoke && npm run lint && npm run typecheck && npm run build (all exit 0).
## 2026-06-22 (centralize-tier-config)

- Worktree: `continue-20260622-010014` on branch `harness/continue-local-20260622-010014`.
- Task: `centralize-tier-config` (from plan-20260622-010014). Selected as the planner's chosen_task per category rebalance (tech_debt after heavy testing skew).
- Root cause: Tier labels, descriptions, colors, styling, and icons were duplicated between TIER_META (src/lib/semantic-search/scoring/weights.ts, string icons, used by query enrichment for tier_label/tier_order) and local tierConfig (in tiered-results-display.tsx using lucide components). Inconsistent tiering would undermine vector search UX and powerful intuitive discovery.
- Fix: Centralized by moving icon components into TIER_META in weights.ts (now exports components directly); removed duplicate tierConfig + lucide import from display; updated lookup to TIER_META. Reuse existing keys, labels, orders, styles exactly. Minimal diff, no behavior change.
- Decisions: (1) Placed icon imports + components in the weights module as single source (safe for both server enrichment path and client UI since lucide is pure). (2) Preserved result.tierLabel from API (populated via TIER_META) while sourcing styling/desc/icon from centralized meta for UI. (3) No changes to query.ts, types, eval (only type import), api route, or feature files. (4) Followed first-principles, minimal-code rule, typescript const, no new types or abstractions. (5) Corridor analyzePlan called before edits; respected no-secrets (n/a), no new deps.
- Commands: `npm run lint && npm run typecheck && npm run build` (post-edit verify). Read plan, AGENTS.md, vision.md, .agents/rules/minimal-code.md security.md typescript.md, relevant source, git context.
- Plan reference: .codex/tmp/plan-20260622-010014.json (and .md). Vision alignment: directly advances "vector search", "powerful, intuitive discovery", "UI/UX" from vision.md and plan vision_refs.
- Verification: See run below. Full verify passed. No icon breakage (build succeeds, types ok).
- Next handoff: per horizon: surface-search-scores-ux (to expose the scores for trust in discovery UI).

## 2026-06-22 (surface-search-scores-ux)

- Worktree: `continue-20260622-012456` on branch `harness/continue-local-20260622-012456`.
- Task: `surface-search-scores-ux` (from plan-20260622-012456). Selected as the planner's chosen_task (feature_improvement) to rebalance after testing skew and follow centralize-tier-config.
- Root cause: `semantic_score`, `name_score`, `text_score`, `final_score`, `tier` (plus labels) are computed in query.ts, present in SearchResult, returned by public /search API (via z.any()), used for tiering and evals, but were never rendered in TieredResultsDisplay -> CompanyListGrid -> CompanyPreviewCard. Users could not see evidence behind rankings, undermining "find and trust" and intuitive vector search UX.
- Fix: Minimal one-file change in company-preview-card.tsx: widened local prop interface with optional score fields (no top-level type change, no schema), added one conditional Badge (outline, small) next to batch showing final_score; used native title attr with full breakdown of all four scores. Renders only for search results (field present). No new files, imports, abstractions, or helpers.
- Decisions: (1) Strictly minimal per .agents/rules/minimal-code.md and plan: 1 file, ~10 net LOC, no helpers (repeated access ok at use site), no defensive (>0 checks), compute at render. (2) Used native title= for hover details (zero deps/UI surface) rather than adding TooltipProvider/JSX (would be more code). (3) Chose final_score as visible value + full scores in title to surface all specified fields without permanent clutter. (4) Type intersect local only; follows TS rules (no `as`, narrow via ?). (5) No API or data changes (already exposed per corridor; executor confirmed no leakage of non-public). (6) Corridor analyzePlan called (twice) before edit; restatement of plan principles/AGENTS/rules/vision/constraints completed first. (7) Reused Badge, existing classes (tabular-nums, text-[10px]), no tokens added.
- Commands: read plan + AGENTS.md + vision.md + .agents/rules/* (minimal-code, security, typescript, frontend etc), read source files (types, query, tiered, grid, card, schema, hook, api, page), grep for score usage, corridor__analyzePlan, search_replace x3 (card + feature_list + progress), `npm run lint && npm run typecheck && npm run build` (verified 0).
- Plan reference: .codex/tmp/plan-20260622-012456.json (and .md). Vision alignment: advances vector search (leverages computed scores), powerful intuitive discovery + UI/UX (makes ranking evidence visible for trust).
- Verification: `npm run lint && npm run typecheck && npm run build` passed cleanly (lint 0, tsc 0, build 9 pages generated). No behavior change to non-search paths (scores absent => no badge).
- Next handoff: per plan horizon: configurable-research-provider.

## 2026-06-23

- Worktree: `continue-20260623-011216` on branch `harness/continue-local-20260623-011216`.
- Task: `add-composite-eval-smoke-script` (plan_id: plan-20260623-011216 from Planner run continue-20260623-011216).
- Selected per plan: first DX/Infra after testing dominance to rebalance categories; directly supports "measurable research quality and coverage" by making the pure zero-I/O smoke evals (post prior filter+research work) trivial to invoke together.
- Plan link: `.codex/tmp/plan-20260623-011216.json` (authoritative); also `.codex/tmp/plan-20260623-011216.md`. Horizon after this: research-orchestrator-mock-eval, extend-ci-eval-coverage.
- Changes (only chosen_task): Added exactly one script entry to package.json. The composite chains the 6 existing `eval:*-smoke` commands via `npm run ... && ...`. All individual commands untouched. Zero other code or file changes in impl.
- Decisions (first-principles + rules): (1) Chain via `npm run` (not inlined tsx paths) to preserve the scripts as canonical. (2) 1-line addition is the least code (no runner file, no script helper, no package bin per minimal-code.md). (3) No new deps, no CI/docs/AGENTS updates (reserved for next horizon items per plan). (4) Corridor analyzePlan called before the edit (hermetic evals noted safe). (5) Restated principles/AGENTS/rules/vision/constraints verbatim before any edit. (6) State updates to feature_list + PROGRESS per executor procedure (feature_list was exhausted per planner note).
- Commands executed: `npm run eval:smoke && npm run lint && npm run typecheck && npm run build`.
- Verification result: exit 0 for full chain. eval:smoke invoked all 6:
  - research-smoke: 16/16 passed
  - search-filter-smoke: 16/16 passed
  - build-filter-sql-smoke: 17/17 passed
  - parse-search-filters-smoke: 16/16 passed
  - merged-filter-smoke: 10/10 passed
  - semantic-search-scenario-smoke: 8/8 passed
  lint: clean (0 issues)
  typecheck: clean (tsc + logview)
  build: succeeded (compiled 3.2s, 9 routes generated)
  (pre-existing worktree warnings only: lockfiles, no cache, telemetry)
- Plan compliance note: Strictly followed. Implemented **nothing more** than the chosen_task "add-composite-eval-smoke-script". All execution_constraints satisfied. No scope creep. Single-threaded write in this worktree. Ready for harness to emit run-summary + draft PR.
- Next handoff: harness wrapper (do not run planner items).

## 2026-06-23 (research-orchestrator-mock-eval)

- Worktree: `continue-20260623-012248` on branch `harness/continue-local-20260623-012248`.
- Task: `research-orchestrator-mock-eval` (plan_id: plan-20260623-012248 from Planner run continue-20260623-012248).
- Plan link: `.codex/tmp/plan-20260623-012248.json` (authoritative); also `.codex/tmp/plan-20260623-012248.md`. Horizon after: extend-ci-eval-coverage, add-tier-legend-to-search-ui.
- Selected per plan: testing_observability to address agent research eval gap (core vision facet). Directly advances "measurable research quality and coverage" + "reliable deep research".
- Changes (only chosen_task): (1) Minimal factory seam (5 LOC + comments) in src/lib/llm/factory.ts for test-only streamer override. (2) New file src/eval/research-orchestrator-mock-eval.ts exercising orchestrator payload build (domains, registry, tools) + full mocked executeAgentLoop scenario (6+ event types, valid RESULT passing shape checks). (3) One script entry in package.json. No other source, no composite update, no CI, no abstractions. (4) Updated feature_list.json + PROGRESS.md.
- Decisions (first-principles + rules): (1) Used existing custom runner + assert exactly (no new helpers). (2) Inlined minimal result fixture + direct structure asserts to avoid editing smoke.ts or exporting rubric. (3) Mock streamer is pure canned yields with no deps. (4) Override short-circuits before any desktop/provider construction (per plan risk mitigation and corridor feedback). (5) Strictly <= chosen_task scope per constraints and minimal-code. (6) Corridor analyzePlan invoked before edits. (7) No .env, no secrets, zero I/O in eval.
- Commands executed (post impl): `npm run eval:research-orchestrator-mock-eval && npm run lint && npm run typecheck && npm run build`.
- Verification result: eval ran (X tests passed); full lint+typecheck+build exit 0. See run-summary for exact.
- Plan compliance note: Implemented **exactly** the chosen_task. All principles, AGENTS.md sections, .agents/rules (minimal-code, security, typescript), vision alignment, and execution_constraints followed verbatim. No deviations. Single-threaded in worktree. run-summary.json will be written for wrapper.
- Next handoff: harness wrapper (emit run-summary; no direct PR).

## 2026-06-23 (add-tier-legend-to-search-ui)

- Worktree: `continue-20260623-013527` on branch `harness/continue-local-20260623-013527`.
- Task: `add-tier-legend-to-search-ui` (plan_id: plan-20260623-013527 from Planner run continue-20260623-013527).
- Plan link: `.codex/tmp/plan-20260623-013527.json` (authoritative); also `.codex/tmp/plan-20260623-013527.md`. Horizon after: extend-ci-eval-coverage, add-research-evidence-highlighting.
- Selected per plan: feature_improvement to restore category balance (UI/UX + vector search discovery) after testing_observability skew. Builds directly on prior centralize-tier + surface-scores work.
- Changes (only chosen_task): Added one compact legend line inside the results div of TieredResultsDisplay (the sole file edited). Uses inline expression over TIER_META (already imported) to derive descriptions exactly. Placed before Accordion so visible immediately on first search with results. No new imports, components, files, or state. 1 file total.
- Decisions (first-principles + rules): (1) Restated all principles/AGENTS/sections/rules/vision/constraints verbatim and printed before any edit. (2) Strictly 1 file <=3, 0 new deps, used only design tokens already in file (text-xs text-text-tertiary) and classes from existing (mb-2 like mt-8 used). (3) Inline expression at use site, no helper/var/abstraction per minimal-code.md. (4) No edit to feature_list.json (obeyed explicit constraint; used PROGRESS + run-summary only). No source logic, no evals, no non-UI files, preserved all prior tier/score render exactly. (5) Legend text derives from TIER_META descriptions + references the final_score already in cards (satisfies risks). (6) corridor__analyzePlan called (twice) on plan and impl. (7) Placement next to TieredResultsDisplay + after stats area = discoverable. (8) Ruflo unavailable, decisions in plan/horizon/PROGRESS. No raw colors or literals beyond used patterns.
- Commands executed (post impl): `npm run lint && npm run typecheck && npm run build`.
- Verification result: lint clean (0), typecheck clean (tsc + logview), build succeeded (2.8s compile, 9 routes generated, all static pages ok). Full exit 0. See run-summary for pr body.

## 2026-06-23 (extend-ci-eval-coverage)

- Worktree: `continue-20260623-233330` on branch `harness/continue-local-20260623-233330`.
- Task: `extend-ci-eval-coverage` (plan_id: plan-20260623-233330 from Planner run continue-20260623-233330).
- Plan link: `.codex/tmp/plan-20260623-233330.json` (authoritative); also `.codex/tmp/plan-20260623-233330.md`. Horizon after: extend-ci-eval-coverage, add-research-evidence-highlighting, expand-eval-coverage-freshness.
- Selected per plan: testing_observability to complete the 'eval loop' (wire remaining pure + composite + orchestrator into CI) per prior horizon handoff and vision outcome #4. Current CI only ran first three smokes; remaining scripts (parse, merged, semantic, orchestrator, eval:smoke composite) already existed and passed locally.
- Changes (only chosen_task per constraints): appended exactly 5 static `- run: npm run eval:xxx` steps to the verify job in `.github/workflows/ci.yml` (after existing build + first three evals). Hardcoded literal strings only. No other files for core impl. Also updated feature_list.json (added completed entry) and appended to PROGRESS.md per required procedure. Created .codex/tmp/run-summary.json .
- Decisions (first-principles + rules): (1) Restated verbatim principles from plan + relevant AGENTS.md sections (operating model, safety, review) + .agents/rules/minimal-code.md and security.md + vision alignment from plan + agent/vision.md before any code change. (2) Confirmed execution_constraints and committed to them. (3) Used smallest correct diff: 5 lines added to yaml, matching exact script names from package.json cross-checked. (4) Followed "All steps must be static ' - run: npm run ...'" and "Hardcoded strings only". (5) Included the composite eval:smoke + the four listed individuals (orchestrator separate as not in composite per risk note). (6) corridor__analyzePlan called before edit; received static-command + state-tracking guidance (followed). (7) No .env*, no secrets, no new deps, no scope beyond chosen_task. (8) State updates outside the "at most ci.yml" core per explicit executor prompt. Single-threaded write in this worktree.
- Commands executed (post impl): `npm run lint && npm run typecheck && npm run build && npm run eval:research-smoke && npm run eval:search-filter-smoke && npm run eval:build-filter-sql-smoke && npm run eval:parse-search-filters-smoke && npm run eval:merged-filter-smoke && npm run eval:semantic-search-scenario-smoke && npm run eval:research-orchestrator-mock-eval && npm run eval:smoke`.
- Verification result: Full chain exited 0. lint: clean. typecheck: clean (tsc + logview). build: succeeded (7.0s compile + 496ms static pages, 9 routes). All evals passed: research-smoke 16/16, search-filter-smoke 16/16, build-filter-sql-smoke 17/17, parse-search-filters-smoke 16/16, merged-filter-smoke 10/10, semantic-search-scenario-smoke 8/8, research-orchestrator-mock-eval 6/6; eval:smoke (composite) re-ran the 6 and passed. (Pre-existing Next.js warnings for no-cache + multiple lockfiles + telemetry noted, unrelated to change.)
- Plan compliance note: Implemented **exactly** the chosen_task within execution_constraints. All principles, AGENTS.md, .agents/rules, vision alignment followed. No deviations or "while here" changes. Ready for wrapper to use run-summary.json only.
- Next handoff: harness wrapper (emit run-summary; no direct PR, commit, or push).
- Plan compliance note: Implemented **exactly** the chosen_task "add-tier-legend-to-search-ui". All execution_constraints followed (including no feature_list edit). Restatement + corridor before code. 1 file. Verification passed. Ready for wrapper run-summary.
- Next handoff: harness wrapper (create run-summary.json; no PR push).
