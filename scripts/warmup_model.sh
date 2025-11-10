#!/usr/bin/env bash
set -euo pipefail

# ===== 基本变量 =====
ROOT_DIR="/app"
MODELS_DIR="${ROOT_DIR}/models"
MODEL_NAME="bge-small-zh-v1.5"
MODEL_REPO="BAAI/${MODEL_NAME}"
MODEL_DIR="${MODELS_DIR}/${MODEL_NAME}"
INDEX_PATH="${ROOT_DIR}/data/examples.index"
CAPSULES_DIR="${ROOT_DIR}/data/capsules"

# 仅本地/网络下载开关(保留原变量以兼容)
LOCAL_FILES_ONLY="${LOCAL_FILES_ONLY:-0}"
echo "LOCAL_FILES_ONLY=${LOCAL_FILES_ONLY}"

# ===== 目录就绪 =====
mkdir -p "${MODEL_DIR}" "${CAPSULES_DIR}" "$(dirname "${INDEX_PATH}")"

# ===== CLI 就绪 =====
if ! command -v huggingface-cli >/dev/null 2>&1; then
  python -m pip install --no-cache-dir -q huggingface-hub
fi

# ===== 拉取模型(不使用符号链接) =====
python - "$MODEL_REPO" "$MODEL_DIR" <<'PY'
from pathlib import Path
from sys import argv
from huggingface_hub import snapshot_download

repo_id, model_dir = argv[1], Path(argv[2])
snapshot_download(
    repo_id=repo_id,
    local_dir=model_dir,
    local_dir_use_symlinks=False,
    allow_patterns=["*"],
)
print("Downloaded to", model_dir)
PY

# 验证必要文件
ls -la "${MODEL_DIR}"
test -f "${MODEL_DIR}/config.json"

# ===== 读取维度(避免硬编码 '/models') =====
export MODEL_DIR
DIM=$(python - <<'PY'
import os, orjson
from pathlib import Path
p = Path(os.environ["MODEL_DIR"]) / "config.json"
cfg = orjson.loads(p.read_bytes())
print(cfg.get("hidden_size") or cfg.get("d_model") or cfg.get("embedding_size") or 768)
PY
)
echo "Embedding dim = ${DIM}"

# ===== 生成一个占位 index(不依赖 faiss) =====
python - <<PY
from pathlib import Path
import json
p = Path("${INDEX_PATH}")
p.parent.mkdir(parents=True, exist_ok=True)
if not p.exists():
    p.write_text(json.dumps({"dim": ${DIM}, "size": 0}))
PY

echo "Warmup done."
