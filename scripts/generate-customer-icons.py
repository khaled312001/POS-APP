#!/usr/bin/env python3
"""Regenerates the customer app's launcher icons from the Kassenta brand mark.

The customer app still shipped the pre-rebrand icon (a purple shopping cart),
so it looked like a different product from the POS app on the same phone. This
paints the same mark scripts/generate-brand-assets.py uses, on the brand navy.

    python scripts/generate-customer-icons.py
"""
import os
import sys

from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, "assets", "brand")
OUT = os.path.join(ROOT, "customer-app", "assets")

# The master mark is drawn for a light background — its navy half disappears on
# navy. generate-brand-assets.py emits a variant with that half recoloured white
# and the teal kept; that is the one to place on a dark plate.
MARK = "logo-mark-dark-bg.png"

NAVY = (4, 14, 50, 255)


def mark(size, inset_ratio):
    """The logo mark, centred on navy, with `inset_ratio` of clear space around it."""
    src = Image.open(os.path.join(BRAND, MARK)).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), NAVY)

    box = int(size * (1 - inset_ratio * 2))
    scale = min(box / src.width, box / src.height)
    art = src.resize((max(1, round(src.width * scale)), max(1, round(src.height * scale))), Image.LANCZOS)
    canvas.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return canvas


def main():
    if not os.path.exists(os.path.join(BRAND, MARK)):
        print(f"{MARK} not found — run scripts/generate-brand-assets.py first")
        return 1
    os.makedirs(OUT, exist_ok=True)

    targets = [
        # Android and iOS crop launcher icons differently; 22% inset survives both.
        ("icon.png", 1024, 0.22),
        # The adaptive-icon foreground is cropped to a 66% safe zone by the
        # launcher mask, so it needs far more padding than a plain icon.
        ("adaptive-icon.png", 1024, 0.30),
        ("splash.png", 1024, 0.30),
        ("favicon.png", 256, 0.18),
    ]
    for name, size, inset in targets:
        img = mark(size, inset)
        path = os.path.join(OUT, name)
        img.convert("RGB").save(path, "PNG", optimize=True)
        print(f"  ✓ {name:<20} {size}×{size}  {os.path.getsize(path) // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
