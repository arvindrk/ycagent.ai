# Local Agent Brain

This directory is the repo-local memory area for ycagent.ai automation.

It is intentionally git-ignored except for this README. Use it for generated,
machine-local continuity state:

- `threads/`: active thread summaries and worktree handoffs
- `decisions/`: local decision notes that are not durable repo rules yet
- `research/`: investigation notes and source summaries
- `merge-events/`: observed main-branch merge events and next-work plans
- `runbooks/`: local dry-run outputs and troubleshooting notes

Do not store secrets, `.env` contents, private tokens, cookies, or Mercor work
brain content here.
