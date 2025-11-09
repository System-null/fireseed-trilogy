from __future__ import annotations

from pathlib import Path
from fastapi.responses import HTMLResponse
import html


ETHICS_MD = Path("data/ETHICS.md")


def render_ethics(request) -> HTMLResponse:
    if not ETHICS_MD.exists():
        return HTMLResponse(
            "<html><head><meta charset='utf-8'><title>Not Found</title></head>"
            "<body><h1>404</h1></body></html>",
            status_code=404,
        )
    md = ETHICS_MD.read_text(encoding="utf-8", errors="ignore")
    safe = html.escape(md).replace("\n\n", "</p><p>")
    body = (
        "<html><head><meta charset='utf-8'><meta name='viewport' "
        "content='width=device-width,initial-scale=1'><title>Ethics</title></head>"
        "<body><article style='max-width:760px;margin:24px auto;"
        "font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;line-height:1.6'><p>"
        f"{safe}</p></article></body></html>"
    )
    return HTMLResponse(body, status_code=200)
