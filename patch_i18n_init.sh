#!/usr/bin/env bash
set -euo pipefail

P="public/generator.html"
if [[ ! -f "$P" ]]; then
  echo "ERROR: $P not found. Run this script from your repo root."
  exit 1
fi

python3 - "$P" <<'PY'
import sys, re, io
p = sys.argv[1]
s = open(p, 'r', encoding='utf-8').read()
if 'initI18n()' in s or 'i18n initialized' in s:
    print("Already patched:", p)
    sys.exit(0)

snippet = '''
<script>
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof initI18n === "function") {
      initI18n();
      console.log("✅ i18n initialized");
    } else {
      console.warn("⚠️ i18n.js not loaded properly");
    }
  });
</script>
'''

new = re.sub(r'</body\s*>', snippet + "\n</body>", s, count=1, flags=re.I)
if new == s:
    # Fallback: append at end if </body> not found
    new = s + "\n" + snippet + "\n"

open(p, 'w', encoding='utf-8').write(new)
print("Patched:", p)
PY
