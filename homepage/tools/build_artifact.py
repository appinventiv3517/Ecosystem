#!/usr/bin/env python3
"""Prepare the homepage for publishing as a Claude Artifact.

An artifact page is published without a document skeleton: the host supplies
`<!doctype html>`, `<head>` and `<body>` and wraps the file's contents in them.
This script takes index.html and writes two files into dist/:

    dist/artifact-index.html   the page body, with the title, meta and links kept
                               at the top — this is the file that gets published
    dist/preview.html          the same content inside a copy of the host's
                               skeleton, so it can be opened and tested locally
    dist/files.json            every supporting file to publish alongside the page

Nothing here changes the standalone site; dist/ is ignored by git.

    python3 tools/build_artifact.py
    node tests/check.cjs            # against the normal page
    PAGE_URL=http://localhost:4173/dist/preview.html node tests/check.cjs
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

# Served alongside the page, at these same paths.
ASSET_GLOBS = ["css/*.css", "js/**/*.js", "vendor/**/*.js", "assets/img/*.webp", "assets/brand/*.png"]

# The host's skeleton, reproduced for the local preview only.
SKELETON = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>
:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;font:14px system-ui,sans-serif}
img{max-width:100%}
[hidden]:not([hidden=until-found i]){display:none!important}
</style>
</head>
<body>
__PAGE__
</body>
</html>
"""


def build_page(html: str) -> str:
    """Strip the document skeleton, keeping the head contents the artifact needs."""
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)

    pattern = r"<title>.*?</title>|<script\b[^>]*>.*?</script>|<(?:meta|link)\b[^>]*>"
    keep = []
    for tag in re.findall(pattern, head, re.S):
        # The host supplies the charset and viewport; theme-color and robots are head-only.
        if tag.startswith("<meta") and 'name="description"' not in tag:
            continue
        keep.append(tag)

    # Promises that the page's side gutter clears a system bar on a phone (see css/base.css).
    keep.insert(1, '<meta name="claude:viewport-fit-sides" content="cover">')
    return "\n".join(keep) + "\n" + body.strip() + "\n"


def to_preview(page: str) -> str:
    """Point the preview's relative URLs back at the project root, one level up from dist/."""
    local = r"(?![a-z]+:|#)"
    # data-preview and data-thumb hold image paths that scripts assign at runtime.
    page = re.sub(r'((?:src|href|data-preview|data-thumb)=")' + local, r"\1../", page)

    def rewrite_set(match: re.Match) -> str:
        entries = [entry.strip() for entry in match.group(2).split(",")]
        fixed = ", ".join(entry if re.match(r"[a-z]+:|#", entry) else "../" + entry for entry in entries)
        return f'{match.group(1)}{fixed}"'

    return re.sub(r'((?:imagesrcset|srcset)=")([^"]+)"', rewrite_set, page)


def main() -> None:
    DIST.mkdir(exist_ok=True)
    page = build_page((ROOT / "index.html").read_text(encoding="utf-8"))
    (DIST / "artifact-index.html").write_text(page, encoding="utf-8")

    # The preview sits in dist/, so point its relative URLs back at the project root.
    (DIST / "preview.html").write_text(
        SKELETON.replace("__PAGE__", to_preview(page)), encoding="utf-8"
    )

    files = sorted(str(path.relative_to(ROOT)) for glob in ASSET_GLOBS for path in ROOT.glob(glob))
    (DIST / "files.json").write_text(json.dumps(files, indent=1) + "\n", encoding="utf-8")

    missing = [
        reference
        for reference in re.findall(r'(?:src|href)="(?![a-z]+:|#)([^"]+)"', page)
        if reference not in files
    ]
    size = sum((ROOT / name).stat().st_size for name in files) + len(page.encode())
    print(f"dist/artifact-index.html  {len(page.encode()) // 1024} KB")
    print(f"dist/files.json           {len(files)} files, {size / 1024 / 1024:.1f} MB in total")
    if missing:
        raise SystemExit(f"referenced but not published: {sorted(set(missing))}")


if __name__ == "__main__":
    main()
