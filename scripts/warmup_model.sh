#!/usr/bin/env bash
set -euo pipefail

LOCAL_FILES_ONLY="${LOCAL_FILES_ONLY:-1}"
echo "LOCAL_FILES_ONLY=${LOCAL_FILES_ONLY}"

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
MODELS_DIR="$ROOT_DIR/models"
MODEL_NAME="bge-small-zh-v1.5"
MODEL_REPO="BAAI/${MODEL_NAME}"
MODEL_DIR="$MODELS_DIR/${MODEL_NAME}"
INDEX_PATH="$ROOT_DIR/data/examples.index"
CAPSULES_DIR="$ROOT_DIR/data/capsules"

if ! command -v huggingface-cli >/dev/null 2>&1; then
  python -m pip install --no-cache-dir huggingface-hub
fi

mkdir -p "$MODELS_DIR"
if [ ! -d "$MODEL_DIR" ] || [ -z "$(ls -A "$MODEL_DIR" 2>/dev/null)" ]; then
  huggingface-cli download "$MODEL_REPO" --local-dir "$MODEL_DIR" --local-dir-use-symlinks False
fi

python - "$MODEL_REPO" "$MODEL_DIR" <<'PY'
from pathlib import Path
from sys import argv
import os
from huggingface_hub import snapshot_download

repo_id, model_dir = argv[1], Path(argv[2])
snapshot_download(
    repo_id=repo_id,
    local_dir=model_dir,
    local_dir_use_symlinks=False,
    local_files_only=os.getenv("LOCAL_FILES_ONLY", "1") == "1",
)
PY

DIM=$(python - <<'PY'
from pathlib import Path
import orjson

root = Path(__file__).resolve().parents[1]
model_dir = root / "models" / "bge-small-zh-v1.5"
config_path = model_dir / "config.json"
config = orjson.loads(config_path.read_bytes())
dim = config.get("sentence_embedding_dimension")
if not isinstance(dim, int):
    raise SystemExit("Invalid dimension in config")
print(dim)
PY
)

echo "Detected embedding dimension: $DIM"

python - <<'PY'
from pathlib import Path
import orjson
import numpy as np

root = Path(__file__).resolve().parents[1]
model_dir = root / "models" / "bge-small-zh-v1.5"
index_path = root / "data" / "examples.index"
index_path.parent.mkdir(parents=True, exist_ok=True)

import os
from sentence_transformers import SentenceTransformer
import faiss

model = SentenceTransformer(
    str(model_dir),
    local_files_only=(os.getenv("LOCAL_FILES_ONLY", "1") == "1"),
)
dim = int(model.get_sentence_embedding_dimension())
index = faiss.IndexFlatIP(dim)

capsules_dir = root / "data" / "capsules"
texts = []
if capsules_dir.exists():
    for path in sorted(capsules_dir.glob("*.json")):
        try:
            payload = orjson.loads(path.read_bytes())
        except Exception:
            continue
        text = payload.get("text")
        if isinstance(text, str) and text.strip():
            texts.append(text.strip())

if texts:
    embeddings = model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
    if embeddings.ndim == 1:
        embeddings = embeddings.reshape(1, -1)
    embeddings = embeddings.astype("float32", copy=False)
    index.add(embeddings)

faiss.write_index(index, str(index_path))
print(f"Index written to {index_path} with {index.ntotal} vectors")
PY

if [ -f "$INDEX_PATH" ]; then
  echo "Warmup complete: $INDEX_PATH"
else
  echo "Warmup failed to create index" >&2
  exit 1
fi
