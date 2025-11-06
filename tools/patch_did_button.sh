#!/usr/bin/env bash
set -euo pipefail

GEN="public/generator.html"
DID_TEXT="导出 W3C DID 文档（可选）"
DID_BTN='<button id="btn-did" class="btn btn-outline" data-i18n="导出 W3C DID 文档（可选）">导出 W3C DID 文档（可选）</button>'
DID_SCRIPT="scripts/did-export.js"

if [ ! -f "$GEN" ]; then
  echo "✖ Not found: $GEN (run from repo root)"
  exit 1
fi

# Only insert after the first occurrence of Human snapshot button if not present
if ! grep -q "$DID_TEXT" "$GEN"; then
  # Find the first closing tag of a button that contains 人类快照 or Human snapshot
  perl -0777 -pe '
    my $did = q{'"$DID_BTN"'};
    s{(>人类快照<.*?</button>)}{$1\n      $did}s or
    s{(>Human snapshot<.*?</button>)}{$1\n      $did}s;
  ' "$GEN" > "$GEN.tmp" && mv "$GEN.tmp" "$GEN"
  echo "✓ Inserted DID button"
else
  echo "• DID button already present"
fi

# Ensure script include once
if ! grep -q "$DID_SCRIPT" "$GEN"; then
  awk -v inc="  <script src=\"./$DID_SCRIPT\"></script>" '
    /<\/body>/ && !done { print inc; done=1 }
    { print }
  ' "$GEN" > "$GEN.tmp" && mv "$GEN.tmp" "$GEN"
  echo "✓ Added did-export script include"
else
  echo "• did-export script already included"
fi

echo "All done."
