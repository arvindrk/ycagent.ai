#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

echo "== $(basename "$(git rev-parse --show-toplevel)") repo =="
git status --short --branch

echo
echo "== recent commits =="
git log --oneline -5

echo
echo "== tracked features =="
cat agent/feature_list.json

echo
echo "== progress tail =="
tail -40 agent/PROGRESS.md || true

echo
echo "== verification =="
echo "npm run lint && npm run typecheck && npm run build"
