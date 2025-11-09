from __future__ import annotations

import base64
import html
import logging
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional

import orjson
from fastapi import HTTPException, Request
from fastapi.responses import HTMLResponse, Response

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "capsules"
STATIC_OG_DIR = Path(__file__).resolve().parents[1] / "static" / "og"
TTL_SECONDS = 300.0

CACHE: dict[str, tuple[float, int, Dict[str, Any]]] = {}

_PLACEHOLDER_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wwAAn8B9p7n+QAAAABJRU5ErkJggg=="
)

_INLINE_STYLES = """
:root { color-scheme: light dark; font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; }
body { margin: 0; padding: 2rem; background: radial-gradient(circle at top, rgba(250,250,250,0.98), rgba(240,240,240,0.9)); color: #222; min-height: 100vh; }
main { max-width: 720px; margin: 0 auto; background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); border-radius: 24px; padding: 2.5rem; box-shadow: 0 20px 60px rgba(15,23,42,0.12); }
h1 { font-size: clamp(2rem, 4vw, 3rem); margin: 0 0 1rem 0; line-height: 1.1; }
.badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem; border-radius: 999px; background: linear-gradient(135deg, #2563eb, #9333ea); color: #fff; font-size: 0.9rem; font-weight: 600; margin-bottom: 1.5rem; letter-spacing: 0.02em; }
.og-image { width: 100%; border-radius: 18px; overflow: hidden; margin: 1.5rem 0; background: rgba(15,23,42,0.08); display: flex; align-items: center; justify-content: center; }
.og-image img { width: 100%; height: auto; display: block; }
details { margin: 1.5rem 0; border: 1px solid rgba(15,23,42,0.12); border-radius: 16px; background: rgba(255,255,255,0.9); padding: 1rem 1.25rem; }
details > summary { cursor: pointer; font-weight: 600; font-size: 1.1rem; }
details ul { padding-left: 1.2rem; margin: 1rem 0 0 0; line-height: 1.6; }
footer { margin-top: 2rem; text-align: center; font-size: 0.95rem; }
footer a { color: inherit; text-decoration: none; font-weight: 600; border-bottom: 1px solid currentColor; }
.expanded { margin-top: 2rem; padding: 1.25rem; border-radius: 16px; background: rgba(15,23,42,0.04); }
.expanded pre { white-space: pre-wrap; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.95rem; line-height: 1.5; }
@media (max-width: 640px) { body { padding: 1rem; } main { padding: 1.75rem; } }
""".strip()


def _ensure_placeholder_png() -> None:
    try:
        STATIC_OG_DIR.mkdir(parents=True, exist_ok=True)
        placeholder_path = STATIC_OG_DIR / "placeholder.png"
        if not placeholder_path.exists():
            placeholder_path.write_bytes(base64.b64decode(_PLACEHOLDER_B64))
    except Exception as exc:  # pragma: no cover - file system failures are logged
        logger.warning("Unable to ensure placeholder image: %s", exc)


_ensure_placeholder_png()


def is_safe_id(value: str) -> bool:
    return bool(value) and value.isascii() and value.replace("-", "").replace("_", "").isalnum()


def load_capsule_json(orjson_module: Any, json_path: Path) -> Dict[str, Any]:
    return orjson_module.loads(json_path.read_bytes())


def _read_expanded_markdown(capsule_id: str) -> Optional[str]:
    expanded_path = DATA_DIR / capsule_id / "expanded.md"
    if expanded_path.exists():
        return expanded_path.read_text(encoding="utf-8", errors="replace")
    return None


def get_capsule_cached(capsule_id: str) -> Optional[Dict[str, Any]]:
    json_path = DATA_DIR / f"{capsule_id}.json"
    if not json_path.exists():
        return None
    try:
        stat = json_path.stat()
    except FileNotFoundError:
        return None

    mtime_ns = stat.st_mtime_ns
    now = time.monotonic()
    cached = CACHE.get(capsule_id)
    if cached and cached[0] > now and cached[1] == mtime_ns:
        return cached[2]

    try:
        capsule_data = load_capsule_json(orjson, json_path)
    except orjson.JSONDecodeError as exc:  # pragma: no cover - indicates corrupted data
        raise HTTPException(status_code=500, detail="capsule json invalid") from exc

    if not isinstance(capsule_data, Mapping):
        raise HTTPException(status_code=500, detail="capsule json invalid")

    expanded = _read_expanded_markdown(capsule_id)
    payload = {
        "capsule": dict(capsule_data),
        "expanded": expanded,
    }

    CACHE[capsule_id] = (now + TTL_SECONDS, mtime_ns, payload)
    return payload


def safe_desc(capsule: Mapping[str, Any]) -> str:
    candidate: Optional[str] = None
    raw_description = capsule.get("description") if isinstance(capsule, Mapping) else None
    if isinstance(raw_description, str) and raw_description.strip():
        candidate = raw_description.strip()
    else:
        explanations = capsule.get("explanations") if isinstance(capsule, Mapping) else None
        if isinstance(explanations, Iterable):
            for item in explanations:
                if isinstance(item, str) and item.strip():
                    candidate = item.strip()
                    break
    if not candidate:
        title = capsule.get("title") if isinstance(capsule, Mapping) else None
        candidate = str(title).strip() if title else ""
    candidate = candidate.replace("\n", " ")
    if len(candidate) > 240:
        candidate = candidate[:237].rstrip() + "..."
    return candidate


def _build_html(context: Mapping[str, Any]) -> str:
    title = html.escape(str(context["title"]))
    og_desc = html.escape(str(context["og_desc"]))
    og_image = html.escape(str(context["og_image_url"]))
    og_url = html.escape(str(context["og_url"]))
    score = context.get("score")
    explanations = context.get("explanations") or []
    expanded = context.get("expanded")

    explanations_items = "".join(
        f"<li>{html.escape(str(item))}</li>" for item in explanations if isinstance(item, str)
    )

    expanded_section = ""
    if expanded:
        expanded_section = "<section class='expanded'><h2>扩展解读</h2><pre>" + html.escape(expanded) + "</pre></section>"

    score_badge = ""
    if score:
        score_badge = f"<div class='badge'>Uniq {html.escape(str(score))}</div>"

    details_block = (
        f"<details open><summary>解读</summary><ul>{explanations_items}</ul></details>"
        if explanations_items
        else ""
    )

    return (
        "<!doctype html>"
        "<html lang=\"zh-CN\">"
        "<head>"
        "<meta charset=\"utf-8\">"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
        "<meta property=\"og:type\" content=\"article\">"
        f"<meta property=\"og:title\" content=\"{title}\">"
        f"<meta property=\"og:description\" content=\"{og_desc}\">"
        f"<meta property=\"og:image\" content=\"{og_image}\">"
        f"<meta property=\"og:url\" content=\"{og_url}\">"
        "<meta name=\"twitter:card\" content=\"summary_large_image\">"
        f"<title>{title}</title>"
        f"<style>{_INLINE_STYLES}</style>"
        "</head>"
        "<body>"
        "<main>"
        f"<h1>{title}</h1>"
        f"{score_badge}"
        f"<div class='og-image'><img src=\"{og_image}\" alt=\"分享图\"></div>"
        f"{details_block}"
        f"{expanded_section}"
        "</main>"
        "<footer><a href=\"/ethics\">数据伦理</a></footer>"
        "</body></html>"
    )


def _build_context(
    capsule_id: str,
    capsule_payload: Mapping[str, Any],
    request: Request,
) -> Dict[str, Any]:
    capsule = capsule_payload.get("capsule") if isinstance(capsule_payload, Mapping) else {}
    if not isinstance(capsule, Mapping):
        capsule = {}

    og_url = request.url_for("landing_page", capsule_id=capsule_id)
    og_image_path = STATIC_OG_DIR / f"{capsule_id}.png"
    if og_image_path.exists():
        og_image_url = request.url_for("static", path=f"og/{capsule_id}.png")
    else:
        og_image_url = request.url_for("static", path="og/placeholder.png")

    explanations = capsule.get("explanations")
    if not isinstance(explanations, Iterable) or isinstance(explanations, (str, bytes)):
        explanations_list: List[str] = []
    else:
        explanations_list = [str(item) for item in explanations]

    score = capsule.get("score")
    if score is None:
        score = capsule.get("uniqueness")

    score_display = None
    if isinstance(score, (int, float, str)):
        score_text = str(score).strip()
        if score_text:
            score_display = score_text

    context: Dict[str, Any] = {
        "request": request,
        "title": str(capsule.get("title", "Fireseed Capsule")),
        "og_desc": safe_desc(capsule),
        "og_image_url": str(og_image_url),
        "og_url": str(og_url),
        "explanations": explanations_list,
        "score": score_display,
        "styles": _INLINE_STYLES,
        "expanded": capsule_payload.get("expanded"),
    }
    return context


async def render_landing(
    request: Request,
    capsule_id: str,
    templates_or_none: Any | None,
) -> Response:
    capsule_payload = get_capsule_cached(capsule_id)
    if capsule_payload is None:
        body = (
            "<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\">"
            "<title>Capsule 未找到</title></head><body><main><h1>Capsule 未找到</h1>"
            "<p>无法找到指定 Capsule。</p></main></body></html>"
        )
        return HTMLResponse(content=body, status_code=404)

    context = _build_context(capsule_id, capsule_payload, request)

    if templates_or_none is not None and hasattr(templates_or_none, "TemplateResponse"):
        return templates_or_none.TemplateResponse("landing.html", context)

    html_body = _build_html(context)
    return HTMLResponse(content=html_body, media_type="text/html; charset=utf-8")
