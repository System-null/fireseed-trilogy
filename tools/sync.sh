#!/usr/bin/env bash
set -euo pipefail
branch="release/v0.3.0"
git checkout -b "$branch" 2>/dev/null || git checkout "$branch"
git add .
git commit -m "release(v0.3.0): excerpts (EN/ZH), DOI alignment, licensing"
git push -u origin "$branch"
echo "✅ Pushed $branch. Open a PR to merge the release."
