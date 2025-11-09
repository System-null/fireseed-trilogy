from __future__ import annotations

import base64
import re
import threading
import time
from pathlib import Path
from typing import Any, Dict

import orjson

DATA_DIR = Path("data/capsules")
CACHE: dict[str, tuple[float, int, Dict[str, Any]]] = {}
_cache_lock = threading.Lock()
_TTL_SECONDS = 300.0

_PLACEHOLDER_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII="
)

_HEADING_RE = re.compile(r"^\s*#{1,6}\s*", flags=re.MULTILINE)
_WHITESPACE_RE = re.compile(r"\s+")


def _ensure_placeholder_png() -> Path:
    target = Path("static/og/placeholder.png")
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        binary = base64.b64decode(_PLACEHOLDER_B64)
        target.write_bytes(binary)
    return target


def is_safe_id(value: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value))


def load_capsule_json(capsule_id: str) -> Dict[str, Any]:
    json_path = DATA_DIR / f"{capsule_id}.json"
    data = json_path.read_bytes()
    return orjson.loads(data)


def get_capsule_cached(capsule_id: str) -> Dict[str, Any]:
    json_path = DATA_DIR / f"{capsule_id}.json"
    if not json_path.exists():
        raise FileNotFoundError(json_path)

    now = time.monotonic()
    mtime_ns = json_path.stat().st_mtime_ns
    with _cache_lock:
        cached = CACHE.get(capsule_id)
        if cached and now < cached[0] and cached[1] == mtime_ns:
            return cached[2]

    payload = load_capsule_json(capsule_id)
    with _cache_lock:
        CACHE[capsule_id] = (now + _TTL_SECONDS, mtime_ns, payload)
    return payload


def safe_desc(text: str, limit: int = 200) -> str:
    if not text:
        return ""
    cleaned = _HEADING_RE.sub("", text)
    cleaned = _WHITESPACE_RE.sub(" ", cleaned).strip()
    if not cleaned:
        return ""
    return cleaned[:limit]


# Ensure placeholder exists on import
_ensure_placeholder_png()
