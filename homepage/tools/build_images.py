#!/usr/bin/env python3
"""Build the homepage photographs from assets/img/manifest.json.

Every image the prototype uses is listed in the manifest with the page on
bloomholding.com it came from. This script downloads each original once into
tools/originals/ (ignored by git), crops it around its focal point and writes
the .webp sizes the page references.

    python3 tools/build_images.py            # build anything that is missing
    python3 tools/build_images.py --force    # rebuild everything

To replace an image, change its source_url in the manifest (or drop a file
named <name>.<ext> into tools/originals/) and run with --force.
Requires Pillow. Downloads use curl so they follow the system proxy settings.
"""
import argparse
import json
import pathlib
import subprocess
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
ORIGINALS = ROOT / "tools" / "originals"
UA = "Mozilla/5.0 (X11; Linux x86_64) Chrome/120 Safari/537.36"


def original_for(item):
    """Return the local original for a manifest item, downloading it if needed."""
    ORIGINALS.mkdir(exist_ok=True)
    for path in ORIGINALS.glob(item["name"] + ".*"):
        return path
    ext = pathlib.PurePosixPath(item["source_url"]).suffix or ".jpg"
    path = ORIGINALS / (item["name"] + ext)
    result = subprocess.run(
        ["curl", "-sS", "-L", "-m", "90", "--retry", "2", "-A", UA, "-o", str(path), "-w", "%{http_code}", item["source_url"]],
        capture_output=True, text=True,
    )
    if result.stdout.strip() != "200":
        path.unlink(missing_ok=True)
        sys.exit(f"download failed ({result.stdout.strip()}): {item['source_url']} {result.stderr.strip()}")
    return path


def crop_to(image, ratio, focus):
    """Crop to width/height = ratio, keeping the focal point as centred as the frame allows."""
    if not ratio:
        return image
    width, height = image.size
    if width / height > ratio:
        new_w, new_h = round(height * ratio), height
    else:
        new_w, new_h = width, round(width / ratio)
    left = min(max(round(focus[0] * width - new_w / 2), 0), width - new_w)
    top = min(max(round(focus[1] * height - new_h / 2), 0), height - new_h)
    return image.crop((left, top, left + new_w, top + new_h))


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--force", action="store_true", help="rebuild files that already exist")
    args = parser.parse_args()

    manifest = json.loads((IMG / "manifest.json").read_text(encoding="utf-8"))
    built = 0
    for item in manifest["images"]:
        source = None
        for variant in item["variants"]:
            for width in variant["widths"]:
                out = IMG / f"{item['name']}{variant['suffix']}-{width}.webp"
                if out.exists() and not args.force:
                    continue
                if source is None:
                    source = Image.open(original_for(item)).convert("RGB")
                frame = crop_to(source, variant["ratio"], variant["focus"])
                if frame.width > width:
                    frame = frame.resize((width, round(frame.height * width / frame.width)), Image.LANCZOS)
                frame.save(out, "WEBP", quality=80, method=6)
                built += 1
                print(f"{out.name:44} {frame.width}x{frame.height} {out.stat().st_size // 1024} KB")
    print(f"built {built} file(s)")


if __name__ == "__main__":
    main()
