from __future__ import annotations

import base64
import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient

from server.app import app


client = TestClient(app)
APPEALS = Path("data/appeals")


def _load_vector():
    return json.loads(Path("examples/vectors/pass.json").read_text(encoding="utf-8"))


def setup_module():
    APPEALS.mkdir(parents=True, exist_ok=True)


def teardown_module():
    for file in APPEALS.glob("*.json"):
        file.unlink()


def test_appeal_ok_and_idempotent():
    capsule = _load_vector()
    payload = {"id": "demo-appeal", "capsule": capsule}
    response1 = client.post("/appeal", json=payload)
    assert response1.status_code == 200
    assert response1.json() == {"ok": True, "id": "demo-appeal"}
    assert (APPEALS / "demo-appeal.json").exists()
    response2 = client.post("/appeal", json=payload)
    assert response2.status_code == 200


def test_appeal_bad_signature():
    capsule = _load_vector()
    bad = copy.deepcopy(capsule)
    signature_bytes = base64.b64decode(bad["signature"])
    bad["signature"] = base64.b64encode(signature_bytes[:-1] + bytes([signature_bytes[-1] ^ 0xFF])).decode()
    response = client.post("/appeal", json={"id": "bad-appeal", "capsule": bad})
    assert response.status_code == 400


def test_appeal_conflict():
    capsule = _load_vector()
    payload = {"id": "conflict-appeal", "capsule": capsule}
    client.post("/appeal", json=payload)
    modified = copy.deepcopy(capsule)
    modified["title"] = "Modified"
    response = client.post("/appeal", json={"id": "conflict-appeal", "capsule": modified})
    assert response.status_code == 409
