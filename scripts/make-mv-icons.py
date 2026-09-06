"""Generate the Music Video Director icon set and installer artwork.

The suite icons in src-tauri/icons/ read "DIRECTOR STUDIO" — the old product.
The Music Video Director build inherited them, so its installer, its Start
menu entry and its taskbar button all carried another product's name.

The mark drawn here is the one the app already shows in its own sidebar: the
`grad-primary` gold rounded square with lucide's `film` glyph. Reproducing it
rather than inventing something keeps the installer, the desktop shortcut and
the running app visibly the same product.

Run:  python scripts/make-mv-icons.py
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src-tauri" / "icons-mv"
OUT.mkdir(parents=True, exist_ok=True)

# --color-primary in the dark theme, and the 65%-toward-white end of
# .grad-primary. Sampled from src/styles/globals.css so the installer cannot
# drift away from the app's own gradient.
GOLD_DARK = (0xD6, 0xA5, 0x5A)
GOLD_LITE = (0xEC, 0xCE, 0xA1)
INK = (0x0E, 0x0E, 0x12)


def gradient(size, c0, c1):
    """135° linear gradient, matching the CSS."""
    g = Image.new("RGB", (size, size))
    px = g.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(round(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
    return g


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def film_glyph(size, stroke, colour=(255, 255, 255, 255)):
    """lucide `film`, drawn on its native 24-unit grid and scaled up."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    u = size / 24.0
    w = max(1, round(stroke))

    def line(x0, y0, x1, y1):
        d.line([x0 * u, y0 * u, x1 * u, y1 * u], fill=colour, width=w)

    d.rounded_rectangle(
        [3 * u, 3 * u, 21 * u, 21 * u], radius=2 * u, outline=colour, width=w
    )
    line(7, 3, 7, 21)     # left sprocket rail
    line(17, 3, 17, 21)   # right sprocket rail
    line(3, 12, 21, 12)   # centre divide
    for y in (7.5, 16.5):  # perforations
        line(3, y, 7, y)
        line(17, y, 21, y)
    return layer


def app_icon(size):
    """The sidebar mark as a standalone icon."""
    ss = 4 if size <= 256 else 2          # supersample for clean edges
    S = size * ss
    tile = gradient(S, GOLD_DARK, GOLD_LITE).convert("RGBA")
    tile.putalpha(rounded_mask(S, radius=round(S * 0.22)))

    glyph_box = round(S * 0.56)
    glyph = film_glyph(glyph_box, stroke=max(2, S * 0.030))
    # A soft drop shadow keeps the white glyph readable on the lighter end of
    # the gradient without adding a hard outline.
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    shadow.paste(
        film_glyph(glyph_box, stroke=max(2, S * 0.030), colour=(0, 0, 0, 90)),
        ((S - glyph_box) // 2, (S - glyph_box) // 2 + round(S * 0.012)),
    )
    tile.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(S * 0.010)))
    tile.alpha_composite(glyph, ((S - glyph_box) // 2, (S - glyph_box) // 2))
    return tile.resize((size, size), Image.LANCZOS)


# --- app icons -------------------------------------------------------------
png_sizes = {
    "32x32.png": 32,
    "64x64.png": 64,
    "128x128.png": 128,
    "128x128@2x.png": 256,
    "icon.png": 512,
    "StoreLogo.png": 50,
}
for name, s in png_sizes.items():
    app_icon(s).save(OUT / name)

for s in (30, 44, 71, 89, 107, 142, 150, 284, 310):
    app_icon(s).save(OUT / f"Square{s}x{s}Logo.png")

ico = app_icon(256)
ico.save(OUT / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])


# --- installer artwork -----------------------------------------------------
# Real type, not PIL's bitmap default — this artwork is the first thing a user
# sees of the product and the default font looks like a rendering failure.
FONTS = Path("C:/Windows/Fonts")


def font(weight, size):
    f = {"bold": "segoeuib.ttf", "semi": "seguisb.ttf", "reg": "segoeui.ttf"}[weight]
    try:
        return ImageFont.truetype(str(FONTS / f), size)
    except OSError:
        return ImageFont.load_default()

def hero_crop(w, h):
    """Crop the splash art the user chose, so the installer looks like the app."""
    src = Image.open(ROOT / "src" / "assets" / "mv-splash" / "hero.jpg").convert("RGB")
    scale = max(w / src.width, h / src.height)
    r = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    # Bias the crop upward: the faces sit in the top two-thirds of the art.
    left = (r.width - w) // 2
    top = max(0, round((r.height - h) * 0.28))
    return r.crop((left, top, left + w, top + h))


def scrim(img, side):
    """Darken one edge so overlaid text stays legible on any frame of the art."""
    w, h = img.size
    ov = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = ov.load()
    for y in range(h):
        for x in range(w):
            if side == "bottom":
                t = 1 - y / h
            elif side == "right":
                t = x / w
            else:
                t = 1 - x / w
            px[x, y] = (INK[0], INK[1], INK[2], round(215 * max(0.0, min(1.0, t)) ** 1.4))
    out = img.convert("RGBA")
    out.alpha_composite(ov)
    return out


# NSIS sidebar (164x314) — the tall panel on the welcome/finish pages.
side = scrim(hero_crop(164, 314), "bottom").convert("RGB")
d = ImageDraw.Draw(side)
badge = app_icon(38)
side.paste(badge, (14, 214), badge)
d.text((14, 262), "Music Video", font=font("bold", 19), fill=(255, 255, 255))
d.text((14, 282), "Director", font=font("bold", 19), fill=GOLD_DARK)
side.save(OUT / "installer-sidebar.bmp")

# NSIS header (150x57) — the strip across the top of the interior pages.
head = Image.new("RGB", (150, 57), INK)
b = app_icon(38)
head.paste(b, (9, 10), b)
hd = ImageDraw.Draw(head)
hd.text((55, 13), "Music Video", font=font("semi", 13), fill=(255, 255, 255))
hd.text((55, 29), "Director", font=font("bold", 14), fill=GOLD_DARK)
head.save(OUT / "installer-header.bmp")

# MSI equivalents.
# WiX paints its title and body text over the right of this bitmap, so that
# is the side that needs the scrim — the art stays clean on the left.
scrim(hero_crop(493, 312), "right").convert("RGB").save(OUT / "msi-dialog.bmp")
banner = Image.new("RGB", (493, 58), INK)
bb = app_icon(40)
banner.paste(bb, (14, 9), bb)
bd = ImageDraw.Draw(banner)
bd.text((64, 12), "Wheelbarrow Music Video Director", font=font("semi", 15), fill=(255, 255, 255))
bd.text((64, 32), "Song to screen — direct your next music video.", font=font("reg", 12), fill=GOLD_DARK)
banner.save(OUT / "msi-banner.bmp")

print(f"wrote {len(list(OUT.iterdir()))} files to {OUT}")
