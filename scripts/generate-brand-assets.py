"""Generate every Kassenta brand asset from the master logo.

Source of truth: logo.jpeg (1254x1254, flat colours on white).
Run from the repo root:  python scripts/generate-brand-assets.py

Produces app icons, adaptive icons, favicons, splash art, store graphics and
transparent logo variants for the web templates. Re-running is safe — every
output is derived, never hand-edited.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "logo.jpeg"
IMAGES = ROOT / "assets" / "images"
BRAND = ROOT / "assets" / "brand"
PUBLIC = ROOT / "public" / "brand"

NAVY = (4, 14, 50)        # #040E32
TEAL = (0, 193, 176)      # #00C1B0
WHITE = (255, 255, 255)

# Measured on the master file: a >20px column gap separates mark from wordmark.
MARK_BOX = (102, 450, 427, 753)
FULL_BOX = (102, 450, 1156, 753)


def load_rgba() -> Image.Image:
    """White background -> alpha, with a soft ramp so edges stay smooth."""
    rgb = np.array(Image.open(SRC).convert("RGB")).astype(np.float32)
    brightness = rgb.mean(axis=2)
    alpha = np.clip((250.0 - brightness) / 40.0 * 255.0, 0, 255)
    out = np.dstack([rgb, alpha]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def recolour(img: Image.Image, colour) -> Image.Image:
    """Flatten every visible pixel to one colour, keeping the alpha shape."""
    arr = np.array(img)
    arr[..., 0], arr[..., 1], arr[..., 2] = colour
    return Image.fromarray(arr, "RGBA")


def for_dark_bg(img: Image.Image) -> Image.Image:
    """Navy ink -> white, teal kept.

    The master logo is drawn for light backgrounds, so its navy half vanishes
    on a navy plate. Everything that is navy-ish becomes white; the teal
    accent survives untouched.
    """
    arr = np.array(img).astype(np.int16)
    rgb = arr[..., :3]
    d_navy = np.abs(rgb - np.array(NAVY)).sum(axis=2)
    d_teal = np.abs(rgb - np.array(TEAL)).sum(axis=2)
    is_navy = d_navy <= d_teal
    arr[..., :3][is_navy] = WHITE
    arr[..., :3][~is_navy] = TEAL
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def fit(art: Image.Image, size: int, scale: float) -> Image.Image:
    """Centre `art` on a transparent square, occupying `scale` of the canvas."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    target = int(size * scale)
    ratio = min(target / art.width, target / art.height)
    resized = art.resize((max(1, int(art.width * ratio)), max(1, int(art.height * ratio))), Image.LANCZOS)
    canvas.paste(resized, ((size - resized.width) // 2, (size - resized.height) // 2), resized)
    return canvas


def on_navy(art: Image.Image, size: int, scale: float, radius: int = 0) -> Image.Image:
    plate = Image.new("RGBA", (size, size), NAVY + (255,))
    if radius:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
        plate.putalpha(mask)
    plate.alpha_composite(fit(art, size, scale))
    return plate


def main() -> None:
    for d in (IMAGES, BRAND, PUBLIC):
        d.mkdir(parents=True, exist_ok=True)

    rgba = load_rgba()
    mark = rgba.crop(MARK_BOX)
    full = rgba.crop(FULL_BOX)
    mark_light = for_dark_bg(mark)

    # ── Transparent logo variants (web templates, docs, print) ──────────────
    outputs: list[tuple[Path, Image.Image]] = [
        (BRAND / "logo-full.png", full),
        (BRAND / "logo-mark.png", mark),
        (BRAND / "logo-full-white.png", recolour(full, WHITE)),
        (BRAND / "logo-mark-white.png", recolour(mark, WHITE)),
        (BRAND / "logo-mark-teal.png", recolour(mark, TEAL)),
        (BRAND / "logo-full-dark-bg.png", for_dark_bg(full)),
        (BRAND / "logo-mark-dark-bg.png", for_dark_bg(mark)),

        # ── App icons ───────────────────────────────────────────────────────
        # The mark alone — a wordmark is unreadable at 48px. Drawn light so the
        # navy half of the artwork stays visible on the navy plate.
        (IMAGES / "icon.png", on_navy(mark_light, 1024, 0.62)),
        (IMAGES / "play-store-icon.png", on_navy(mark_light, 512, 0.62)),
        # Adaptive icon: foreground must stay inside the 66% safe circle.
        (IMAGES / "android-icon-foreground.png", fit(mark_light, 1024, 0.44)),
        (IMAGES / "android-icon-background.png", Image.new("RGBA", (1024, 1024), NAVY + (255,))),
        (IMAGES / "android-icon-monochrome.png", recolour(fit(mark, 1024, 0.44), WHITE)),
        # Splash: full lockup, drawn light for the dark splash background.
        (IMAGES / "splash-icon.png", fit(for_dark_bg(full), 1024, 0.80)),
        (IMAGES / "favicon.png", on_navy(mark_light, 196, 0.66)),
    ]

    # Feature graphic — 1024x500 navy band with the full lockup.
    feature = Image.new("RGBA", (1024, 500), NAVY + (255,))
    lockup = for_dark_bg(full)
    ratio = min(760 / lockup.width, 260 / lockup.height)
    lockup = lockup.resize((int(lockup.width * ratio), int(lockup.height * ratio)), Image.LANCZOS)
    feature.paste(lockup, ((1024 - lockup.width) // 2, (500 - lockup.height) // 2), lockup)
    outputs.append((IMAGES / "play-store-feature-graphic.png", feature))

    # Web favicons served by the Express templates.
    for px in (16, 32, 48, 180, 192, 512):
        outputs.append((PUBLIC / f"favicon-{px}.png", on_navy(mark_light, px, 0.66)))
    outputs.append((PUBLIC / "logo-full-white.png", recolour(full, WHITE)))
    outputs.append((PUBLIC / "logo-full-dark-bg.png", for_dark_bg(full)))
    outputs.append((PUBLIC / "logo-full.png", full))
    outputs.append((PUBLIC / "logo-mark.png", mark))

    for path, img in outputs:
        img.convert("RGBA").save(path)
        print(f"  {path.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}")

    # Multi-resolution .ico for legacy browser tabs.
    ico = on_navy(mark_light, 256, 0.66).convert("RGBA")
    ico_path = PUBLIC / "favicon.ico"
    ico.save(ico_path, sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"  {ico_path.relative_to(ROOT)}  multi-size")

    print(f"\nBrand colours — navy #{'%02X%02X%02X' % NAVY} · teal #{'%02X%02X%02X' % TEAL}")


if __name__ == "__main__":
    main()
