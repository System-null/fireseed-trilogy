from __future__ import annotations

import logging
import orjson
import logging
import time
from io import BytesIO

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ValidationError
from slowapi.errors import RateLimitExceeded

from . import limiter as limiter_module
from .score import compute_uniqueness
from .sharecard import (
    ICON_SIZE,
    OG_SIZE,
    choose_format,
    compute_etag,
    render_sharecard,
)

logger = logging.getLogger(__name__)

app = FastAPI()

limiter = limiter_module.get_limiter()
app.state.limiter = limiter

# 初始化日志记录器
logger = logging.getLogger(__name__)

# 尝试导入 sharecard 路由（PR2 未安装 Pillow 时跳过）
try:
    from server.sharecard import router as sharecard_router  # type: ignore
    app.include_router(sharecard_router, prefix="/sharecard")
except Exception as e:  # pragma: no cover
    logger.warning("sharecard route disabled: %s", e)


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    limiter_module.consume_request_context(request)
    response = JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
    limiter_module.inject_rate_headers(response, request)
    if limiter_module.spike_header_active(request):
        response.headers["X-Fireseed-Spike"] = "true"
    return response


app.add_exception_handler(RateLimitExceeded, rate_limit_handler)


class ScoreRequest(BaseModel):
    text: str


@app.post("/score")
@limiter.limit(limiter_module.score_limit_string)
async def score_endpoint(request: Request) -> JSONResponse:
    limiter_module.consume_request_context(request)
    if limiter_module.should_block_for_spike(request):
        response = JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
        limiter_module.inject_rate_headers(response, request)
        response.headers["X-Fireseed-Spike"] = "true"
        return response
    raw_body = await request.body()
    try:
        data = orjson.loads(raw_body) if raw_body else {}
    except orjson.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="invalid json body") from exc

    try:
        payload = ScoreRequest.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    uniqueness, explanations = compute_uniqueness(text)
    response = JSONResponse(
        {
            "uniqueness": uniqueness,
            "ari": 60,
            "explanations": explanations,
        }
    )
    limiter_module.inject_rate_headers(response, request)
    if limiter_module.spike_header_active(request):
        response.headers["X-Fireseed-Spike"] = "true"
    return response


SIZE_MAP = {
    "1200x630": OG_SIZE,
    "512x512": ICON_SIZE,
}


def _parse_score(value, field_name: str) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        raise HTTPException(status_code=400, detail=f"{field_name} must be a number between 0 and 100")
    if not isinstance(value, (int, float)):
        raise HTTPException(status_code=400, detail=f"{field_name} must be a number between 0 and 100")
    numeric = float(value)
    if numeric < 0 or numeric > 100:
        raise HTTPException(status_code=400, detail=f"{field_name} must be between 0 and 100")
    return int(round(numeric))


@app.post("/sharecard")
@limiter.limit(limiter_module.score_limit_string)
async def sharecard_endpoint(request: Request) -> Response:
    limiter_module.consume_request_context(request)
    if limiter_module.should_block_for_spike(request):
        response = JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
        limiter_module.inject_rate_headers(response, request)
        response.headers["X-Fireseed-Spike"] = "true"
        return response

    start_time = time.perf_counter()
    raw_body = await request.body()
    try:
        data = orjson.loads(raw_body) if raw_body else {}
    except orjson.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="invalid json body") from exc

    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="invalid json body")

    title = str(data.get("title", "")).strip()
    url = str(data.get("url", "")).strip()
    if not title or not url:
        raise HTTPException(status_code=400, detail="title and url are required")

    subtitle_value = data.get("subtitle")
    subtitle = str(subtitle_value).strip() if subtitle_value is not None else ""

    uniqueness_value = _parse_score(data.get("uniqueness"), "uniqueness")
    ari_value = _parse_score(data.get("ari"), "ari")

    size_raw = data.get("size") or "1200x630"
    size_key = str(size_raw).lower()
    if size_key not in SIZE_MAP:
        raise HTTPException(status_code=400, detail="invalid size")
    size_tuple = SIZE_MAP[size_key]

    explicit_format = data.get("format")
    explicit_format_str = str(explicit_format) if explicit_format is not None else None
    try:
        fmt, content_type = choose_format(request.headers.get("accept"), explicit_format_str)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="invalid format") from exc

    etag_payload = {
        "title": title,
        "subtitle": subtitle,
        "uniqueness": uniqueness_value if uniqueness_value is not None else "",
        "ari": ari_value if ari_value is not None else "",
        "url": url,
    }
    etag = compute_etag(etag_payload, size_tuple, fmt)
    etag_header = f'"{etag}"'

    if_none_match = request.headers.get("if-none-match")
    if if_none_match:
        candidates = [value.strip() for value in if_none_match.split(",") if value.strip()]
        if "*" in candidates or etag_header in candidates:
            response = Response(status_code=304)
            response.headers["ETag"] = etag_header
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            limiter_module.inject_rate_headers(response, request)
            if limiter_module.spike_header_active(request):
                response.headers["X-Fireseed-Spike"] = "true"
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            logger.info(
                "sharecard.cached",
                extra={
                    "capsule_id": data.get("capsule_id"),
                    "size": f"{size_tuple[0]}x{size_tuple[1]}",
                    "format": fmt,
                    "elapsed_ms": round(elapsed_ms, 2),
                },
            )
            return response

    render_payload = {
        "title": title,
        "url": url,
    }
    if subtitle:
        render_payload["subtitle"] = subtitle
    if uniqueness_value is not None:
        render_payload["uniqueness"] = uniqueness_value
    if ari_value is not None:
        render_payload["ari"] = ari_value

    image = render_sharecard(render_payload, size_tuple)

    buffer = BytesIO()
    image.save(buffer, format=fmt)
    content = buffer.getvalue()

    response = Response(content=content, media_type=content_type)
    response.headers["ETag"] = etag_header
    response.headers["Cache-Control"] = "public, max-age=31536000, immutable"

    limiter_module.inject_rate_headers(response, request)
    if limiter_module.spike_header_active(request):
        response.headers["X-Fireseed-Spike"] = "true"

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        "sharecard.render",
        extra={
            "capsule_id": data.get("capsule_id"),
            "size": f"{size_tuple[0]}x{size_tuple[1]}",
            "format": fmt,
            "elapsed_ms": round(elapsed_ms, 2),
        },
    )

    return response
