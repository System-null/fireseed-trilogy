import pytest
from fastapi.testclient import TestClient

from server.app import app

pytest.importorskip("prometheus_client")

client = TestClient(app)


def test_metrics_returns_prometheus_format():
    response = client.get("/metrics")
    assert response.status_code == 200
    content_type = response.headers.get("content-type", "")
    assert "text/plain" in content_type
    text = response.text
    assert "# HELP score_latency_seconds" in text
    assert "verification_failures_total" in text
    assert "sharecard_errors_total" in text
