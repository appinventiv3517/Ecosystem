#!/usr/bin/env python3
"""Build the Bloom World homepage.

    python3 build.py

Writes:
  index.html                 the page, loading images and fonts from assets/
  dist/bloom-world.html      one standalone file with every image and font inlined
"""
import base64
import mimetypes
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
sys.path.insert(0, str(SRC))
import drawings  # noqa: E402


def render():
    html = (SRC / "index.html").read_text(encoding="utf-8")
    parts = {
        "STYLES": (SRC / "styles.css").read_text(encoding="utf-8"),
        "SCRIPT": (SRC / "app.js").read_text(encoding="utf-8"),
        "PLAN_SVG": drawings.masterplan(),
        "COAST_SVG": drawings.coastmap(),
        "GROWTH_SVG": drawings.growthplan(),
    }
    for k, v in parts.items():
        html = html.replace("{{" + k + "}}", v)
    return html


def inline_assets(html):
    cache = {}

    def data_uri(rel):
        if rel not in cache:
            p = ROOT / rel
            mime = mimetypes.guess_type(p.name)[0] or ("font/woff2" if p.suffix == ".woff2" else "application/octet-stream")
            if p.suffix == ".webp":
                mime = "image/webp"
            cache[rel] = f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()
        return cache[rel]

    return re.sub(r'(assets/(?:img|fonts)/[\w.-]+)', lambda m: data_uri(m.group(1)), html)


def main():
    html = render()
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    (ROOT / "dist").mkdir(exist_ok=True)
    single = inline_assets(html)
    (ROOT / "dist" / "bloom-world.html").write_text(single, encoding="utf-8")
    print(f"index.html {len(html) // 1024} KB · dist/bloom-world.html {len(single) // 1024} KB")


if __name__ == "__main__":
    main()
