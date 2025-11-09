from __future__ import annotations

import base64
import re
from pathlib import Path

import orjson
from canonicaljson import encode_canonical_json
from fastapi import HTTPException, Request
from nacl.signing import VerifyKey


APPEALS_DIR = Path("data/appeals")


async def handle_appeal(request: Request):
    raw = await request.body()
    if len(raw) > 256 * 1024:
        raise HTTPException(413, "request_too_large")
    try:
        data = orjson.loads(raw)
    except Exception as exc:  # pragma: no cover - defensive, tested via response
        raise HTTPException(400, "bad_json") from exc

    cid = data.get("id", "")
    if not isinstance(cid, str) or not re.fullmatch(r"^[A-Za-z0-9_-]{1,64}$", cid or ""):
        raise HTTPException(400, "bad_id")

    capsule = data.get("capsule", {})
    if not isinstance(capsule, dict):
        raise HTTPException(400, "bad_capsule")

    author_pubkey_b64 = capsule.get("author_pubkey")
    signature_b64 = capsule.get("signature")
    if not author_pubkey_b64 or not signature_b64:
        raise HTTPException(400, "missing_pubkey_or_signature")

    can_obj = dict(capsule)
    can_obj.pop("signature", None)
    canonical_bytes = encode_canonical_json(can_obj)

    APPEALS_DIR.mkdir(parents=True, exist_ok=True)
    path = APPEALS_DIR / f"{cid}.json"
    if path.exists():
        old = orjson.loads(path.read_bytes())
        old_capsule = old.get("capsule", {}) if isinstance(old, dict) else {}
        old_can = encode_canonical_json(dict(old_capsule, signature=None))
        new_can = encode_canonical_json(dict(capsule, signature=None))
        if old_can == new_can:
            return {"ok": True, "id": cid}
        raise HTTPException(409, "conflict")

    try:
        pk = base64.b64decode(author_pubkey_b64)
        sig = base64.b64decode(signature_b64)
        VerifyKey(pk).verify(canonical_bytes, sig)
    except Exception as exc:  # pragma: no cover - defensive, tested via response
        raise HTTPException(400, "verify_failed") from exc

    payload = {"id": cid, "capsule": capsule}

    try:
        with open(path, "xb") as file:
            file.write(orjson.dumps(payload))
        return {"ok": True, "id": cid}
    except FileExistsError:
        # A race between exists() and open in rare cases: fall back to conflict check
        old = orjson.loads(path.read_bytes())
        old_capsule = old.get("capsule", {}) if isinstance(old, dict) else {}
        old_can = encode_canonical_json(dict(old_capsule, signature=None))
        new_can = encode_canonical_json(dict(capsule, signature=None))
        if old_can == new_can:
            return {"ok": True, "id": cid}
        raise HTTPException(409, "conflict")
