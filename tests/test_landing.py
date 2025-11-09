from __future__ import annotations

import sys
from pathlib import Path
from typing import Generator

import json
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import app as app_module  # noqa: E402
from server import landing as landing_module  # noqa: E402

ROOT_DIR = Path(__file__).resolve().parents[1]
CAPSULES_DIR = ROOT_DIR / "data" / "capsules"
CAPSULES_DIR.mkdir(parents=True, exist_ok=True)

DEMO_CAPSULE_PATH = CAPSULES_DIR / "demo.json"
DEMO_CAPSULE_PATH.write_text(
    json.dumps(
        {
            "title": "Demo Capsule",
            "explanations": ["Alpha insight"],
            "uniqueness": 87,
        },
        ensure_ascii=False,
    ),
    encoding="utf-8",
)


@pytest.fixture(autouse=True)
def clear_cache() -> Generator[None, None, None]:
    landing_module.CACHE.clear()
    yield
    landing_module.CACHE.clear()


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    with TestClient(app_module.app) as client_instance:
        yield client_instance


def test_landing_meta_tags(client: TestClient) -> None:
    response = client.get("/landing/demo")
    assert response.status_code == 200
    body = response.text
    assert '<meta property="og:title" content="Demo Capsule">' in body
    assert '<meta property="og:image" content="http' in body
    assert '<meta property="og:description"' in body


def test_landing_body_content(client: TestClient) -> None:
    response = client.get("/landing/demo")
    assert response.status_code == 200
    text = response.text
    assert "Demo Capsule" in text
    assert "Alpha insight" in text


def test_landing_not_found_has_no_og_meta(client: TestClient) -> None:
    response = client.get("/landing/nonexistent")
    assert response.status_code == 404
    assert "og:" not in response.text


def test_landing_cache_hits_once(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    call_count = {"count": 0}
    original_loader = landing_module.load_capsule_json

    def _loader(module: object, path: Path):
        call_count["count"] += 1
        return original_loader(module, path)

    monkeypatch.setattr(landing_module, "load_capsule_json", _loader)

    first = client.get("/landing/demo")
    assert first.status_code == 200
    second = client.get("/landing/demo")
    assert second.status_code == 200
    assert call_count["count"] == 1


def test_landing_rejects_invalid_ids(client: TestClient) -> None:
    for bad in ("../../etc/passwd", "a b"):
        response = client.get(f"/landing/{bad}")
        assert response.status_code == 400


def test_landing_uses_specific_og_image_when_exists(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    original_exists = Path.exists

    def _exists_proxy(self: Path) -> bool:  # type: ignore[override]
        if str(self).endswith("static/og/demo.png"):
            return True
        return original_exists(self)

    monkeypatch.setattr("pathlib.Path.exists", _exists_proxy)

    response = client.get("/landing/demo")
    assert response.status_code == 200
    assert '<meta property="og:image" content="http://testserver/static/og/demo.png"' in response.text
