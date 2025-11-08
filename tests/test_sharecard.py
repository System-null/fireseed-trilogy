import sys
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image, features

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import app as app_module  # noqa: E402

OG = (1200, 630)
ICON = (512, 512)

payload = {
    "title": "火种 Fireseed：系统外者",
    "url": "https://example.com/capsule/123",
    "subtitle": "Uniq 87 · ARI 62",
    "uniqueness": 87,
    "ari": 62,
}


def _open_image(content: bytes) -> Image.Image:
    return Image.open(BytesIO(content))


def test_sharecard_webp_negotiation():
    client = TestClient(app_module.app)
    headers = {"Accept": "image/webp,image/*;q=0.8"}
    response = client.post("/sharecard", json=payload, headers=headers)
    assert response.status_code == 200
    expected_content_type = "image/webp" if features.check("webp") else "image/png"
    assert response.headers["Content-Type"] == expected_content_type
    with _open_image(response.content) as img:
        assert img.size == OG


def test_sharecard_png_icon_size():
    client = TestClient(app_module.app)
    response = client.post(
        "/sharecard",
        json={**payload, "format": "png", "size": "512x512"},
    )
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "image/png"
    with _open_image(response.content) as img:
        assert img.size == ICON


def test_sharecard_etag_caching():
    client = TestClient(app_module.app)
    first = client.post("/sharecard", json=payload)
    assert first.status_code == 200
    etag = first.headers.get("ETag")
    assert etag
    second = client.post("/sharecard", json=payload, headers={"If-None-Match": etag})
    assert second.status_code == 304
    assert second.content == b""


def test_sharecard_missing_required_fields():
    client = TestClient(app_module.app)
    missing_title = client.post("/sharecard", json={"url": payload["url"]})
    assert missing_title.status_code == 400
    missing_url = client.post("/sharecard", json={"title": payload["title"]})
    assert missing_url.status_code == 400


def test_sharecard_font_fallback(monkeypatch):
    client = TestClient(app_module.app)
    monkeypatch.setattr("server.sharecard.Path.exists", lambda self: False)
    response = client.post("/sharecard", json=payload)
    assert response.status_code == 200
    with _open_image(response.content) as img:
        width, height = img.size
        crop = img.crop((0, int(height * 0.75), int(width * 0.25), height))
        assert crop.getcolors(maxcolors=1_000_000) is not None


def test_sharecard_qr_presence():
    client = TestClient(app_module.app)
    response = client.post("/sharecard", json=payload)
    assert response.status_code == 200
    with _open_image(response.content) as img:
        width, height = img.size
        crop = img.crop((int(width * 0.75), int(height * 0.75), width, height))
        assert crop.getcolors(maxcolors=1_000_000) is not None
