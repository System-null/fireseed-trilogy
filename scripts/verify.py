#!/usr/bin/env python3
from __future__ import annotations

import base64
import binascii
import sys
from pathlib import Path
from typing import Any

import orjson
from canonicaljson import encode_canonical_json
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey


def fail(reason: str) -> None:
    print(f"VERIFY FAIL: {reason}")
    sys.exit(1)


def load_capsule(path: Path) -> dict[str, Any]:
    try:
        data = orjson.loads(path.read_bytes())
    except FileNotFoundError as exc:
        fail(f"file not found: {exc.filename}")
    except orjson.JSONDecodeError as exc:
        fail(f"invalid json: {exc}")

    if not isinstance(data, dict):
        fail("capsule must be a JSON object")

    return data


def extract_signature(data: dict[str, Any]) -> bytes:
    raw_signature = data.pop("signature", None)
    if raw_signature is None:
        fail("missing signature")
    if not isinstance(raw_signature, str):
        fail("signature must be base64 string")

    try:
        signature = base64.b64decode(raw_signature, validate=True)
    except (ValueError, binascii.Error):
        fail("signature is not valid base64")

    return signature


def decode_pubkey(data: dict[str, Any]) -> VerifyKey:
    pubkey_b64 = data.get("author_pubkey")
    if pubkey_b64 is None:
        fail("missing author_pubkey")
    if not isinstance(pubkey_b64, str):
        fail("author_pubkey must be base64 string")

    try:
        pubkey_bytes = base64.b64decode(pubkey_b64, validate=True)
    except (ValueError, binascii.Error):
        fail("author_pubkey is not valid base64")

    try:
        return VerifyKey(pubkey_bytes)
    except Exception as exc:  # pragma: no cover - defensive
        fail(f"invalid ed25519 pubkey: {exc}")


def canonicalize(data: dict[str, Any]) -> bytes:
    try:
        return encode_canonical_json(data)
    except Exception as exc:  # pragma: no cover - library errors
        fail(f"canonicalization failed: {exc}")


def verify(path: Path) -> None:
    capsule = load_capsule(path)
    capsule_copy = dict(capsule)
    signature = extract_signature(capsule_copy)
    verify_key = decode_pubkey(capsule_copy)
    canonical_payload = canonicalize(capsule_copy)

    try:
        verify_key.verify(canonical_payload, signature)
    except BadSignatureError:
        fail("ed25519 verification failed")

    print("VERIFY OK")


def main(argv: list[str]) -> None:
    if len(argv) != 2:
        print("Usage: verify.py <capsule.json>")
        sys.exit(1)

    verify(Path(argv[1]))


if __name__ == "__main__":
    main(sys.argv)
