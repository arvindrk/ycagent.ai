# Codex Autonomy Model

This repository has two autonomy layers.

## Layer 1: Harness

The harness defines how Codex agents work in the repo: rules, specialist personalities, local state, feature tracking, verification commands, and CI. This layer is active after the Codex swarm foundation PR is merged.

It does not create new work by itself.

## Layer 2: Continuation

Continuation starts when `.github/workflows/codex-continue-on-merge.yml` is present on `main` and the repository has:

- `CODEX_AUTH_JSON` configured as a GitHub Actions secret: the contents of `~/.codex/auth.json` from a local `codex login` (ChatGPT-account auth, with `cli_auth_credentials_store = "file"`). This runs the loop on a ChatGPT subscription instead of a metered API key.
- `CODEX_GITHUB_TOKEN` configured as a fine-grained personal access token with repository contents and pull request write access.
- GitHub Actions allowed to create pull requests (or rely on `CODEX_GITHUB_TOKEN`, which bypasses that restriction).

On every push to `main`, the workflow:

1. Checks out the merged state.
2. Restores `CODEX_AUTH_JSON` into an ephemeral `CODEX_HOME` under `$RUNNER_TEMP` (600 perms, outside the repo working tree).
3. Runs the Codex CLI directly (`codex exec`) with the `workspace-write` sandbox and read-only repository token permissions.
4. Produces a patch artifact.
5. Applies that patch in a separate job that has no Codex credential.
6. Opens a draft PR against `main` using the personal GitHub token.

Token note: ChatGPT-account credentials refresh roughly every 8 days; on ephemeral runners the refreshed tokens are discarded after the job. As long as the refresh token in `CODEX_AUTH_JSON` stays valid this keeps working. If a run starts failing auth, regenerate `auth.json` locally and update the secret.

The system is autonomous at the point a merge to `main` triggers that workflow and it opens the next draft PR without a human prompt.

## Human Gates

Codex may create draft PRs. Humans must still approve irreversible actions:

- Merge to `main`
- Production deploy promotion
- Secret or environment changes
- Force-pushes
- Repository settings changes

## Operational Notes

- Use `[skip codex]` in a merge commit message to prevent continuation for that merge.
- If `CODEX_GITHUB_TOKEN` is absent, the workflow falls back to `GITHUB_TOKEN`; this may create the draft PR but can prevent downstream CI from triggering.
- Keep durable task state in `agent/feature_list.json`.
- Keep append-only handoff notes in `agent/PROGRESS.md`.
- Keep local/generated context in `agent/brain/`; it is git-ignored and separate from the Mercor Obsidian vault.
