import importlib
import sys
from pathlib import Path

import pytest

pytest.importorskip("prometheus_client", reason="metrics are optional in CI")

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    app = importlib.import_module("server.app").app
except Exception:
    pytest.skip("server package not importable in minimal CI", allow_module_level=True)

client = TestClient(app)


def test_metrics_returns_prometheus_format():
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")
    text = response.text
    assert "# HELP score_latency_seconds" in text
    assert "verification_failures_total" in text
    assert "sharecard_errors_total" in text
