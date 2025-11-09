from __future__ import annotations

from starlette.responses import Response

try:
    from prometheus_client import Histogram, Counter, generate_latest, CONTENT_TYPE_LATEST

    _PROM_OK = True
except Exception:  # pragma: no cover - fallback path
    _PROM_OK = False
    CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"

    def generate_latest() -> bytes:  # type: ignore[override]
        return b"# HELP metrics_disabled\n# TYPE metrics_disabled gauge\nmetrics_disabled 1\n"

    class _Noop:
        def observe(self, *args, **kwargs):  # pragma: no cover - noop
            ...

        def inc(self, *args, **kwargs):  # pragma: no cover - noop
            ...

if _PROM_OK:
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
else:  # pragma: no cover - fallback path
    score_latency_seconds = _Noop()  # type: ignore[assignment]
    verification_failures_total = _Noop()  # type: ignore[assignment]
    sharecard_errors_total = _Noop()  # type: ignore[assignment]


async def metrics_endpoint(request):  # type: ignore[override]
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
