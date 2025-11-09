from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict

import orjson


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat()
        payload: Dict[str, Any] = {
            "event": getattr(record, "event", "log"),
            "route": getattr(record, "route", None),
            "status": getattr(record, "status", None),
            "latency_ms": getattr(record, "latency_ms", None),
            "capsule_id": getattr(record, "capsule_id", None),
            "user_agent": (getattr(record, "user_agent", None) or "")[:80],
            "timestamp": ts,
            "message": record.getMessage(),
            "level": record.levelname,
        }
        return orjson.dumps(payload).decode()


def configure_logging() -> None:
    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(JSONFormatter())
    logging.basicConfig(level=logging.INFO, handlers=[handler])
    for name in ("uvicorn.access", "uvicorn.error"):
        logging.getLogger(name).handlers = [handler]
