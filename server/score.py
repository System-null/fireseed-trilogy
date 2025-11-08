from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Tuple

import numpy as np

LOGGER = logging.getLogger(__name__)

_MODEL = None
_INDEX = None


def _model_path() -> Path:
    return Path(__file__).resolve().parents[1] / "models" / "bge-small-zh-v1.5"


def _index_path() -> Path:
    return Path(__file__).resolve().parents[1] / "data" / "examples.index"


def get_model():
    """Lazily load the local embedding model as a singleton."""
    global _MODEL
    if _MODEL is None:
        from sentence_transformers import SentenceTransformer  # lazy import

        model_dir = _model_path()
        _MODEL = SentenceTransformer(str(model_dir))
    return _MODEL


def get_index():
    """Lazily load the FAISS index as a singleton."""
    global _INDEX
    if _INDEX is None:
        index_path = _index_path()
        if not index_path.exists():
            LOGGER.warning("FAISS index not found at %s", index_path)
            _INDEX = None
        else:
            import faiss  # lazy import

            _INDEX = faiss.read_index(str(index_path))
    return _INDEX


def _fallback_response(explanations: List[str]) -> Tuple[int, List[str]]:
    # 空索引代表尚无历史可比样本
    LOGGER.warning("Empty FAISS index detected; 尚无历史可比")
    explanations.append("empty_index_fallback")
    return 100, explanations


def compute_uniqueness(text: str, top_k: int = 5) -> Tuple[int, List[str]]:
    """Compute a uniqueness score against the example index."""
    explanations: List[str] = ["topk_mean", "normalized_cosine"]

    if not text:
        return _fallback_response(explanations)

    index = get_index()
    if index is None or getattr(index, "ntotal", 0) == 0:
        return _fallback_response(explanations)

    try:
        model = get_model()
        vector = model.encode([text], normalize_embeddings=True, convert_to_numpy=True)
    except Exception as exc:  # pragma: no cover - defensive logging
        LOGGER.exception("Embedding generation failed: %s", exc)
        return _fallback_response(explanations)

    if vector.ndim == 1:
        vector = vector.reshape(1, -1)
    vector = vector.astype(np.float32, copy=False)

    k = min(max(top_k, 1), getattr(index, "ntotal", 0))
    if k == 0:
        return _fallback_response(explanations)

    try:
        distances, _ = index.search(vector, k)
    except Exception as exc:  # pragma: no cover
        LOGGER.exception("Index search failed: %s", exc)
        return _fallback_response(explanations)

    if distances.size == 0:
        return _fallback_response(explanations)

    robust = float(np.nanmean(distances))
    uniqueness = round(100 * (1 - max(0.0, robust)))
    uniqueness = max(0, min(100, uniqueness))
    return uniqueness, explanations
