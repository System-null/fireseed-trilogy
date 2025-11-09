from __future__ import annotations

from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Histogram,
    generate_latest,
)
from starlette.requests import Request
from starlette.responses import Response

score_latency_seconds = Histogram(
    "score_latency_seconds",
    "Latency of /score requests in seconds",
    buckets=[0.05, 0.1, 0.2, 0.5, 1.0, 2.0],
)
verification_failures_total = Counter(
    "verification_failures_total",
    "Count of verification failures",
)
sharecard_errors_total = Counter(
    "sharecard_errors_total",
    "Count of sharecard render errors",
)


async def metrics_endpoint(request: Request) -> Response:
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
