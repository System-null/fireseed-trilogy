
#!/usr/bin/env bash
set -euo pipefail
OUT="reports/verification-report.json"
mkdir -p "$(dirname "$OUT")"
echo "[" > "$OUT"
first=true
while IFS= read -r -d '' f; do
  sha=$(shasum -a 256 "$f" | awk '{print $1}')
  sigfile1="${f}.sig"
  sigfile2="${f}.asc"
  sig_ok=false
  if [[ -f "$sigfile1" ]]; then
    if gpg --verify "$sigfile1" "$f" >/dev/null 2>&1; then sig_ok=true; fi
  elif [[ -f "$sigfile2" ]]; then
    if gpg --verify "$sigfile2" "$f" >/dev/null 2>&1; then sig_ok=true; fi
  fi
  json="{\"file\": \"$f\", \"sha256\": \"$sha\", \"sig_ok\": $sig_ok}"
  if $first; then
    echo "  $json" >> "$OUT"
    first=false
  else
    echo "  ,$json" >> "$OUT"
  fi
done < <(find . -type f \( -name "*.yaml" -o -name "*.yml" -o -name "*.json" \) -print0)
echo "]" >> "$OUT"
echo "Verification complete -> $OUT"
