# Codex Autonomy Model

This repository has two autonomy layers.

## Layer 1: Harness

The harness defines how Codex agents work in the repo: rules, specialist personalities, local state, feature tracking, verification commands, and CI. This layer is active after the Codex swarm foundation PR is merged.

It does not create new work by itself.

## Layer 2: Continuation (local, terminal-bound)

Continuation runs on the maintainer's Mac, not in CI, and only while a foreground
watcher is running in Apple Terminal. Start it with `bash agent/local/watch.sh`
(Ctrl-C to stop). It is scoped to THIS repo only and polls `origin/main` every ~180s
(`WATCH_INTERVAL` to override). On a new merge SHA whose commit message lacks
`[skip codex]`, it:

1. Acquires a lock (`agent/brain/locks/`), then runs `agent/local/continue.sh`.
2. Creates a git worktree off `origin/main` under `.codex/worktrees/`.
3. Runs one headless Grok Build instance (`-m grok-build`, --permission-mode bypassPermissions,
   project .mcp.json for Ruflo MCP) that orchestrates via the Ruflo MCP (auto-discovered)
   and implements the next unblocked `feature_list.json` task.
4. If the worktree changed: commits, pushes `grok/continue-local-<ts>`, and opens a
   draft PR with `gh`.
5. Removes the worktree and records the SHA.

The system is autonomous (while the watcher runs) at the point a merge to `main`
triggers this loop and a draft PR is opened without a human prompt.

## Human Gates

The agent may create draft PRs. Humans must still approve irreversible actions:

- Merge to `main`
- Production deploy promotion
- Secret or environment changes
- Force-pushes
- Repository settings changes

## Operational Notes

- Use `[skip codex]` in a merge commit message to prevent continuation for that merge.
- The local loop pushes and opens draft PRs using the maintainer's local `gh` auth.
- Kill switch: stop the watcher (Ctrl-C in its Terminal, or close the window). Nothing runs when the watcher is not running.
- Token note: ChatGPT/Codex auth is no longer used; it runs on local Grok Build auth (grok login or XAI_API_KEY).
- Keep durable task state in `agent/feature_list.json`.
- Keep append-only handoff notes in `agent/PROGRESS.md`.
- Keep local/generated context in `agent/brain/`; it is git-ignored and separate from the Mercor Obsidian vault.
- Each continuation emits a structured event stream under `agent/brain/logs/runs/<id>/`; view it with `npm run logs` (see agent/local/logview/README.md).
