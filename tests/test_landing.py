import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import app as app_module
from server import landing as landing_module

DATA_DIR = landing_module.DATA_DIR


@pytest.fixture(autouse=True)
def reset_state():
    landing_module.CACHE.clear()
    yield
    landing_module.CACHE.clear()
    demo_json = DATA_DIR / "demo.json"
    if demo_json.exists():
        demo_json.unlink()
    expanded_md = DATA_DIR / "demo.expanded.md"
    if expanded_md.exists():
        expanded_md.unlink()


def write_demo_capsule(**overrides):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"title": "Fireseed Demo", "explanations": ["topk_mean"]}
    payload.update(overrides)
    capsule_path = DATA_DIR / "demo.json"
    capsule_path.write_text(json.dumps(payload), encoding="utf-8")


def test_landing_basic_meta():
    write_demo_capsule()
    client = TestClient(app_module.app)
    response = client.get("/landing/demo")

    assert response.status_code == 200
    html = response.text
    assert 'property="og:title" content="Fireseed Demo"' in html
    assert 'property="og:image" content="http' in html
    assert 'property="og:description"' in html


def test_landing_content_rendering():
    write_demo_capsule(subtitle="Hello Capsule")
    client = TestClient(app_module.app)
    response = client.get("/landing/demo")

    assert response.status_code == 200
    html = response.text
    assert "Fireseed Demo" in html
    assert "Hello Capsule" in html
    assert "topk_mean" in html


def test_landing_404_without_og_meta():
    client = TestClient(app_module.app)
    response = client.get("/landing/nonexistent")

    assert response.status_code == 404
    assert "property=\"og:" not in response.text


def test_landing_cache_hits_once(monkeypatch):
    write_demo_capsule()

    calls = {"count": 0}
    original_loader = landing_module.load_capsule_json

    def tracked_loader(capsule_id: str):
        calls["count"] += 1
        return original_loader(capsule_id)

    monkeypatch.setattr(landing_module, "load_capsule_json", tracked_loader)

    client = TestClient(app_module.app)
    first = client.get("/landing/demo")
    second = client.get("/landing/demo")

    assert first.status_code == 200
    assert second.status_code == 200
    assert calls["count"] == 1


@pytest.mark.parametrize("capsule_id", ["../../etc/passwd", "a b"])
def test_landing_rejects_illegal_ids(capsule_id):
    client = TestClient(app_module.app)
    response = client.get(f"/landing/{capsule_id}")
    assert response.status_code == 400


def test_landing_prefers_capsule_image(monkeypatch):
    write_demo_capsule()

    original_exists = Path.exists

    def _exists_proxy(self: Path) -> bool:
        if str(self).endswith(str(Path("static/og/demo.png"))):
            return True
        return original_exists(self)

    monkeypatch.setattr("pathlib.Path.exists", _exists_proxy)

    client = TestClient(app_module.app)
    response = client.get("/landing/demo")

    assert response.status_code == 200
    assert "property=\"og:image\" content=\"http://testserver/static/og/demo.png\"" in response.text
