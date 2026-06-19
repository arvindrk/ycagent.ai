# Codex Swarm Rules

- The orchestrator owns prioritization and final PR decisions.
- Specialist agents return concise findings with file references and verification evidence.
- Read-only research can fan out. Code writes must be isolated to one worktree or branch per feature.
- Adversarial review sees the diff and requirements, not the implementer's reasoning.
- Every code-changing thread updates `agent/PROGRESS.md` and the relevant item in `agent/feature_list.json`.
- All code-changing work ends in a draft PR, not a direct merge.
