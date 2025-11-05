#!/usr/bin/env bash
# make-signed.sh — 为 YAML 生成 detached 签名，并输出带 signature_file 的新 YAML
# 依赖：gpg、awk、date
# 用法：sh scripts/make-signed.sh capsule_v0.yaml
set -euo pipefail

YAML="${1:-capsule_v0.yaml}"
if [ ! -f "$YAML" ]; then
  echo "找不到文件：$YAML" >&2
  exit 1
fi

BASENAME="${YAML%.*}"
SIG="${BASENAME}.asc"
HASH=$(sh "$(dirname "$0")/compute-sha256.sh" "$YAML")
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "→ 计算哈希：$HASH"
echo "→ GPG 生成 detached 签名：$SIG"
gpg --output "$SIG" --armor --detach-sign "$YAML"

OUT="${BASENAME}.signed.yaml"
echo "→ 写入新文件：$OUT"

# 将 proofs.hash 与 proofs.timestamp 更新，插入/更新 signature_file 字段
awk -v HASH="$HASH" -v TS="$TS" -v SIG="$SIG" '
  BEGIN{in_proofs=0; done_hash=0; done_ts=0; done_sig=0}
  /^proofs:/ {print; in_proofs=1; next}
  in_proofs==1 {
    if ($0 ~ /^[^[:space:]]/) { # dedent => leave proofs block
      if (!done_sig) print "  signature_file: \"" SIG "\""
      if (!done_hash) print "  hash: \"" HASH "\""
      if (!done_ts) print "  timestamp: \"" TS "\""
      in_proofs=0
    } else {
      if ($0 ~ /^[[:space:]]+hash:/)       {$0="  hash: \"" HASH "\""; done_hash=1}
      if ($0 ~ /^[[:space:]]+timestamp:/)  {$0="  timestamp: \"" TS "\""; done_ts=1}
      if ($0 ~ /^[[:space:]]+signature_file:/) { $0="  signature_file: \"" SIG "\""; done_sig=1 }
    }
    print; next
  }
  {print}
  END{
    if (in_proofs==1){
      if (!done_sig) print "  signature_file: \"" SIG "\""
      if (!done_hash) print "  hash: \"" HASH "\""
      if (!done_ts) print "  timestamp: \"" TS "\""
    }
  }
' "$YAML" > "$OUT"

echo "完成："
echo "  新文件：$OUT"
echo "  哈  希：$HASH"
echo "  签  名：$SIG"
