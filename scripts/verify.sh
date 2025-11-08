#!/usr/bin/env bash
set -euo pipefail
OUT="reports/verification-report.json"
mkdir -p "$(dirname "$OUT")"

hash_line() {
  # Print the SHA256 checksum for a file using whichever tool is available.
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    echo "ERROR: need either shasum or sha256sum" >&2
    exit 1
  fi
}

tmp_file=$(mktemp "${OUT}.XXXXXX")
trap 'rm -f "$tmp_file"' EXIT

echo "[" > "$tmp_file"
first=true
while IFS= read -r -d '' f; do
  sha=$(hash_line "$f")
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
    echo "  $json" >> "$tmp_file"
    first=false
  else
    echo "  ,$json" >> "$tmp_file"
  fi
done < <(find . -path "./reports" -prune -o -type f \( -name "*.yaml" -o -name "*.yml" -o -name "*.json" \) -print0)
echo "]" >> "$tmp_file"
mv "$tmp_file" "$OUT"
trap - EXIT
echo "Verification complete -> $OUT"
