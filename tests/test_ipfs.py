import base64
import os
from pathlib import Path
import sys
from typing import Any, Dict

import orjson
from fastapi.testclient import TestClient
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server.app import app
from server.pin import _probe_and_write

client = TestClient(app)
PINS = Path("data/pins")
V_PASS = Path("examples/vectors/pass.json")


def setup_module() -> None:
    PINS.mkdir(parents=True, exist_ok=True)


def teardown_module() -> None:
    for file_path in PINS.glob("*.json"):
        file_path.unlink()
    for env_key in ["IPFS_API_URL", "WEB3_STORAGE_TOKEN", "IPFS_GATEWAY_LOCAL"]:
        os.environ.pop(env_key, None)


def _load_pass_capsule() -> Dict[str, Any]:
    return orjson.loads(V_PASS.read_bytes())


def test_pin_disabled() -> None:
    response = client.post("/pin", json={"id": "test", "capsule": {"some": "data"}})
    assert response.status_code == 503
    assert response.json().get("detail") == "pinning_disabled"


def test_pin_status_gateways(monkeypatch) -> None:
    def fake_head(url, **kwargs):
        status = 200 if "ipfs.io" in url else 404
        return Mock(status_code=status)

    monkeypatch.setattr("server.status.requests.head", fake_head)
    cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
    response = client.get(f"/pin-status?cid={cid}")
    assert response.status_code == 200
    assert response.json() == {"ipfs_io": True, "cloudflare": False, "local": False}


def test_pin_local_ok(monkeypatch) -> None:
    os.environ["IPFS_API_URL"] = "http://ipfs.local/api/v0"

    def fake_post(url, **kwargs):
        ndjson = "\n".join(
            [
                '{"Name":"cap.json"}',
                '{"Name":"expanded.md"}',
                '{"Hash":"bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"}',
            ]
        )
        return Mock(status_code=200, text=ndjson)

    monkeypatch.setattr("server.pin.requests.post", fake_post)

    capsule = _load_pass_capsule()
    response = client.post("/pin", json={"id": capsule.get("capsule_id", "demo"), "capsule": capsule})
    assert response.status_code == 200
    data = response.json()
    assert data["queued"] is True
    cid = data["cid"]
    assert (PINS / f"{cid}.json").exists()


def test_pin_verify_fail(monkeypatch) -> None:
    os.environ["IPFS_API_URL"] = "http://ipfs.local/api/v0"

    def fake_post(url, **kwargs):
        return Mock(status_code=200, text='{"Hash":"bafy..."}')

    monkeypatch.setattr("server.pin.requests.post", fake_post)

    bad_capsule = _load_pass_capsule()
    signature = base64.b64decode(bad_capsule["signature"])
    tampered = signature[:-1] + bytes([signature[-1] ^ 0xFF])
    bad_capsule["signature"] = base64.b64encode(tampered).decode()

    response = client.post("/pin", json={"id": bad_capsule.get("capsule_id", "bad"), "capsule": bad_capsule})
    assert response.status_code == 400


def test_background_probe_writes_status(monkeypatch) -> None:
    def fake_probe(cid: str) -> Dict[str, bool]:
        return {"ipfs_io": True, "cloudflare": True, "local": False}

    monkeypatch.setattr("server.status.probe_gateways", fake_probe)

    cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
    initial = {"cid": cid, "id": "test", "status": "queued"}
    (PINS / f"{cid}.json").write_bytes(orjson.dumps(initial))

    _probe_and_write(cid)

    updated = orjson.loads((PINS / f"{cid}.json").read_bytes())
    assert updated["status"] == "ok"
    assert updated["gateways"]["ipfs_io"] is True
