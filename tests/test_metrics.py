from __future__ import annotations

from pathlib import Path
import sys

from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from server.app import app


client = TestClient(app)


def test_metrics_returns_prometheus_format() -> None:
    response = client.get("/metrics")
    assert response.status_code == 200
    content_type = response.headers.get("content-type", "")
    assert "text/plain" in content_type
    body = response.text
    assert "# HELP score_latency_seconds" in body
    assert "verification_failures_total" in body
    assert "sharecard_errors_total" in body
