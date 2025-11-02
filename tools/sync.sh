#!/usr/bin/env bash
set -euo pipefail
branch="feat/docs-v0.2.9"
git checkout -b "$branch" 2>/dev/null || git checkout "$branch"
git add docs schemas templates
git commit -m "docs: add quickstart, citing, books; templates+schemas; set DOI 10.5281/zenodo.17500749" || true
git push -u origin "$branch"
echo "✅ Pushed $branch. Open a PR on GitHub."
