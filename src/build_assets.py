"""Build image assets: responsive WebP photos, dithered backgrounds, OG image.

Run:  python3 src/build_assets.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images"
OUT = ROOT / "assets" / "img"
OUT.mkdir(parents=True, exist_ok=True)

BG = (4, 28, 28)
BLUE = (74, 168, 216)
GOLD = (255, 189, 56)
CREAM = (255, 230, 203)

# 8x8 Bayer matrix for ordered dithering (the Hermes-style pixel texture)
BAYER = [
    [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
]


def photos():
    """Responsive WebP versions of the personal photos (≈ 60–80 % smaller than the JPGs)."""
    jobs = {
        "portrait": [(800, None), (480, None)],
        "gymnastics": [(900, None), (480, None)],
        "namibia": [(900, None), (480, None)],
        "drone": [(800, None)],
        "proxmox": [(668, None)],
        "linux": [(800, None)],
    }
    for name, sizes in jobs.items():
        im = Image.open(SRC / f"{name}.jpg").convert("RGB")
        for w, _ in sizes:
            r = im.copy()
            if r.width > w:
                r = r.resize((w, round(r.height * w / r.width)), Image.LANCZOS)
            r.save(OUT / f"{name}-{w}.webp", "WEBP", quality=78, method=6)
            print(f"{name}-{w}.webp", r.size)


def dither(src, out, size, color, contrast=1.4, bright=1.0, crop=None, invert=False):
    """Ordered (Bayer) dither: lit pixels in `color`, the rest transparent.
    Rendered at low resolution and scaled up with `image-rendering: pixelated`."""
    im = Image.open(src).convert("L")
    if crop:
        im = im.crop(crop)
    im = ImageOps.fit(im, size, Image.LANCZOS)
    im = ImageEnhance.Contrast(im).enhance(contrast)
    im = ImageEnhance.Brightness(im).enhance(bright)
    if invert:
        im = ImageOps.invert(im)
    w, h = im.size
    px = im.load()
    res = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rp = res.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] / 255 * 64 > BAYER[y % 8][x % 8] + 0.5:
                rp[x, y] = color + (255,)
    res.save(OUT / out, optimize=True)
    print(out, res.size, (OUT / out).stat().st_size // 1024, "KB")


def og_image():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    # dithered dunes on the right
    d = Image.open(OUT / "hero-dither.png").convert("RGBA")
    d = d.resize((d.width * 2, d.height * 2), Image.NEAREST)
    d = ImageOps.fit(d, (W, H), Image.NEAREST)
    a = d.getchannel("A").point(lambda v: v * 0.55)
    d.putalpha(a)
    img.paste(d, (0, 0), d)
    # left fade so the text stays readable
    fade = Image.new("L", (W, H))
    fd = ImageDraw.Draw(fade)
    for x in range(W):
        fd.line([(x, 0), (x, H)], fill=int(255 * max(0.0, 1 - x / 820) ** 0.7))
    img = Image.composite(Image.new("RGB", (W, H), BG), img, fade)
    dr = ImageDraw.Draw(img)
    # grid lines
    for gx in range(0, W, 80):
        dr.line([(gx, 0), (gx, H)], fill=(18, 44, 42))
    for gy in range(0, H, 80):
        dr.line([(0, gy), (W, gy)], fill=(18, 44, 42))
    syne = ROOT / "assets" / "fonts" / "unbounded.woff2"
    mono = ROOT / "assets" / "fonts" / "departure-mono.woff2"
    try:
        f_big = ImageFont.truetype(str(syne), 104)
        try:
            f_big.set_variation_by_axes([800])
        except Exception:
            pass
        f_small = ImageFont.truetype(str(mono), 26)
    except OSError:
        f_big = ImageFont.load_default()
        f_small = ImageFont.load_default()
    dr.text((72, 170), "TRISTAN", font=f_big, fill=CREAM)
    # outlined KAYSER like the hero
    dr.text((72, 290), "KAYSER", font=f_big, fill=BG, stroke_width=3, stroke_fill=BLUE)
    dr.text((76, 450), "FACHINFORMATIKER FÜR SYSTEMINTEGRATION", font=f_small, fill=BLUE)
    dr.text((76, 492), "Proxmox · Networking · Automation · Homelab", font=f_small, fill=(190, 172, 152))
    dr.rectangle([0, H - 6, W, H], fill=GOLD)
    dr.rectangle([0, H - 6, W // 2, H], fill=BLUE)
    img.save(ROOT / "assets" / "img" / "og-image.png", optimize=True)
    print("og-image.png")


if __name__ == "__main__":
    photos()
    # Hero: Namibian dunes, dithered in blue — personal and Hermes-like
    dither(SRC / "namibia.jpg", "hero-dither.png", (800, 500), BLUE, contrast=1.6, bright=1.05, crop=(0, 380, 900, 1200))
    # Contact: the drone, dithered in gold
    dither(SRC / "drone.jpg", "contact-dither.png", (640, 400), GOLD, contrast=2.4, bright=1.15, invert=True)
    # Proxmox screenshot: low-res dither so no IPs/hostnames are readable
    dither(SRC / "proxmox.jpg", "proxmox-dither.png", (334, 202), BLUE, contrast=1.8, bright=1.6)
    og_image()
