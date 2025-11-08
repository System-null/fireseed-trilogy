"""Noto Sans CJK SC uses the SIL Open Font License.
Place assets/fonts/NotoSansSC-Regular.otf during deployment if required."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Dict, Iterable, Tuple

import orjson
from PIL import Image, ImageDraw, ImageFont, features
import qrcode
from qrcode.constants import ERROR_CORRECT_H

OG_SIZE: Tuple[int, int] = (1200, 630)
ICON_SIZE: Tuple[int, int] = (512, 512)
FONT_PATH = Path(__file__).resolve().parents[1] / "assets" / "fonts" / "NotoSansSC-Regular.otf"

_FONT_CACHE: Dict[Tuple[int, bool], ImageFont.ImageFont] = {}


def get_font(pt: int) -> ImageFont.ImageFont:
    key = (pt, FONT_PATH.exists())
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    if key[1]:
        font = ImageFont.truetype(str(FONT_PATH), pt)
    else:
        font = ImageFont.load_default()
    _FONT_CACHE[key] = font
    return font


def _measure(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> Tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    return width, height


def _fit_font_size(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_width: int,
    max_height: int,
    max_pt: int,
    min_pt: int = 10,
) -> int:
    if not text:
        return min_pt
    low, high = min_pt, max_pt
    best = min_pt
    while low <= high:
        mid = (low + high) // 2
        font = get_font(mid)
        width, height = _measure(draw, text, font)
        if width <= max_width and height <= max_height:
            best = mid
            low = mid + 1
        else:
            high = mid - 1
    return best


def _truncate_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
) -> str:
    if not text:
        return ""
    width, _ = _measure(draw, text, font)
    if width <= max_width:
        return text
    ellipsis = "…"
    low, high = 0, len(text)
    best = ellipsis
    while low <= high:
        mid = (low + high) // 2
        candidate = text[:mid].rstrip()
        candidate = candidate + ellipsis if candidate else ellipsis
        cand_width, _ = _measure(draw, candidate, font)
        if cand_width <= max_width:
            best = candidate
            low = mid + 1
        else:
            high = mid - 1
    return best


def _build_presence_text(uniqueness, ari) -> str:
    parts = []
    if uniqueness is not None:
        parts.append(f"Uniqueness {int(round(uniqueness))}")
    if ari is not None:
        parts.append(f"ARI {int(round(ari))}")
    return " · ".join(parts)


_ALLOWED_SIZES = {OG_SIZE, ICON_SIZE}


def render_sharecard(payload: dict, size: Tuple[int, int]) -> Image.Image:
    if size not in _ALLOWED_SIZES:
        raise ValueError("unsupported size")

    raw_title = payload.get("title")
    raw_subtitle = payload.get("subtitle")
    raw_url = payload.get("url")

    title = str(raw_title).strip() if raw_title is not None else ""
    subtitle = str(raw_subtitle).strip() if raw_subtitle is not None else ""
    uniqueness = payload.get("uniqueness")
    ari = payload.get("ari")
    url = str(raw_url).strip() if raw_url is not None else ""

    width, height = size
    image = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(image)

    margin = int(round(min(width, height) * 0.08))
    qr_box_size = 6 if size == OG_SIZE else 4
    qr_margin = margin

    qr = qrcode.QRCode(
        error_correction=ERROR_CORRECT_H,
        border=4,
        box_size=qr_box_size,
    )
    qr.add_data(url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_width, qr_height = qr_img.size
    qr_x = width - qr_margin - qr_width
    qr_y = height - qr_margin - qr_height

    text_area_width = max(width - (margin + qr_margin + qr_width) - margin, width // 2)

    title_max_height = int(height * 0.35)
    title_size = _fit_font_size(draw, title, text_area_width, title_max_height, 78 if size == OG_SIZE else 50, 18)
    title_font = get_font(title_size)
    title_text = _truncate_text(draw, title, title_font, text_area_width)
    _, title_height = _measure(draw, title_text, title_font)

    subtitle_text = subtitle
    subtitle_height = 0
    if subtitle_text:
        subtitle_max_height = int(height * 0.2)
        subtitle_size = _fit_font_size(
            draw,
            subtitle_text,
            text_area_width,
            subtitle_max_height,
            44 if size == OG_SIZE else 32,
            14,
        )
        subtitle_font = get_font(subtitle_size)
        subtitle_text = _truncate_text(draw, subtitle_text, subtitle_font, text_area_width)
        _, subtitle_height = _measure(draw, subtitle_text, subtitle_font)
    else:
        subtitle_font = None

    presence_text = _build_presence_text(uniqueness, ari)
    presence_height = 0
    if presence_text:
        presence_max_height = int(height * 0.15)
        presence_size = _fit_font_size(
            draw,
            presence_text,
            text_area_width,
            presence_max_height,
            36 if size == OG_SIZE else 26,
            12,
        )
        presence_font = get_font(presence_size)
        presence_text = _truncate_text(draw, presence_text, presence_font, text_area_width)
        _, presence_height = _measure(draw, presence_text, presence_font)
    else:
        presence_font = None

    current_y = margin
    draw.text((margin, current_y), title_text, fill="black", font=title_font)
    current_y += title_height + int(title_size * 0.4)

    if subtitle_font and subtitle_text:
        draw.text((margin, current_y), subtitle_text, fill="black", font=subtitle_font)
        current_y += subtitle_height + int(subtitle_size * 0.35)

    fallback_needed = not FONT_PATH.exists()
    fallback_label = "[FONT_FALLBACK]"
    fallback_font = get_font(16)
    _, fallback_height = _measure(draw, fallback_label, fallback_font)
    fallback_y = height - 12 - fallback_height

    if presence_font and presence_text:
        meta_top_limit = qr_y - presence_height - int(presence_size * 0.2)
        if fallback_needed:
            meta_top_limit = min(meta_top_limit, fallback_y - presence_height - 8)
        meta_top_limit = min(meta_top_limit, height - margin - presence_height)
        meta_y = max(current_y, meta_top_limit)
        draw.text((margin, meta_y), presence_text, fill="black", font=presence_font)

    image.paste(qr_img, (qr_x, qr_y))

    if fallback_needed:
        fallback_x = margin
        draw.text((fallback_x, fallback_y), fallback_label, fill="black", font=fallback_font)

    return image


def choose_format(accept_header: str | None, explicit_format: str | None = None) -> Tuple[str, str]:
    webp_supported = bool(features.check("webp"))
    if explicit_format:
        fmt = explicit_format.strip().lower()
        if fmt not in {"webp", "png"}:
            raise ValueError("unsupported format")
        if fmt == "webp" and not webp_supported:
            fmt = "png"
    else:
        accept = (accept_header or "").lower()
        if webp_supported and "image/webp" in accept:
            fmt = "webp"
        else:
            fmt = "png"
        if fmt == "webp" and not webp_supported:
            fmt = "png"
    return fmt.upper(), f"image/{fmt}"


_WHITELIST_FIELDS: Iterable[str] = ["title", "subtitle", "uniqueness", "ari", "url"]


def compute_etag(payload: dict, size: Tuple[int, int], fmt: str) -> str:
    whitelisted = {}
    for field in _WHITELIST_FIELDS:
        value = payload.get(field, "")
        if value is None:
            value = ""
        whitelisted[field] = value
    canonical = orjson.dumps(whitelisted, option=orjson.OPT_SORT_KEYS)
    digest = hashlib.sha256(
        canonical + f"{size[0]}x{size[1]}".encode() + fmt.encode()
    ).hexdigest()
    return digest[:16]
