from __future__ import annotations

import os
import time
from collections import deque
from contextvars import ContextVar
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Deque, Dict

import orjson
import psutil
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import Response

CONFIG_PATH = Path(__file__).resolve().parents[1] / "config" / "security_v0.json"

if CONFIG_PATH.exists():
    _SECURITY_CONFIG: Dict[str, Dict] = orjson.loads(CONFIG_PATH.read_bytes())
else:  # pragma: no cover
    _SECURITY_CONFIG = {}

_RATE_LIMITS = _SECURITY_CONFIG.get("rate_limits", {})
_FEATURE_FLAGS = _SECURITY_CONFIG.get("feature_flags", {})
_SPIKE_CFG = _FEATURE_FLAGS.get("spike_detection", {}) or {}
_THROTTLE_ON_SPIKE = bool(_FEATURE_FLAGS.get("throttle_on_spike"))

_REQUEST_TIMESTAMPS: Deque[float] = deque()
_REQUEST_LOCK = Lock()
_SPIKE_LOCK = Lock()
_SPIKE_UNTIL = 0.0
_REQUEST_CONTEXT: ContextVar[Dict[str, object]] = ContextVar(
    "fireseed_rate_context", default={}
)


def load_rate_limit_config() -> Dict:
    return _RATE_LIMITS.get("/score", {})


@lru_cache(maxsize=1)
def get_limiter() -> Limiter:
    storage_uri = os.getenv("REDIS_URL") or "memory://"
    return Limiter(
        key_func=get_remote_address,
        storage_uri=storage_uri,
        headers_enabled=True,
    )


def record_request(window_seconds: int) -> int:
    now = time.time()
    with _REQUEST_LOCK:
        _REQUEST_TIMESTAMPS.append(now)
        while _REQUEST_TIMESTAMPS and now - _REQUEST_TIMESTAMPS[0] > window_seconds:
            _REQUEST_TIMESTAMPS.popleft()
        return len(_REQUEST_TIMESTAMPS)


def dynamic_limit(requests_in_window: int, cfg) -> float:
    window_seconds = int(cfg.get("window_seconds", 60) or 60)
    cpu_threshold = float(cfg.get("cpu_threshold_percent", 100))
    request_threshold = int(cfg.get("requests_threshold", requests_in_window + 1))
    now = time.time()

    with _SPIKE_LOCK:
        global _SPIKE_UNTIL
        if _SPIKE_UNTIL > now:
            return 0.5

    cpu_spike = psutil.cpu_percent(interval=0.0) >= cpu_threshold
    request_spike = requests_in_window >= request_threshold
    if cpu_spike or request_spike:
        with _SPIKE_LOCK:
            _SPIKE_UNTIL = now + window_seconds
        return 0.5

    with _SPIKE_LOCK:
        _SPIKE_UNTIL = 0.0
    return 1.0


def is_spike_active() -> bool:
    with _SPIKE_LOCK:
        return _SPIKE_UNTIL > time.time()


def score_limit_string() -> str:
    cfg = load_rate_limit_config()
    window_seconds = int(_SPIKE_CFG.get("window_seconds", 60) or 60)
    requests_in_window = record_request(window_seconds)
    prior_requests = max(0, requests_in_window - 1)

    factor = 1.0
    if _THROTTLE_ON_SPIKE and _SPIKE_CFG:
        factor = dynamic_limit(prior_requests, _SPIKE_CFG)
    spike_active = factor < 1.0 or is_spike_active()

    base_rpm = max(1, int(round(cfg.get("rpm", 60))))
    base_rpd = max(1, int(round(cfg.get("rpd", 1000))))
    burst = max(1, int(round(cfg.get("burst", base_rpm))))
    rpm = max(1, int(round(base_rpm * factor)))
    rpd = max(1, int(round(base_rpd * factor)))

    _REQUEST_CONTEXT.set(
        {
            "limits": {"rpm": rpm, "rpd": rpd, "burst": burst},
            "base_limits": {"rpm": base_rpm, "rpd": base_rpd},
            "spike": spike_active,
            "requests": requests_in_window,
            "prior_requests": prior_requests,
        }
    )
    return f"{base_rpm}/minute;{base_rpd}/day"


def spike_header_active(request: Request) -> bool:
    return bool(getattr(request.state, "fireseed_spike", False))


def get_rate_context(request: Request):
    return getattr(request.state, "view_rate_limit", None)


def inject_rate_headers(response: Response, request: Request) -> None:
    limiter = get_limiter()
    view_limits = get_rate_context(request)
    if view_limits is not None:
        limiter._inject_headers(response, view_limits)
    else:
        limits = getattr(request.state, "fireseed_rate_limit", None)
        if isinstance(limits, dict) and limits:
            response.headers.setdefault("X-RateLimit-Limit", str(limits.get("rpm", "")))
            response.headers.setdefault("X-RateLimit-Remaining", "0")
            reset = int(time.time() + float(_SPIKE_CFG.get("window_seconds", 60) or 60))
            response.headers.setdefault("X-RateLimit-Reset", str(reset))


def consume_request_context(request: Request) -> None:
    context = _REQUEST_CONTEXT.get({})
    if context:
        request.state.fireseed_spike = bool(context.get("spike"))
        request.state.fireseed_rate_limit = context.get("limits", {})
        request.state.fireseed_base_rate_limit = context.get("base_limits", {})
        request.state.fireseed_requests = context.get("requests", 0)
        request.state.fireseed_prior_requests = context.get("prior_requests", 0)
    else:
        request.state.fireseed_spike = is_spike_active()
        request.state.fireseed_rate_limit = {}
        request.state.fireseed_base_rate_limit = {}
        request.state.fireseed_requests = 0
        request.state.fireseed_prior_requests = 0
    _REQUEST_CONTEXT.set({})


def should_block_for_spike(request: Request) -> bool:
    if not bool(getattr(request.state, "fireseed_spike", False)):
        return False
    limits = getattr(request.state, "fireseed_rate_limit", {}) or {}
    scaled_rpm = limits.get("rpm")
    prior = getattr(request.state, "fireseed_prior_requests", 0)
    if isinstance(scaled_rpm, int) and scaled_rpm > 0:
        return prior >= scaled_rpm
    return False
