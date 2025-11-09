from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone

import orjson


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat()
        payload = {
            "event": getattr(record, "event", "log"),
            "route": getattr(record, "route", None),
            "status": getattr(record, "status", None),
            "latency_ms": getattr(record, "latency_ms", None),
            "capsule_id": getattr(record, "capsule_id", None),
            "user_agent": (getattr(record, "user_agent", "") or "")[:80],
            "timestamp": timestamp,
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
