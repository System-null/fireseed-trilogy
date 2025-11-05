#!/usr/bin/env bash
# compute-sha256.sh  — 根据文件计算 SHA-256
# Usage: sh scripts/compute-sha256.sh <file>
set -e
if [ -z "$1" ]; then
  echo "Usage: $0 <file>" >&2
  exit 1
fi
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$1" | awk '{print $1}'
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$1" | awk '{print $1}'
else
  echo "No sha256 tool found" >&2
  exit 2
fi
