# Agent Harness Autonomy Model (provider agnostic)

This repository has two autonomy layers.

## Layer 1: Harness

The harness defines how autonomous agents (any provider: Grok, Claude, etc.) work in the repo: rules, specialist personalities, local state, feature tracking, verification commands, and CI. This layer is active after the initial harness foundation.

It does not create new work by itself.

## Layer 2: Continuation (local, terminal-bound)

Continuation runs on the maintainer's Mac, not in CI, and only while a foreground
watcher is running in Apple Terminal. Start it with `bash agent/local/watch.sh`
(Ctrl-C to stop). It is scoped to THIS repo only and polls `origin/main` every ~180s
(`WATCH_INTERVAL` to override). On a new merge SHA whose commit message lacks
a skip marker (`[skip harness]`, `[skip codex]`, etc.), it:

1. Acquires a lock (`agent/brain/locks/`), then runs `agent/local/continue.sh`.
2. Creates a git worktree off `origin/main` under `.codex/worktrees/`.
3. Runs a headless agent instance (configurable via AGENT_CMD/AGENT_MODEL or harness-config.json; supports Grok, Claude, etc.) using the appropriate prompt(s) in agent/harness/ (or legacy continue-prompt.md) that orchestrates via Ruflo MCP (auto-discovered) and implements the next unblocked `feature_list.json` task (now via separate planner + executor runs when using the new prompts).
4. If the worktree changed: commits, pushes `harness/continue-local-<ts>` (or legacy grok/codex prefix), and opens a draft PR with `gh`.
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

- Use `[skip harness]` (or legacy `[skip codex]`) in a merge commit message to prevent continuation for that merge.
- The local loop pushes and opens draft PRs using the maintainer's local `gh` auth.
- Kill switch: stop the watcher (Ctrl-C in its Terminal, or close the window). Nothing runs when the watcher is not running.
- Token/CLI note: The harness is provider-agnostic. Configure via AGENT_CMD (e.g. grok, claude) + AGENT_MODEL or agent/harness-config.json. Legacy Codex/Grok auth notes are historical.
- Keep durable task state in `agent/feature_list.json`.
- Keep append-only handoff notes in `agent/PROGRESS.md`.
- Keep local/generated context in `agent/brain/`; it is git-ignored and separate from the Mercor Obsidian vault.
- Each continuation emits a structured event stream under `agent/brain/logs/runs/<id>/`; view it with `npm run logs` (see agent/local/logview/README.md).
