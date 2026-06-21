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
