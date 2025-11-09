import json
import re
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import app as app_module
from server import landing as landing_module


@pytest.fixture
def landing_client(tmp_path, monkeypatch):
    monkeypatch.setattr(landing_module, "DATA_DIR", tmp_path)
    landing_module.CACHE.clear()
    client = TestClient(app_module.app)

    def create_capsule(
        capsule_id: str = "demo",
        *,
        data: dict | None = None,
        expanded: str | None = None,
    ) -> Path:
        payload = {
            "title": "Demo Capsule",
            "subtitle": "Subtitle",
            "uniqueness": 88,
            "ari": 42,
            "explanations": ["alpha", "beta"],
            "ipfs_cid": "bafyexample",
        }
        if data:
            payload.update(data)
        capsule_path = tmp_path / f"{capsule_id}.json"
        capsule_path.write_bytes(json.dumps(payload).encode("utf-8"))
        if expanded is not None:
            (tmp_path / f"{capsule_id}.expanded.md").write_text(
                expanded, encoding="utf-8", errors="ignore"
            )
        return capsule_path

    return client, create_capsule, tmp_path


def test_landing_success_has_og_meta(landing_client):
    client, create_capsule, _ = landing_client
    create_capsule(expanded="# Heading\nContent here.")

    response = client.get("/landing/demo")

    assert response.status_code == 200
    html = response.text
    assert re.search(r'<meta property="og:title" content="Demo Capsule"', html)
    assert re.search(
        r'<meta property="og:image" content="http://testserver/static/og/placeholder.png"',
        html,
    )
    assert '<meta property="og:description"' in html


def test_landing_body_contains_content(landing_client):
    client, create_capsule, _ = landing_client
    create_capsule()

    response = client.get("/landing/demo")

    assert response.status_code == 200
    html = response.text
    assert "<h1>Demo Capsule</h1>" in html
    assert "Subtitle" in html
    assert "Explanations" in html
    assert "alpha" in html


def test_landing_not_found_has_no_og_meta(landing_client):
    client, _, _ = landing_client

    response = client.get("/landing/missing")

    assert response.status_code == 404
    html = response.text
    assert "<title>Page Not Found</title>" in html
    assert "og:" not in html


def test_landing_cache_hit(monkeypatch, landing_client):
    client, create_capsule, _ = landing_client
    create_capsule()

    original_load = landing_module.load_capsule_json
    call_counter = {"count": 0}

    def fake_load(capsule_id: str):
        call_counter["count"] += 1
        return original_load(capsule_id)

    monkeypatch.setattr(landing_module, "load_capsule_json", fake_load)

    first = client.get("/landing/demo")
    second = client.get("/landing/demo")

    assert first.status_code == 200
    assert second.status_code == 200
    assert call_counter["count"] == 1


def test_landing_invalid_id_returns_400(landing_client):
    client, _, _ = landing_client

    response = client.get("/landing/invalid!id")

    assert response.status_code == 400


def test_landing_prefers_real_image(monkeypatch, landing_client):
    client, create_capsule, _ = landing_client
    create_capsule()

    original_exists = Path.exists
    target = Path("static/og/demo.png")

    def fake_exists(self: Path) -> bool:
        if self == target:
            return True
        return original_exists(self)

    monkeypatch.setattr(Path, "exists", fake_exists, raising=False)

    response = client.get("/landing/demo")

    assert response.status_code == 200
    html = response.text
    assert "/static/og/demo.png" in html
