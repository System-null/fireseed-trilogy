from __future__ import annotations

import os
import json
from pathlib import Path
from typing import Callable
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
from fastapi.testclient import TestClient

from server import app as app_module
from server import landing as landing_module

client = TestClient(app_module.app)
DATA_DIR = landing_module.DATA_DIR


def _write_capsule(payload: dict[str, object]) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / "demo.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


@pytest.fixture(autouse=True)
def _clear_cache() -> None:
    yield
    landing_module.CACHE.clear()
    demo_json = DATA_DIR / "demo.json"
    if demo_json.exists():
        demo_json.unlink()
    expanded = DATA_DIR / "demo.expanded.md"
    if expanded.exists():
        expanded.unlink()


def test_landing_success_renders_meta() -> None:
    _write_capsule(
        {
            "title": "Demo Capsule",
            "subtitle": "Subtitle information",
            "uniqueness": 88,
            "ari": 64,
            "explanations": ["Reason one", "Reason two"],
        }
    )
    (DATA_DIR / "demo.expanded.md").write_text("## 深入解读\n这是补充描述。", encoding="utf-8")

    response = client.get("/landing/demo")
    assert response.status_code == 200
    html = response.text
    assert "<meta property=\"og:title\" content=\"Demo Capsule\"" in html
    assert "http://testserver/static/og/placeholder.png" in html
    assert "数据伦理" in html
    assert "Reason one" in html


def test_landing_missing_capsule_returns_404() -> None:
    response = client.get("/landing/missing")
    assert response.status_code == 404
    html = response.text
    assert "<title>Page Not Found</title>" in html
    assert "og:" not in html


def test_landing_invalid_id() -> None:
    response = client.get("/landing/demo!invalid")
    assert response.status_code == 400


def test_landing_cache_hits(monkeypatch: pytest.MonkeyPatch) -> None:
    _write_capsule({"title": "Demo Capsule", "explanations": ["Reason"]})
    call_count = 0

    original = landing_module.load_capsule_json

    def _wrapped(capsule_id: str) -> dict[str, object]:
        nonlocal call_count
        call_count += 1
        return original(capsule_id)

    monkeypatch.setattr(landing_module, "load_capsule_json", _wrapped)
    landing_module.CACHE.clear()

    first = client.get("/landing/demo")
    assert first.status_code == 200
    second = client.get("/landing/demo")
    assert second.status_code == 200
    assert call_count == 1


def test_landing_cache_refresh_on_mtime(monkeypatch: pytest.MonkeyPatch) -> None:
    path = _write_capsule({"title": "Demo Capsule", "explanations": ["Reason"]})
    call_count = 0
    original = landing_module.load_capsule_json

    def _wrapped(capsule_id: str) -> dict[str, object]:
        nonlocal call_count
        call_count += 1
        return original(capsule_id)

    monkeypatch.setattr(landing_module, "load_capsule_json", _wrapped)
    landing_module.CACHE.clear()

    first = client.get("/landing/demo")
    assert first.status_code == 200
    assert call_count == 1

    path.write_text(json.dumps({"title": "Demo Capsule Updated"}), encoding="utf-8")
    os.utime(path, None)

    second = client.get("/landing/demo")
    assert second.status_code == 200
    assert call_count == 2


def test_landing_og_image_prefers_specific(monkeypatch: pytest.MonkeyPatch) -> None:
    _write_capsule({"title": "Demo Capsule"})

    original_exists: Callable[[Path], bool] = Path.exists

    def _exists_proxy(self: Path) -> bool:  # type: ignore[override]
        if str(self).endswith("static/og/demo.png"):
            return True
        return original_exists(self)

    monkeypatch.setattr("pathlib.Path.exists", _exists_proxy)

    response = client.get("/landing/demo")
    assert response.status_code == 200
    assert "/static/og/demo.png" in response.text
