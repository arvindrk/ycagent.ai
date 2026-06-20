# logview: continuation loop observability

The loop emits a typed JSONL event stream; this renders it.

- `npm run logs`: live TUI dashboard (↑↓ runs, enter expands the reasoning trail, q quits)
- `npm run logs -- run <run_id>`: full timeline + reasoning for one run
- `npm run logs -- feature <feature_id>`: cross-run lifecycle (inception → runs → PRs → status)
- `npm run logs -- report <run_id>`: write `agent/brain/logs/runs/<run_id>/report.md`

Data lives in `agent/brain/logs/` (gitignored): `loop.jsonl` (run-level), `runs/<id>/events.jsonl`
(per-run timeline), `runs/<id>/agent.stream.jsonl` (raw Sonnet 4.6 reasoning). Event contract:
`events.ts`. Capture: `emit_event` in `agent/local/lib.sh`.
