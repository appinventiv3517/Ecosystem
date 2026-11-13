#!/usr/bin/env python3
"""Build one self-contained HTML file of the homepage: dist/bloom-homepage.html

Everything the page needs is inside the file, so it opens straight from disk (double-click)
with no server and no other files:

  * every stylesheet is inlined
  * GSAP and the page's own ES modules are inlined; the modules are bundled by a small
    built-in bundler (each module becomes a function scope, in dependency order)
  * every photograph and wordmark is embedded once, as a data URI, and put in place by a
    short script before the page starts. Where the page offers several sizes of a picture,
    the file keeps one: the largest up to 1400px wide.

The only outside request is Google Fonts (Playfair Display and DM Sans). Offline, the page
falls back to the serif and sans-serif fonts named in css/tokens.css.

    python3 tools/build_standalone.py
"""
import base64
import json
import mimetypes
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "bloom-homepage.html"
MAX_WIDTH = 1400


# ---------- Modules ----------

IMPORT = re.compile(r"^import\s*\{([^}]*)\}\s*from\s*'([^']+)';\s*$", re.M)
EXPORT_DECL = re.compile(r"^export\s+((?:async\s+)?function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)", re.M)


def bundle(entry: pathlib.Path) -> str:
    order, seen, sources = [], set(), {}

    def visit(path: pathlib.Path):
        key = path.relative_to(ROOT).as_posix()
        if key in seen:
            return
        seen.add(key)
        text = path.read_text(encoding="utf-8")
        sources[key] = text
        for _, spec in IMPORT.findall(text):
            visit((path.parent / spec).resolve())
        order.append(key)

    visit(entry.resolve())

    parts = ["const __modules = {};"]
    for key in order:
        text = sources[key]
        path = ROOT / key
        leftover = [line for line in text.splitlines() if line.startswith(("import ", "export {", "export default", "export *"))]
        leftover = [line for line in leftover if not IMPORT.match(line)]
        if leftover:
            raise SystemExit(f"{key}: unsupported module syntax: {leftover[0]}")

        def replace_import(match):
            names = []
            for name in match.group(1).split(","):
                name = name.strip()
                if not name:
                    continue
                if " as " in name:
                    original, alias = [n.strip() for n in name.split(" as ")]
                    names.append(f"{original}: {alias}")
                else:
                    names.append(name)
            dep = (path.parent / match.group(2)).resolve().relative_to(ROOT).as_posix()
            return f"const {{ {', '.join(names)} }} = __modules[{json.dumps(dep)}];"

        text = IMPORT.sub(replace_import, text)
        exported = EXPORT_DECL.findall(text)
        text = EXPORT_DECL.sub(lambda m: f"{m.group(1)} {m.group(2)}", text)
        names = ", ".join(name for _, name in exported)
        parts.append(f"// ---- {key}\n__modules[{json.dumps(key)}] = (() => {{\n{text}\nreturn {{ {names} }};\n}})();")
    return "\n".join(parts)


# ---------- Images ----------

def pick(srcset: str) -> str:
    """From a srcset, the largest candidate up to MAX_WIDTH wide (or the smallest, if all are larger)."""
    candidates = []
    for part in srcset.split(","):
        bits = part.strip().split()
        if not bits:
            continue
        width = int(bits[1][:-1]) if len(bits) > 1 and bits[1].endswith("w") else 0
        candidates.append((width, bits[0]))
    fitting = [c for c in candidates if c[0] <= MAX_WIDTH]
    return (max(fitting) if fitting else min(candidates))[1]


def data_uri(key: str) -> str:
    path = ROOT / key
    mime = mimetypes.guess_type(path.name)[0] or ("image/webp" if path.suffix == ".webp" else "application/octet-stream")
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def embed_images(html: str):
    # Keep one size per picture: srcset becomes a single src.
    def one_size(match):
        tag = match.group(0)
        srcset = re.search(r'\s(?:srcset|imagesrcset)="([^"]*assets/[^"]*)"', tag)
        if not srcset:
            return tag
        chosen = pick(srcset.group(1))
        tag = re.sub(r'\s(?:imagesrcset|imagesizes|sizes)="[^"]*"', "", tag)
        if tag.startswith("<source"):
            return re.sub(r'\ssrcset="[^"]*"', f' srcset="{chosen}"', tag)
        tag = re.sub(r'\ssrcset="[^"]*"', "", tag)
        return re.sub(r'\ssrc="[^"]*"', f' src="{chosen}"', tag) if ' src="' in tag else tag.replace("<img", f'<img src="{chosen}"', 1)

    html = re.sub(r"<(?:img|source)\b[^>]*>", one_size, html)
    # Preloads only help a served page.
    html = re.sub(r'\s*<link rel="preload" as="image"[^>]*>', "", html)

    keys = []

    def mark(match):
        attr, key = match.group(1), match.group(2)
        if key not in keys:
            keys.append(key)
        return f' data-embed-{attr}="{key}"'

    html = re.sub(r'\s([a-z-]+)="(assets/[^"]+)"', mark, html)
    table = {key: data_uri(key) for key in keys}
    return html, table


# ---------- Build ----------

def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    def inline_css(match):
        css = (ROOT / match.group(1)).read_text(encoding="utf-8")
        return f"<style>/* {match.group(1)} */\n{css}</style>"

    html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)

    def inline_vendor(match):
        js = (ROOT / match.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
        return f"<script>/* {match.group(1)} */\n{js}</script>"

    html = re.sub(r'<script src="(vendor/[^"]+)" defer></script>', inline_vendor, html)

    html, table = embed_images(html)
    # The pictures go in before anything else runs, so the intro and every section see them.
    placer = (
        '<script type="application/json" id="embedded-images">'
        + json.dumps(table).replace("</", "<\\/")
        + "</script>\n<script>(() => {\n"
        "  const table = JSON.parse(document.getElementById('embedded-images').textContent);\n"
        "  document.querySelectorAll('*').forEach((element) => {\n"
        "    for (const name of element.getAttributeNames()) {\n"
        "      if (!name.startsWith('data-embed-')) continue;\n"
        "      element.setAttribute(name.slice(11), table[element.getAttribute(name)]);\n"
        "      element.removeAttribute(name);\n"
        "    }\n"
        "  });\n"
        "})();</script>\n"
    )
    first_script = html.index("<script>/* vendor/")
    html = html[:first_script] + placer + "  " + html[first_script:]

    code = bundle(ROOT / "js" / "main.js").replace("</script", "<\\/script")
    html = html.replace('<script type="module" src="js/main.js"></script>', f"<script type=\"module\">\n{code}\n</script>")

    leftovers = re.findall(r'\s(?:src|href|srcset)="(?!https?:|#|tel:|mailto:|data:)([^"]+)"', html)
    if leftovers:
        raise SystemExit(f"still pointing at local files: {leftovers[:5]}")

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)}  {OUT.stat().st_size / 1_000_000:.1f} MB, {len(table)} pictures embedded")


if __name__ == "__main__":
    main()
