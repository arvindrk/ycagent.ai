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
