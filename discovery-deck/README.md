# Bloom Holding — Homepage Product Discovery deck

Source for `../Bloom_Homepage_Product_Discovery.pptx` (editable, 6 slides) and its PDF preview.

| File | Purpose |
|---|---|
| `capture.js` | Playwright capture of the live bloomholding.com homepage into `assets/home-*.png` |
| `prep_assets.py` | Crops/resizes the captures and tints the Bloom wordmark into `assets/deck/` |
| `build.js` | PptxGenJS generator: theme, layouts, all six slides, speaker notes |
| `apply_theme.js` | Writes the deck's colour theme into the .pptx after PptxGenJS saves it |
| `render.sh` | Build, validate, export PDF and per-slide JPEGs (`qa/`) |

```sh
npm install
node capture.js        # optional: refresh the screenshots
python3 prep_assets.py
./render.sh            # or: node build.js
```

Notes
- Screenshots are genuine captures (desktop 1440px, 12 Nov 2026). The hero background video
  is served from Vimeo, which was blocked in the capture environment, so the first view shows
  the wordmark on black. Re-run `capture.js` on an open network to refresh it.
- `render.sh` uses the LibreOffice wrapper and validator from the Claude pptx skill; swap in
  plain `soffice --headless --convert-to pdf` elsewhere.
- Fonts: Cambria (headings) and Calibri (body), both ship with Office.
