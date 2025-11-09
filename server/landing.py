from __future__ import annotations

import re
import threading
import time
from base64 import b64decode
from pathlib import Path
from typing import Any, Dict, Tuple

import orjson
from fastapi import Request
from fastapi.responses import HTMLResponse

DATA_DIR = Path("data/capsules")
CACHE: dict[str, Tuple[float, int, dict[str, Any]]] = {}
_cache_lock = threading.Lock()
_PLACEHOLDER_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAucB9WkN9T8AAAAASUVORK5CYII="
)
_TTL_SECONDS = 300
_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def _ensure_placeholder_png() -> None:
    p = Path("static/og/placeholder.png")
    if not p.exists():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(b64decode(_PLACEHOLDER_B64))


_ensure_placeholder_png()


def is_safe_id(s: str) -> bool:
    return bool(_ID_PATTERN.fullmatch(s))


def load_capsule_json(capsule_id: str) -> dict[str, Any]:
    json_path = DATA_DIR / f"{capsule_id}.json"
    payload = orjson.loads(json_path.read_bytes())
    if not isinstance(payload, dict):
        raise ValueError("capsule payload must be a JSON object")
    return payload


def get_capsule_cached(capsule_id: str) -> dict[str, Any]:
    json_path = DATA_DIR / f"{capsule_id}.json"

    with _cache_lock:
        now = time.monotonic()
        current_mtime = json_path.stat().st_mtime_ns
        cached = CACHE.get(capsule_id)
        if cached is not None:
            expires_monotonic, cached_mtime, payload = cached
            if cached_mtime == current_mtime and now < expires_monotonic:
                return payload

        payload = load_capsule_json(capsule_id)
        CACHE[capsule_id] = (now + _TTL_SECONDS, current_mtime, payload)
        return payload


def safe_desc(text: str, limit: int = 200) -> str:
    cleaned = re.sub(r"#{1,6}\\s*", "", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:limit]


def render_landing_page(request: Request, capsule_id: str, template) -> HTMLResponse:
    if not is_safe_id(capsule_id):
        content = "<!DOCTYPE html><html><head><title>Invalid capsule</title></head><body><h1>Invalid capsule identifier</h1></body></html>"
        return HTMLResponse(content=content, status_code=400)

    json_path = DATA_DIR / f"{capsule_id}.json"
    if not json_path.exists():
        content = "<!DOCTYPE html><html><head><title>Page Not Found</title></head><body><h1>Capsule not found</h1></body></html>"
        return HTMLResponse(content=content, status_code=404)

    capsule = get_capsule_cached(capsule_id)

    subtitle_value = capsule.get("subtitle")
    subtitle = str(subtitle_value).strip() if isinstance(subtitle_value, str) else ""
    title_value = capsule.get("title")
    title = str(title_value).strip() if isinstance(title_value, str) and title_value.strip() else capsule_id

    scores: Dict[str, Any] = {}
    for key in ("uniqueness", "ari"):
        value = capsule.get(key)
        if isinstance(value, (int, float)):
            scores[key] = int(value)

    explanations_raw = capsule.get("explanations")
    explanations = []
    if isinstance(explanations_raw, list):
        for item in explanations_raw:
            if isinstance(item, str) and item.strip():
                explanations.append(item.strip())

    expanded_desc = ""
    expanded_path = DATA_DIR / f"{capsule_id}.expanded.md"
    if expanded_path.exists():
        expanded_desc = expanded_path.read_text(encoding="utf-8", errors="ignore")

    desc_sources = []
    if subtitle:
        desc_sources.append(subtitle)
    if explanations:
        desc_sources.extend(explanations)
    if expanded_desc:
        desc_sources.append(expanded_desc)
    if not desc_sources:
        desc_sources.append(title)
    og_desc = safe_desc("\n".join(desc_sources))

    og_image_path = Path("static/og") / f"{capsule_id}.png"
    if og_image_path.exists():
        og_image_url = request.url_for("static", path=f"og/{capsule_id}.png")
    else:
        og_image_url = request.url_for("static", path="og/placeholder.png")

    og_url = str(request.url)

    template_obj = template.get_template("landing.html")
    html = template_obj.render(
        title=title,
        subtitle=subtitle,
        scores=scores,
        explanations=explanations,
        og_image_url=str(og_image_url),
        og_url=og_url,
        og_desc=og_desc,
    )
    return HTMLResponse(content=html, media_type="text/html; charset=utf-8")
