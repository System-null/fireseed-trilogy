from __future__ import annotations

import logging
import time
from io import BytesIO
from typing import Any

import orjson
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ValidationError
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from fastapi.templating import Jinja2Templates
except Exception:
    Jinja2Templates = None  # type: ignore

from .metrics import (
    metrics_endpoint,
    score_latency_seconds,
    sharecard_errors_total,
    verification_failures_total,
)
from .logging import configure_logging

configure_logging()

logger = logging.getLogger(__name__)


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):  # type: ignore[override]
        start = time.perf_counter()
        path = request.url.path
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
        except Exception:
            raise
        finally:
            elapsed = time.perf_counter() - start
            if path == "/score":
                score_latency_seconds.observe(elapsed)
            if status >= 400:
                if path == "/sharecard":
                    sharecard_errors_total.inc()
                elif path in ("/appeal", "/pin"):
                    verification_failures_total.inc()
        return response

_templates: Any | None = None

def get_templates() -> Any | None:
    global _templates
    if _templates is not None:
        return _templates
    if Jinja2Templates is None:
        return None
    try:
        _templates = Jinja2Templates(directory="server/templates")
    except AssertionError as e:
        logger.warning("jinja2 unavailable: %s", e)
        _templates = None
    return _templates

from . import limiter as limiter_module
from .score import compute_uniqueness
from .landing import is_safe_id, render_landing
from .pin import pin_endpoint
from .status import pin_status
from .ethics import render_ethics
from .appeal import handle_appeal
try:
    from .sharecard import (
        ICON_SIZE,
        OG_SIZE,
        choose_format,
        compute_etag,
        render_sharecard,
    )
except ModuleNotFoundError as e:
    # 允许 CI 环境缺 Pillow 或 qrcode 时正常运行
    ICON_SIZE = OG_SIZE = (0, 0)
    choose_format = compute_etag = render_sharecard = None
    import warnings
    warnings.warn(f"Sharecard dependencies not available: {e}")

logger = logging.getLogger(__name__)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
try:
    from starlette.middleware.proxy_headers import ProxyHeadersMiddleware  # type: ignore
except Exception as e:
    ProxyHeadersMiddleware = None  # type: ignore
    logger.warning("ProxyHeadersMiddleware unavailable: %s", e)
if ProxyHeadersMiddleware is not None:
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

app.add_middleware(MetricsMiddleware)

# 注册 sharecard 路由（容错）
try:
    from server.sharecard import router as sharecard_router  # type: ignore
    app.include_router(sharecard_router, prefix="/sharecard")
except ModuleNotFoundError as e:
    # CI 环境未安装 Pillow 或 qrcode 时直接跳过
    logger.warning("sharecard route disabled due to missing dependency: %s", e)
except Exception as e:
    logger.warning("sharecard route disabled: %s", e)
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


@app.get("/metrics")
async def metrics_route(request: Request):
    return await metrics_endpoint(request)


@app.get("/ethics")
@limiter.limit("10/minute")
def ethics_page(request: Request):
    limiter_module.consume_request_context(request)
    response = render_ethics(request)
    limiter_module.inject_rate_headers(response, request)
    if limiter_module.spike_header_active(request):
        response.headers["X-Fireseed-Spike"] = "true"
    return response


@app.post("/appeal")
@limiter.limit("5/minute")
async def appeal_endpoint(request: Request):
    limiter_module.consume_request_context(request)
    if limiter_module.should_block_for_spike(request):
        response = JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
        limiter_module.inject_rate_headers(response, request)
        response.headers["X-Fireseed-Spike"] = "true"
        return response
    result = await handle_appeal(request)
    response = JSONResponse(result)
    limiter_module.inject_rate_headers(response, request)
    if limiter_module.spike_header_active(request):
        response.headers["X-Fireseed-Spike"] = "true"
    return response


@app.post("/pin")
@limiter.limit("5/minute")
async def pin_route(request: Request):
    limiter_module.consume_request_context(request)
    if limiter_module.should_block_for_spike(request):
        response = JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
        limiter_module.inject_rate_headers(response, request)
        response.headers["X-Fireseed-Spike"] = "true"
        return response
    background_tasks = BackgroundTasks()
    response = await pin_endpoint(request, background_tasks)
    response.background = background_tasks
    limiter_module.inject_rate_headers(response, request)
    if limiter_module.spike_header_active(request):
        response.headers["X-Fireseed-Spike"] = "true"
    return response


@app.get("/pin-status")
@limiter.limit("60/minute")
async def pin_status_route(request: Request):
    limiter_module.consume_request_context(request)
    response = await pin_status(request)
    limiter_module.inject_rate_headers(response, request)
    if limiter_module.spike_header_active(request):
        response.headers["X-Fireseed-Spike"] = "true"
    return response


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


@app.get("/landing/{capsule_id}")
@limiter.limit(limiter_module.score_limit_string)
async def landing_page(request: Request, capsule_id: str):
    if not is_safe_id(capsule_id):
        raise HTTPException(status_code=400, detail="invalid id")
    templates = get_templates()
    return await render_landing(request, capsule_id, templates)
