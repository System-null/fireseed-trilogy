import sys
from pathlib import Path

import numpy as np
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import app as app_module
from server import score as score_module

DIM = 384


class FakeModel:
    def encode(self, texts, **kwargs):
        return np.zeros((len(texts), DIM), dtype=np.float32)


class FakeIndex:
    ntotal = 0

    def search(self, vecs, k):
        batch = vecs.shape[0]
        return (
            np.zeros((batch, k), dtype=np.float32),
            np.zeros((batch, k), dtype=np.int64),
        )


def test_score_endpoint_with_empty_index(monkeypatch):
    monkeypatch.setattr(score_module, "get_model", lambda: FakeModel())
    fake_index = FakeIndex()
    monkeypatch.setattr(score_module, "get_index", lambda: fake_index)

    client = TestClient(app_module.app)
    response = client.post("/score", json={"text": "hello"})

    assert response.status_code == 200
    payload = response.json()
    assert 0 <= payload["uniqueness"] <= 100
    assert "topk_mean" in payload["explanations"]
    assert "normalized_cosine" in payload["explanations"]
    assert payload["uniqueness"] == 100
    assert "empty_index_fallback" in payload["explanations"]
