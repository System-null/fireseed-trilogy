import logging
import sys
from datetime import datetime, timezone

import orjson


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:  # noqa: D401
        """Format log records as a single JSON line."""
        ts = datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat()
        return orjson.dumps(
            {
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
        ).decode()


def configure_logging() -> None:
    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(JSONFormatter())
    logging.basicConfig(level=logging.INFO, handlers=[handler])
    for name in ("uvicorn.access", "uvicorn.error"):
        logging.getLogger(name).handlers = [handler]
