#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-.}"
HTML="$ROOT_DIR/public/generator.html"

echo "[i18n] patching $HTML"

# Remove legacy/duplicate scripts and inline init blocks (safe even if not present)
sed -i '' -E '/scripts\/i18n-auto\.js/d' "$HTML" || true
sed -i '' -E '/scripts\/i18n-overlay\.js(?!v2\.4)/d' "$HTML" || true
# drop any inline init that called initI18n or showed "i18n.js not loaded properly"
python3 - "$HTML" <<'PY'
import sys, re
p=sys.argv[1]
s=open(p,'r',encoding='utf-8').read()
s=re.sub(r'<script[^>]*>(?s).*?(initI18n\(|i18n\.js not loaded properly)(?s).*?</script>','',s,flags=re.I)
open(p,'w',encoding='utf-8').write(s)
PY

# Ensure the single overlay script is appended before </body>, with defer & cache bust
if ! grep -q 'i18n-overlay.v2.4.js' "$HTML"; then
  perl -0777 -i -pe 's@(</body>)@  <script defer src="./scripts/i18n-overlay.v2.4.js?v=2401"></script>\n\1@' "$HTML"
else
  sed -i '' -E 's#<script[^>]*i18n-overlay\.v2\.4\.js[^>]*>#<script defer src="./scripts/i18n-overlay.v2.4.js?v=2401">#' "$HTML" || true
fi

# Add data-i18n-switch to the language select
if grep -q 'name="language"' "$HTML"; then
  sed -i '' -E 's/name="language"/name="language" data-i18n-switch/' "$HTML"
fi

echo "[i18n] done."
