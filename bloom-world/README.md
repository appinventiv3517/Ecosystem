# Bloom World homepage: living masterplan redesign

A homepage design prototype for review, not the live Bloom Holding website.

- `index.html` opens straight in a browser and loads images and fonts from `assets/`.
- `dist/bloom-world.html` is the same page as one standalone file, with every image and font inlined, ready to share.

## Edit and rebuild

Edit the sources in `src/`, then run (the build reads the label font with `fonttools`; install it once with `pip install fonttools brotli`):

```sh
python3 build.py
```

- `src/index.html`: page markup, with placeholders for the styles, the script and the three drawings
- `src/styles.css`: all tokens and styles
- `src/app.js`: interactions and the business, community, app and story data
- `src/drawings.py`: generates the three SVG drawings (the hero masterplan, the coast map, the story's growth plan)

## What's on the page

- **Living masterplan (hero):** an illustrative site plan with one plot per Bloom business. Tap a plot to draw its service lines to the businesses it works with; the selected business shows in the intro beside the plan (below the plan on small screens). A day clock runs the plan from 07:00 to night. "Find a home" leads to the search section.
- **Find a home:** buy/rent search with a prototype result, plus featured developments as land parcels.
- **Communities:** five pins on a not-to-scale coast map, with a detail panel.
- **Life at Bloom:** expanding photo strips.
- **Customer services:** an "I'm a…" switch picks your app; call and enquiry options.
- **Awards and news:** awards as approval stamps on a blueprint.
- **Our story:** a year scrubber that builds the night plan phase by phase.
- **About:** an area schedule of Bloom's figures.
- **Footer:** a drawing title block. Enquiries open in a validated dialog.

Add `?still` to the URL to freeze the ambient traffic and autoplay when taking screenshots.

Imagery consists of stand-ins taken from the earlier prototype until Bloom supplies photography. Each image's origin is recorded in its `.json` sidecar or embedded metadata. Figures are as stated in Bloom's Website RFP. Arabic is a preview of headings and navigation only.
