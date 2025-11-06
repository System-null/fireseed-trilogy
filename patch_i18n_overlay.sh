#!/usr/bin/env bash
set -e
HTML="public/generator.html"
TAG='<script src="./scripts/i18n-overlay.js"></script>'
if grep -q 'scripts/i18n-overlay.js' "$HTML"; then
  echo "[i18n] overlay already referenced."
  exit 0
fi
# insert before closing </body>
awk -v tag="$TAG" 'BEGIN{added=0} /<\/body>/{print tag; added=1} {print} END{ if(!added){ print tag } }' "$HTML" > "$HTML.tmp" && mv "$HTML.tmp" "$HTML"
echo "[i18n] overlay tag inserted."
