from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient

from server.app import app

client = TestClient(app)
ETH = Path("data/ETHICS.md")
_ORIGINAL_CONTENT: str | None = None


def setup_module():
    ETH.parent.mkdir(parents=True, exist_ok=True)
    global _ORIGINAL_CONTENT
    if ETH.exists():
        _ORIGINAL_CONTENT = ETH.read_text(encoding="utf-8")
        ETH.unlink()


def teardown_module():
    if _ORIGINAL_CONTENT is not None:
        ETH.write_text(_ORIGINAL_CONTENT, encoding="utf-8")
    elif ETH.exists():
        ETH.unlink()


def test_ethics_404():
    if ETH.exists():
        ETH.unlink()
    response = client.get("/ethics")
    assert response.status_code == 404


def test_ethics_ok():
    ETH.write_text("# 数据伦理政策\n\n用户权利……\n", encoding="utf-8")
    response = client.get("/ethics")
    assert response.status_code == 200
    assert "text/html" in (response.headers.get("content-type") or "")
    assert "数据伦理政策" in response.text
