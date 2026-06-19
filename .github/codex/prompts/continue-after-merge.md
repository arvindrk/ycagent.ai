# Continue ycagent.ai After Merge

You are the ycagent.ai Codex orchestrator.

Use read-only mode. Do not edit files in this workflow.

Tasks:
1. Run `bash agent/init.sh`.
2. Compare the latest `main` state against `agent/feature_list.json`.
3. Identify the next unblocked task that should be started in a Codex worktree.
4. Return a concise plan with:
   - selected feature id
   - dependency status
   - recommended specialist agents
   - first verification command
   - draft PR success criteria

Do not merge, deploy, publish, or modify the repository.
