from starlette.responses import Response

try:
    from prometheus_client import (
        CONTENT_TYPE_LATEST,
        Counter,
        Histogram,
        generate_latest,
    )
    _PROM_AVAILABLE = True
except Exception:  # pragma: no cover - fallback path
    _PROM_AVAILABLE = False
    CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"

    def generate_latest() -> bytes:  # type: ignore[override]
        return b"# metrics_disabled 1\n"

if _PROM_AVAILABLE:
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
else:
    class _Noop:
        def observe(self, *args, **kwargs) -> None:  # noqa: D401
            """No-op observe."""

        def inc(self, *args, **kwargs) -> None:  # noqa: D401
            """No-op inc."""

    score_latency_seconds = _Noop()
    verification_failures_total = _Noop()
    sharecard_errors_total = _Noop()


async def metrics_endpoint(request):  # type: ignore[override]
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
