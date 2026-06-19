#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"

test -f "$root/agent/PROGRESS.md"
test -f "$root/agent/feature_list.json"

node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$root/agent/feature_list.json" >/dev/null
