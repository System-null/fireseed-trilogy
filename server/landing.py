from __future__ import annotations

import re
import threading
import time
from pathlib import Path
from typing import Any

import orjson
from fastapi import HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

DATA_DIR = Path("data/capsules")
CACHE: dict[str, tuple[float, int, dict[str, Any]]] = {}
_CACHE_TTL_SECONDS = 300.0
_cache_lock = threading.Lock()

_PLACEHOLDER_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQI12NgYGD4DwABAgEAffZt5QAAAABJRU5ErkJggg=="


def _ensure_placeholder_png() -> None:
    path = Path("static/og/placeholder.png")
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    from base64 import b64decode

    path.write_bytes(b64decode(_PLACEHOLDER_B64))


_ensure_placeholder_png()

_SAFE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_HEADING_RE = re.compile(r"(?m)^#{1,6}\\s*")
_WHITESPACE_RE = re.compile(r"\s+")


def is_safe_id(value: str) -> bool:
    return bool(_SAFE_ID_RE.fullmatch(value))


def load_capsule_json(capsule_id: str) -> dict[str, Any]:
    path = DATA_DIR / f"{capsule_id}.json"
    return orjson.loads(path.read_bytes())


def get_capsule_cached(capsule_id: str) -> dict[str, Any]:
    path = DATA_DIR / f"{capsule_id}.json"
    if not path.exists():
        raise FileNotFoundError(path)
    with _cache_lock:
        now = time.monotonic()
        mtime_ns = path.stat().st_mtime_ns
        cached = CACHE.get(capsule_id)
        if cached and cached[0] > now and cached[1] == mtime_ns:
            return cached[2]
        payload = load_capsule_json(capsule_id)
        refreshed_mtime_ns = path.stat().st_mtime_ns
        CACHE[capsule_id] = (
            time.monotonic() + _CACHE_TTL_SECONDS,
            refreshed_mtime_ns,
            payload,
        )
        return payload


def safe_desc(text: str, limit: int = 200) -> str:
    if not text:
        return ""
    cleaned = _HEADING_RE.sub("", text)
    cleaned = _WHITESPACE_RE.sub(" ", cleaned).strip()
    return cleaned[:limit]


_NOT_FOUND_HTML = """<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>Page Not Found</title>\n</head>\n<body>\n  <main>\n    <h1>未找到该胶囊</h1>\n    <p>请求的胶囊不存在或尚未发布。</p>\n  </main>\n</body>\n</html>"""


async def render_landing_page(request: Request, id: str) -> HTMLResponse:
    if not is_safe_id(id):
        raise HTTPException(status_code=400, detail="invalid capsule id")
    try:
        capsule = get_capsule_cached(id)
    except FileNotFoundError:
        return HTMLResponse(content=_NOT_FOUND_HTML, status_code=404)

    expanded_path = DATA_DIR / f"{id}.expanded.md"
    expanded_text = ""
    if expanded_path.exists():
        expanded_text = expanded_path.read_text(encoding="utf-8", errors="ignore")

    title = str(capsule.get("title") or capsule.get("name") or id)
    subtitle_value = capsule.get("subtitle")
    subtitle = str(subtitle_value) if subtitle_value not in (None, "") else ""
    explanations_value = capsule.get("explanations")
    if isinstance(explanations_value, list):
        explanations = [str(item) for item in explanations_value if item is not None]
    else:
        explanations = []
    uniqueness = capsule.get("uniqueness")
    ari = capsule.get("ari")
    ipfs_cid = capsule.get("ipfs_cid")

    if expanded_text:
        desc_source = expanded_text
    else:
        desc_parts: list[str] = []
        if subtitle:
            desc_parts.append(subtitle)
        if uniqueness is not None:
            desc_parts.append(f"Uniqueness: {uniqueness}")
        if ari is not None:
            desc_parts.append(f"ARI: {ari}")
        if explanations:
            desc_parts.extend(explanations)
        if ipfs_cid:
            desc_parts.append(f"IPFS CID: {ipfs_cid}")
        desc_source = "\n".join(desc_parts) or title
    og_desc = safe_desc(desc_source)

    og_image_path = Path("static/og") / f"{id}.png"
    if og_image_path.exists():
        og_image_url = str(request.url_for("static", path=f"og/{id}.png"))
    else:
        og_image_url = str(request.url_for("static", path="og/placeholder.png"))

    og_url = str(request.url)

    templates: Jinja2Templates | None = getattr(request.app.state, "templates", None)
    if templates is None:  # pragma: no cover - defensive fallback
        templates = Jinja2Templates(directory="server/templates")
        request.app.state.templates = templates

    context = {
        "request": request,
        "title": title,
        "subtitle": subtitle,
        "explanations": explanations,
        "uniqueness": uniqueness,
        "ari": ari,
        "ipfs_cid": ipfs_cid,
        "og_desc": og_desc,
        "og_image_url": og_image_url,
        "og_url": og_url,
    }
    return templates.TemplateResponse("landing.html", context)
