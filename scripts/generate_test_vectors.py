#!/usr/bin/env python3
from __future__ import annotations

import base64
import copy
import hashlib
from pathlib import Path
from typing import Any

import orjson
from canonicaljson import encode_canonical_json
from nacl.signing import SigningKey

TIMESTAMP = "2000-01-01T00:00:00Z"
KEY_A_SEED = hashlib.sha256(b"fireseed-trilogy-key-a").digest()
KEY_B_SEED = hashlib.sha256(b"fireseed-trilogy-key-b").digest()


def b64encode(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def dump_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_bytes(
        orjson.dumps(
            payload,
            option=orjson.OPT_INDENT_2 | orjson.OPT_SORT_KEYS,
        )
        + b"\n"
    )


def canonical_payload(data: dict[str, Any]) -> bytes:
    return encode_canonical_json(data)


def ensure_base_capsule(path: Path, template: dict[str, Any]) -> dict[str, Any]:
    path.parent.mkdir(parents=True, exist_ok=True)
    dump_json(path, template)
    return orjson.loads(path.read_bytes())


def sign_capsule(signing_key: SigningKey, capsule: dict[str, Any]) -> str:
    payload_bytes = canonical_payload(capsule)
    signature = signing_key.sign(payload_bytes).signature
    return b64encode(signature)


def generate_vectors(root: Path) -> None:
    key_a = SigningKey(KEY_A_SEED)
    key_b = SigningKey(KEY_B_SEED)

    key_a_pub = b64encode(key_a.verify_key.encode())
    key_b_pub = b64encode(key_b.verify_key.encode())

    base_template: dict[str, Any] = {
        "version": "capsule_v0",
        "capsule_id": "capsule-min-example",
        "author": {
            "name": "Capsule MVP",
            "email": "capsule@example.com",
        },
        "author_pubkey": key_a_pub,
        "issued_at": TIMESTAMP,
        "payload": {
            "message": "Fireseed Trilogy signing test capsule.",
            "principles": [
                "preserve knowledge",
                "ensure authenticity",
            ],
            "nonce": 42,
        },
    }

    base_path = root / "examples" / "capsule_min.json"
    base_capsule = ensure_base_capsule(base_path, base_template)

    pass_capsule = copy.deepcopy(base_capsule)
    pass_capsule["signature"] = sign_capsule(key_a, pass_capsule)

    missing_field_capsule = copy.deepcopy(base_capsule)

    tampered_capsule = copy.deepcopy(pass_capsule)
    tampered_capsule["payload"]["message"] = "Fireseed Trilogy signing test capsule!"

    revoked_capsule = copy.deepcopy(pass_capsule)
    revoked_capsule["author_pubkey"] = key_b_pub

    vectors_dir = root / "examples" / "vectors"
    vectors_dir.mkdir(parents=True, exist_ok=True)

    dump_json(vectors_dir / "pass.json", pass_capsule)
    dump_json(vectors_dir / "missing_field.json", missing_field_capsule)
    dump_json(vectors_dir / "tampered_byte.json", tampered_capsule)
    dump_json(vectors_dir / "revoked_key.json", revoked_capsule)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    generate_vectors(repo_root)


if __name__ == "__main__":
    main()
