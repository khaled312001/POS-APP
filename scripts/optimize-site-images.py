#!/usr/bin/env python3
"""Prepares the marketing-site imagery for the web.

Source files live in `new images/` (as delivered by the image generator) and are
written to `public/brand/site/<slot-id>.webp`, which is where `shot()` in
server/site/shell.ts looks for them.

Three things happen here:

1. **Names are cleaned.** The delivered files carry zero-width spaces around the
   name; a URL containing U+200B looks identical but resolves to nothing.
2. **Nothing is cropped.** The generator returned a different aspect ratio than
   the brief asked for on several slots. Cropping a portrait shot down to 4:3
   throws away most of the subject, so the page layout follows the image instead
   — `IMAGE_RATIOS` below is emitted for server/site/pages.ts.
3. **Downscale + WebP.** The long edge is capped at 1600 px, which is still ≥2×
   the largest CSS size any slot renders at, and WebP q82 cuts ~2 MB PNGs to
   roughly 150 KB with no visible loss.

    python scripts/optimize-site-images.py
"""
import os
import sys
from fractions import Fraction

from PIL import Image

# Windows consoles default to cp1252; the report below uses box-drawing glyphs.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "new images")
DST = os.path.join(ROOT, "public", "brand", "site")
BRAND = os.path.join(ROOT, "public", "brand")

MAX_EDGE = 1600
QUALITY = 82
ZERO_WIDTH = "​‌‍﻿"

# Slots that are rendered as a plain graphic rather than a photograph. og-image
# is composited separately by scripts/generate-og-image.py.
SKIP = {"og-image"}


def clean_name(name: str) -> str:
    for ch in ZERO_WIDTH:
        name = name.replace(ch, "")
    return name.strip()


def ratio_string(w: int, h: int) -> str:
    """CSS aspect-ratio, reduced and rounded to something readable."""
    f = Fraction(w, h).limit_denominator(40)
    return f"{f.numerator} / {f.denominator}"


def main() -> int:
    if not os.path.isdir(SRC):
        print(f"source folder not found: {SRC}")
        return 1
    os.makedirs(DST, exist_ok=True)

    ratios = {}
    total_before = total_after = 0

    for raw in sorted(os.listdir(SRC)):
        if not raw.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            continue
        slot = os.path.splitext(clean_name(raw))[0]
        src_path = os.path.join(SRC, raw)
        before = os.path.getsize(src_path)
        total_before += before

        if slot in SKIP:
            print(f"  ~ {slot:<24} skipped (handled by generate-og-image.py)")
            continue

        im = Image.open(src_path)
        # Keep alpha only when the artwork really uses it — a cut-out product
        # render has to sit on whatever surface the active theme provides, while
        # a photograph with a fully opaque alpha channel just wastes bytes.
        has_alpha = im.mode in ("RGBA", "LA") and im.convert("RGBA").split()[-1].getextrema()[0] < 250
        if has_alpha:
            im = im.convert("RGBA")
        elif im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            flat = Image.new("RGB", im.size, (255, 255, 255))
            flat.paste(im, mask=im.split()[-1])
            im = flat
        else:
            im = im.convert("RGB")

        if max(im.size) > MAX_EDGE:
            scale = MAX_EDGE / max(im.size)
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)

        out_path = os.path.join(DST, f"{slot}.webp")
        im.save(out_path, "WEBP", quality=QUALITY, method=6, exact=has_alpha)
        after = os.path.getsize(out_path)
        total_after += after

        ratios[slot] = (ratio_string(im.width, im.height), f"{im.width} × {im.height}")
        print(f"  ✓ {slot:<24} {im.width:>4}×{im.height:<4}  {before // 1024:>5} KB → {after // 1024:>4} KB  ar={ratios[slot][0]}")

    print(f"\n  total {total_before // 1024} KB → {total_after // 1024} KB "
          f"({100 - round(total_after / max(total_before, 1) * 100)}% smaller)")

    print("\nRatios for server/site/pages.ts:\n")
    for slot in sorted(ratios):
        r, size = ratios[slot]
        print(f'  {slot:<24} ratio: "{r}"   size: "{size}"')
    return 0


if __name__ == "__main__":
    sys.exit(main())
