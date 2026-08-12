#!/usr/bin/env python3
"""Builds public/brand/og-image.png — the 1200x630 link-preview card.

The artwork comes from `new images/og-image.png` (a dark product render); the
typography is composited here rather than generated, because link previews are
the first thing a prospect sees and generated lettering is unreliable.

Falls back to a plain navy card when the render is missing, so the file always
exists. Re-run after any change to the logo, the artwork or the tagline.
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
NAVY = (4, 14, 50)
NAVY_LIFT = (11, 26, 74)
TEAL = (0, 193, 176)
WHITE = (255, 255, 255)
MUTED = (185, 195, 216)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, "public", "brand")

HEADLINE = "Kassenta POS"
TAGLINE_1 = "Point of sale, online ordering"
TAGLINE_2 = "and delivery in one system"
FOOTNOTE = "kassenta.com"


def load_font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\seguisb.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def radial(size, centre, radius, colour, peak):
    """Soft radial glow as a standalone RGBA layer."""
    w, h = size
    layer = Image.new("L", (w // 4, h // 4), 0)
    draw = ImageDraw.Draw(layer)
    cx, cy = centre[0] // 4, centre[1] // 4
    steps = 48
    for i in range(steps, 0, -1):
        r = radius / 4 * i / steps
        alpha = int(peak * (1 - i / steps) ** 2)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=alpha)
    layer = layer.resize((w, h), Image.LANCZOS)
    tinted = Image.new("RGBA", (w, h), colour + (0,))
    tinted.putalpha(layer)
    return tinted


def load_artwork():
    """The generated render, cropped to 1200x630 with the device kept on the right."""
    for name in ("og-image.png", "​og-image.png", "​​og-image​.png"):
        path = os.path.join(ROOT, "new images", name)
        if os.path.exists(path):
            art = Image.open(path).convert("RGB")
            scale = max(W / art.width, H / art.height)
            art = art.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)
            left = (art.width - W) // 2
            top = (art.height - H) // 2
            return art.crop((left, top, left + W, top + H))
    # Try any file in the folder whose cleaned name is og-image.
    folder = os.path.join(ROOT, "new images")
    if os.path.isdir(folder):
        for f in os.listdir(folder):
            clean = f
            for ch in "​‌‍﻿":
                clean = clean.replace(ch, "")
            if clean.lower() == "og-image.png":
                return load_artwork_from(os.path.join(folder, f))
    return None


def load_artwork_from(path):
    art = Image.open(path).convert("RGB")
    scale = max(W / art.width, H / art.height)
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)
    left = (art.width - W) // 2
    top = (art.height - H) // 2
    return art.crop((left, top, left + W, top + H))


def main():
    art = load_artwork()

    if art is not None:
        img = art.convert("RGBA")
        # Darken the left half so the headline keeps its contrast over the render.
        scrim = Image.new("L", (W, 1))
        for x in range(W):
            t = min(max((x - 120) / 520.0, 0.0), 1.0)
            scrim.putpixel((x, 0), int(225 * (1 - t) ** 1.5))
        veil = Image.new("RGBA", (W, H), NAVY + (255,))
        veil.putalpha(scrim.resize((W, H)))
        img.alpha_composite(veil)
    else:
        img = Image.new("RGB", (W, H), NAVY)
        grad = Image.new("L", (1, H))
        for y in range(H):
            grad.putpixel((0, y), int(30 * (1 - y / H)))
        img = Image.composite(Image.new("RGB", (W, H), NAVY_LIFT), img, grad.resize((W, H)))
        img = img.convert("RGBA")
        img.alpha_composite(radial((W, H), (900, 300), 520, TEAL, 70))
        img.alpha_composite(radial((W, H), (140, 620), 420, TEAL, 26))

    draw = ImageDraw.Draw(img)

    # Logo mark, top left
    mark = Image.open(os.path.join(BRAND, "logo-full-dark-bg.png")).convert("RGBA")
    target_h = 56
    mark = mark.resize((int(mark.width * target_h / mark.height), target_h), Image.LANCZOS)
    img.alpha_composite(mark, (72, 66))

    # Headline + tagline
    f_head = load_font(74, bold=True)
    f_tag = load_font(31)
    f_foot = load_font(23, bold=True)

    y = 214
    draw.text((72, y), HEADLINE, font=f_head, fill=WHITE)
    y += 104
    draw.text((72, y), TAGLINE_1, font=f_tag, fill=MUTED)
    y += 44
    draw.text((72, y), TAGLINE_2, font=f_tag, fill=MUTED)

    # Accent rule + domain
    draw.rounded_rectangle([72, 452, 268, 458], radius=3, fill=TEAL)
    draw.text((72, 486), FOOTNOTE, font=f_foot, fill=TEAL)

    # JPEG, not PNG: the card is a photographic render, and every chat client
    # that renders a link preview downloads this file (526 KB PNG vs 74 KB JPEG).
    flat = img.convert("RGB")
    out = os.path.join(BRAND, "og-image.jpg")
    flat.save(out, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"wrote {out} ({os.path.getsize(out) // 1024} KB)")

    # Keep a PNG at the old path so links already shared in the wild keep working.
    legacy = os.path.join(BRAND, "og-image.png")
    flat.save(legacy, "PNG", optimize=True)
    print(f"wrote {legacy} ({os.path.getsize(legacy) // 1024} KB)")


if __name__ == "__main__":
    main()
