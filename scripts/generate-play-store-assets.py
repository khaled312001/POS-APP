#!/usr/bin/env python3
"""Builds the Google Play graphic assets for both apps.

Play requires an exact 512x512 icon and a 1024x500 feature graphic per listing,
and rejects an icon with an alpha channel. Everything here is derived from the
brand mark so the two listings, the launcher icons and the website stay in sync.

    python scripts/generate-play-store-assets.py

Outputs
    play-store-release/play-store-icon-512x512.png
    play-store-release/play-store-feature-graphic-1024x500.png
    customer-app/play-store/play-store-icon-512x512.png
    customer-app/play-store/play-store-feature-graphic-1024x500.png
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, "assets", "brand")

NAVY = (4, 14, 50)
NAVY_LIFT = (12, 28, 78)
TEAL = (0, 193, 176)
WHITE = (255, 255, 255)
MUTED = (185, 195, 216)


def font(size, bold=False):
    for path in (
        r"C:\Windows\Fonts\seguisb.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def glow(size, centre, radius, colour, peak):
    w, h = size
    layer = Image.new("L", (w // 4, h // 4), 0)
    d = ImageDraw.Draw(layer)
    cx, cy = centre[0] // 4, centre[1] // 4
    steps = 44
    for i in range(steps, 0, -1):
        r = radius / 4 * i / steps
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=int(peak * (1 - i / steps) ** 2))
    tinted = Image.new("RGBA", (w, h), colour + (0,))
    tinted.putalpha(layer.resize((w, h), Image.LANCZOS))
    return tinted


def icon_512(out_path):
    """Play rejects a 512x512 icon with transparency, so this is flattened RGB."""
    size = 512
    img = Image.new("RGBA", (size, size), NAVY + (255,))
    img.alpha_composite(glow((size, size), (size // 2, int(size * 0.42)), int(size * 0.7), TEAL, 46))

    mark = Image.open(os.path.join(BRAND, "logo-mark-dark-bg.png")).convert("RGBA")
    box = int(size * 0.58)
    scale = min(box / mark.width, box / mark.height)
    mark = mark.resize((round(mark.width * scale), round(mark.height * scale)), Image.LANCZOS)
    img.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))

    img.convert("RGB").save(out_path, "PNG", optimize=True)
    return out_path


def feature_graphic(out_path, headline, sub):
    """1024x500. Google crops the edges on some surfaces — keep text central."""
    w, h = 1024, 500
    img = Image.new("RGBA", (w, h), NAVY + (255,))

    grad = Image.new("L", (w, 1))
    for x in range(w):
        grad.putpixel((x, 0), int(46 * (x / w)))
    lift = Image.new("RGBA", (w, h), NAVY_LIFT + (255,))
    lift.putalpha(grad.resize((w, h)))
    img.alpha_composite(lift)

    img.alpha_composite(glow((w, h), (820, 250), 560, TEAL, 74))
    img.alpha_composite(glow((w, h), (120, 470), 380, TEAL, 26))

    logo = Image.open(os.path.join(BRAND, "logo-full-dark-bg.png")).convert("RGBA")
    target_h = 74
    logo = logo.resize((round(logo.width * target_h / logo.height), target_h), Image.LANCZOS)
    img.alpha_composite(logo, (74, 96))

    d = ImageDraw.Draw(img)
    d.text((74, 222), headline, font=font(50, bold=True), fill=WHITE)
    d.text((74, 292), sub, font=font(25), fill=MUTED)
    d.rounded_rectangle([74, 366, 250, 372], radius=3, fill=TEAL)

    img.convert("RGB").save(out_path, "PNG", optimize=True)
    return out_path


def main():
    jobs = [
        (
            os.path.join(ROOT, "play-store-release"),
            "Point of sale, orders, delivery",
            "One system for the till, your shop and the road",
        ),
        (
            os.path.join(ROOT, "customer-app", "play-store"),
            "Order from your favourite places",
            "Browse the menu, order, and follow it to your door",
        ),
    ]
    for out_dir, headline, sub in jobs:
        os.makedirs(out_dir, exist_ok=True)
        p1 = icon_512(os.path.join(out_dir, "play-store-icon-512x512.png"))
        p2 = feature_graphic(os.path.join(out_dir, "play-store-feature-graphic-1024x500.png"), headline, sub)
        for p in (p1, p2):
            print(f"  ✓ {os.path.relpath(p, ROOT).replace(os.sep, '/'):<62} {os.path.getsize(p) // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
