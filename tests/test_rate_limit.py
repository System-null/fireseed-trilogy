from collections import deque
import sys
from pathlib import Path

import numpy as np
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import app as app_module
from server import limiter as limiter_module
from server import score as score_module


class FakeModel:
    def encode(self, texts, **kwargs):
        dim = 384
        return np.zeros((len(texts), dim), dtype=np.float32)


class FakeIndex:
    ntotal = 0

    def search(self, vecs, k):
        batch = vecs.shape[0]
        return (
            np.zeros((batch, k), dtype=np.float32),
            np.zeros((batch, k), dtype=np.int64),
        )


def test_rate_limiting_with_spike(monkeypatch):
    monkeypatch.setattr(score_module, "get_model", lambda: FakeModel())
    monkeypatch.setattr(score_module, "get_index", lambda: FakeIndex())
    monkeypatch.setattr(limiter_module, "load_rate_limit_config", lambda: {"rpm": 2, "rpd": 10, "burst": 2})
    monkeypatch.setattr(limiter_module, "_REQUEST_TIMESTAMPS", deque())
    monkeypatch.setattr(limiter_module, "_SPIKE_UNTIL", 0.0)
    monkeypatch.setattr(
        limiter_module,
        "_SPIKE_CFG",
        {"window_seconds": 60, "requests_threshold": 2, "cpu_threshold_percent": 95},
    )
    monkeypatch.setattr(limiter_module.psutil, "cpu_percent", lambda interval: 90)

    client = TestClient(app_module.app)

    first = client.post("/score", json={"text": "hello"})
    second = client.post("/score", json={"text": "world"})
    third = client.post("/score", json={"text": "fireseed"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert third.status_code == 429
    assert any(h.lower().startswith("x-ratelimit-") for h in third.headers)
    assert third.headers.get("X-Fireseed-Spike") == "true"
