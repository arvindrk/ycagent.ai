# Codex Autonomy Model

This repository has two autonomy layers.

## Layer 1: Harness

The harness defines how Codex agents work in the repo: rules, specialist personalities, local state, feature tracking, verification commands, and CI. This layer is active after the Codex swarm foundation PR is merged.

It does not create new work by itself.

## Layer 2: Continuation

Continuation starts when `.github/workflows/codex-continue-on-merge.yml` is present on `main` and the repository has:

- `OPENAI_API_KEY` configured as a GitHub Actions secret.
- `CODEX_GITHUB_TOKEN` configured as a fine-grained personal access token with repository contents and pull request write access.
- GitHub Actions workflow permissions set to allow read/write.
- GitHub Actions allowed to create pull requests.

On every push to `main`, the workflow:

1. Checks out the merged state.
2. Runs `openai/codex-action@v1` with `workspace-write` sandbox and read-only repository token permissions.
3. Produces a patch artifact.
4. Applies that patch in a separate job without the OpenAI key.
5. Opens a draft PR against `main` using the personal GitHub token.

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
