from __future__ import annotations

import logging
import orjson
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from slowapi.errors import RateLimitExceeded

from . import limiter as limiter_module
from .score import compute_uniqueness

logger = logging.getLogger(__name__)

app = FastAPI()

limiter = limiter_module.get_limiter()
app.state.limiter = limiter

try:
    from server.sharecard import router as sharecard_router  # type: ignore

    app.include_router(sharecard_router, prefix="/sharecard")
except Exception as e:  # pragma: no cover - best effort optional dependency
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
