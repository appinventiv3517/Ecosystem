"""Prepare slide-ready images from the genuine captures in assets/ (run after capture.js)."""
from pathlib import Path
from PIL import Image

A = Path(__file__).parent / "assets"
OUT = A / "deck"
OUT.mkdir(exist_ok=True)

def shot(name, width, box=None):
    im = Image.open(A / f"home-{name}.png").convert("RGB")
    if box:
        im = im.crop(box)
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(OUT / f"{name}.jpg", quality=90)

shot("hero", 2200)
shot("ccl", 1100)
shot("verticals", 1100)
shot("footer", 1100, (0, 60, 1800, 1185))  # What We Do / Our Communities / E-Services columns

# Cover image: Bloom's own homepage imagery (towers), portrait crop for the full-bleed panel
im = Image.open(A / "site" / "e9d7a8a46cf25b7d203be1fd6b2a0f7a.webp").convert("RGB")
w = round(im.height * 4.433 / 7.5)
x0 = (im.width - w) // 2
im.crop((x0, 0, x0 + w, im.height)).resize((w * 2, im.height * 2), Image.LANCZOS).save(OUT / "cover.jpg", quality=90)

# Bloom wordmark (existing repo asset, an alpha mask) tinted in Bloom red and charcoal
mask = Image.open(A.parent.parent / "src" / "assets" / "bloom-wordmark-alpha.png").convert("RGBA").split()[3]
for name, rgb in {"red": (146, 42, 34), "charcoal": (43, 43, 40)}.items():
    Image.merge("RGBA", [Image.new("L", mask.size, c) for c in rgb] + [mask]).save(OUT / f"wordmark-{name}.png")
print("assets ready:", sorted(p.name for p in OUT.iterdir()))
