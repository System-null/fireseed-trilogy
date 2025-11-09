from __future__ import annotations

import logging
import os
from typing import Dict

import requests
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

_BASE58_CHARS = set("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")
_BASE32_CHARS = set("abcdefghijklmnopqrstuvwxyz234567")


def _validate_cid(cid: str) -> None:
    if not isinstance(cid, str) or not cid:
        raise HTTPException(status_code=400, detail="invalid_cid")
    length = len(cid)
    if length < 46 or length > 62:
        raise HTTPException(status_code=400, detail="invalid_cid")
    charset = set(cid)
    if not (charset <= _BASE58_CHARS or charset <= _BASE32_CHARS):
        raise HTTPException(status_code=400, detail="invalid_cid")


def probe_gateways(cid: str) -> Dict[str, bool]:
    """Probe known IPFS gateways for CID availability."""

    gateways: Dict[str, str] = {
        "ipfs_io": "https://ipfs.io/ipfs/",
        "cloudflare": "https://cloudflare-ipfs.com/ipfs/",
    }
    local_gateway = os.getenv("IPFS_GATEWAY_LOCAL")
    if local_gateway:
        gateways["local"] = local_gateway.rstrip("/") + "/"

    results: Dict[str, bool] = {}
    for name, base_url in gateways.items():
        url = f"{base_url}{cid}"
        try:
            response = requests.head(url, timeout=2)
        except requests.RequestException:  # pragma: no cover - network errors are logged
            logger.debug(
                "gateway probe failed",
                extra={"cid": cid, "gateway": name, "error_code": "network"},
            )
            results[name] = False
            continue
        results[name] = 200 <= response.status_code < 400
    if "local" not in results:
        results["local"] = False
    return results


async def pin_status(request: Request) -> JSONResponse:
    cid = request.query_params.get("cid")
    if cid is None:
        raise HTTPException(status_code=400, detail="cid_required")
    _validate_cid(cid)
    result = probe_gateways(cid)
    return JSONResponse(result)
