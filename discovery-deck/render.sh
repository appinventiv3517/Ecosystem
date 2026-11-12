#!/bin/bash
# Build the deck, validate it, export the PDF preview and per-slide JPEGs for QA.
set -e
cd "$(dirname "$0")"
node build.js
python3 /root/.claude/skills/synced/1fa108f9-a5e0-44d5-b881-3ccb1e818c38_d8761a4b-e16d-4832-8a1f-9374ed3f1d9d/pptx/scripts/office/validate.py ../Bloom_Homepage_Product_Discovery.pptx
(cd .. && python3 /root/.claude/skills/synced/1fa108f9-a5e0-44d5-b881-3ccb1e818c38_d8761a4b-e16d-4832-8a1f-9374ed3f1d9d/pptx/scripts/office/soffice.py --headless --convert-to pdf Bloom_Homepage_Product_Discovery.pptx >/dev/null)
mkdir -p qa && rm -f qa/slide-*.jpg
pdftoppm -jpeg -r 110 ../Bloom_Homepage_Product_Discovery.pdf qa/slide
ls qa/slide-*.jpg
