from __future__ import annotations

import base64
import binascii
import logging
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import canonicaljson
import orjson
import requests
from fastapi import BackgroundTasks, HTTPException, Request
from fastapi.responses import JSONResponse
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from .status import probe_gateways

logger = logging.getLogger(__name__)

_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_BASE_DIR = Path(__file__).resolve().parents[1]
_PINS_DIR = _BASE_DIR / "data" / "pins"
_SECURITY_PATH = _BASE_DIR / "config" / "security_v0.json"
_DEFAULT_LIMITS = {"max_capsule_size_kb": 256, "max_expanded_size_kb": 512}


def _load_limits() -> Dict[str, int]:
    try:
        payload = orjson.loads(_SECURITY_PATH.read_bytes())
    except FileNotFoundError:
        return dict(_DEFAULT_LIMITS)
    except orjson.JSONDecodeError:
        return dict(_DEFAULT_LIMITS)
    result = dict(_DEFAULT_LIMITS)
    if isinstance(payload, dict):
        for key in ("max_capsule_size_kb", "max_expanded_size_kb"):
            value = payload.get(key)
            if isinstance(value, int) and value > 0:
                result[key] = value
    return result


_LIMITS = _load_limits()


def _ensure_enabled() -> None:
    if not os.getenv("IPFS_API_URL") and not os.getenv("WEB3_STORAGE_TOKEN"):
        raise HTTPException(status_code=503, detail="pinning_disabled")


def _validate_request(data: Dict[str, Any]) -> tuple[str, Dict[str, Any], str | None]:
    capsule_id = data.get("id")
    if not isinstance(capsule_id, str) or not _ID_PATTERN.fullmatch(capsule_id):
        raise HTTPException(status_code=400, detail="invalid_id")

    capsule = data.get("capsule")
    if not isinstance(capsule, dict):
        raise HTTPException(status_code=400, detail="invalid_capsule")

    capsule_bytes = orjson.dumps(capsule)
    if len(capsule_bytes) > _LIMITS["max_capsule_size_kb"] * 1024:
        raise HTTPException(status_code=400, detail="capsule_too_large")

    expanded = data.get("expanded")
    if expanded is not None:
        if not isinstance(expanded, str):
            raise HTTPException(status_code=400, detail="invalid_expanded")
        expanded_bytes = expanded.encode("utf-8")
        if len(expanded_bytes) > _LIMITS["max_expanded_size_kb"] * 1024:
            raise HTTPException(status_code=400, detail="expanded_too_large")
    else:
        expanded = None

    return capsule_id, capsule, expanded


def _verify_capsule_signature(capsule: Dict[str, Any]) -> None:
    signature_b64 = capsule.get("signature")
    if not isinstance(signature_b64, str):
        raise HTTPException(status_code=400, detail="invalid_signature")
    try:
        signature = base64.b64decode(signature_b64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="invalid_signature") from exc

    public_key_b64 = capsule.get("author_pubkey")
    if not isinstance(public_key_b64, str):
        raise HTTPException(status_code=400, detail="invalid_signature")
    try:
        verify_key = VerifyKey(base64.b64decode(public_key_b64, validate=True))
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="invalid_signature") from exc

    capsule_copy = dict(capsule)
    capsule_copy.pop("signature", None)
    message = canonicaljson.encode_canonical_json(capsule_copy)
    try:
        verify_key.verify(message, signature)
    except BadSignatureError as exc:
        raise HTTPException(status_code=400, detail="invalid_signature") from exc


def _post_ipfs_local(capsule: Dict[str, Any], expanded: str | None) -> str | None:
    base_url = os.getenv("IPFS_API_URL")
    if not base_url:
        return None
    trimmed = base_url.rstrip("/")
    if trimmed.endswith("/api/v0"):
        endpoint = f"{trimmed}/add?pin=true&wrap-with-directory=true"
    else:
        endpoint = f"{trimmed}/api/v0/add?pin=true&wrap-with-directory=true"

    files = [
        ("file", ("cap.json", orjson.dumps(capsule), "application/json")),
    ]
    if expanded is not None:
        files.append(("file", ("expanded.md", expanded.encode("utf-8"), "text/markdown")))

    try:
        response = requests.post(endpoint, files=files, timeout=10)
    except requests.RequestException:
        logger.warning("ipfs add failed", extra={"backend": "local", "error_code": "network"})
        return None
    if response.status_code != 200:
        logger.warning(
            "ipfs add http error",
            extra={"backend": "local", "error_code": response.status_code},
        )
        return None

    cid = None
    for line in response.text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            parsed = orjson.loads(line)
        except orjson.JSONDecodeError:
            continue
        hash_value = parsed.get("Hash") if isinstance(parsed, dict) else None
        if isinstance(hash_value, str):
            cid = hash_value
    return cid


def _post_web3_storage(capsule: Dict[str, Any], expanded: str | None) -> str | None:
    token = os.getenv("WEB3_STORAGE_TOKEN")
    if not token:
        return None
    files = [
        ("file", ("cap.json", orjson.dumps(capsule), "application/json")),
    ]
    if expanded is not None:
        files.append(("file", ("expanded.md", expanded.encode("utf-8"), "text/markdown")))

    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.post("https://api.web3.storage/upload", files=files, headers=headers, timeout=10)
    except requests.RequestException:
        logger.warning(
            "web3.storage upload failed",
            extra={"backend": "web3", "error_code": "network"},
        )
        return None
    if response.status_code >= 400:
        logger.warning(
            "web3.storage http error",
            extra={"backend": "web3", "error_code": response.status_code},
        )
        return None
    try:
        payload = orjson.loads(response.content)
    except orjson.JSONDecodeError:
        return None
    cid = payload.get("cid") if isinstance(payload, dict) else None
    return cid if isinstance(cid, str) else None


def _atomic_write(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_bytes(content)
    tmp_path.replace(path)


def _write_initial_record(cid: str, capsule_id: str) -> None:
    record = {
        "cid": cid,
        "id": capsule_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "queued",
    }
    _atomic_write(_PINS_DIR / f"{cid}.json", orjson.dumps(record))


def _update_record_with_gateways(cid: str, gateways: Dict[str, bool]) -> None:
    path = _PINS_DIR / f"{cid}.json"
    existing: Dict[str, Any] = {"cid": cid}
    try:
        existing_bytes = path.read_bytes()
        existing = orjson.loads(existing_bytes)
        if not isinstance(existing, dict):
            existing = {"cid": cid}
    except FileNotFoundError:
        existing = {"cid": cid}
    except orjson.JSONDecodeError:
        existing = {"cid": cid}

    existing.update({
        "status": "ok",
        "gateways": gateways,
    })
    _atomic_write(path, orjson.dumps(existing))


def _probe_and_write(cid: str) -> None:
    try:
        gateways = probe_gateways(cid)
    except Exception:  # pragma: no cover - defensive logging
        logger.warning("probe gateways failed", extra={"cid": cid, "error_code": "exception"})
        return
    _update_record_with_gateways(cid, gateways)


async def pin_endpoint(request: Request, background_tasks: BackgroundTasks) -> JSONResponse:
    _ensure_enabled()

    body = await request.body()
    try:
        payload = orjson.loads(body) if body else {}
    except orjson.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="invalid_json") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid_body")

    capsule_id, capsule, expanded_text = _validate_request(payload)
    _verify_capsule_signature(capsule)

    start_time = time.monotonic()
    cid = _post_ipfs_local(capsule, expanded_text)
    backend = "local"
    if not cid:
        cid = _post_web3_storage(capsule, expanded_text)
        backend = "web3"
    if not cid:
        logger.error("pin failed", extra={"id": capsule_id, "backend": backend, "error_code": "pin_failed"})
        raise HTTPException(status_code=502, detail="pin_failed")

    duration = time.monotonic() - start_time
    logger.info(
        "pin queued",
        extra={"cid": cid, "id": capsule_id, "backend": backend, "duration": round(duration, 4)},
    )

    _write_initial_record(cid, capsule_id)
    background_tasks.add_task(_probe_and_write, cid)

    return JSONResponse({"cid": cid, "queued": True})
