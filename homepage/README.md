# Bloom Holding — homepage prototype

An interactive design prototype of the Bloom Holding homepage, built from the approved
discovery deck (`../discovery-deck/final`) and the brief in `../docs/homepage-ui-brief.md`.
Homepage only: inner pages, search results and the Arabic site are out of scope.

```sh
npm start          # http://localhost:4173
npm test           # browser checks: desktop, tablet, phone, intro, reduced motion
npm run images     # rebuild assets/img from assets/img/manifest.json
npm run artifact   # prepare the page for publishing as a Claude Artifact
npm run standalone # one self-contained file: dist/bloom-homepage.html
```

Published for review at <https://claude.ai/artifact/DntWyZ7vHFeYHKbwEbYNL4> — private to the
owner until it is shared from the page's Share menu.

`npm start` needs nothing installed. `npm test` needs Playwright with Chromium;
`npm run images` needs Python with Pillow.

Useful query strings while reviewing: `?intro=off` skips the loading sequence,
`?motion=off` renders the page as a visitor who has asked for reduced motion sees it.

## Why this setup

The repository had no frontend framework: a static proposal page (`../src/proposal.html`,
built by `../build.py`) and the discovery deck generator (`../discovery-deck/`). Rather than
introduce a build step and a framework for one page, the prototype is static HTML, modern CSS
and ES modules, with GSAP vendored in `vendor/gsap/`. There is nothing to install or compile,
it opens from a plain static server, and every file can be read on its own. The existing
proposal and deck are untouched; everything here lives in this folder.

```
index.html              the whole page; sections are numbered in comments
css/tokens.css          colours, type, spacing, motion — change the brand here
css/base.css            reset, typography, buttons, arch frame
css/<section>.css       one file per section, in page order
js/main.js              entry point and the click router
js/lib/                 DOM helpers, GSAP setup
js/ui/                  reusable pieces: dropdown, reveals, enquiry panel, toast
js/sections/            one module per section
assets/img/manifest.json  every photograph, with the page it came from
tools/build_images.py   downloads and crops the photographs
tests/check.cjs         the browser checks
```

Sections talk to each other through page events (`bloom:find`, `bloom:community`,
`bloom:vertical`, `bloom:service`, `bloom:enquire`), so a community card can drive the search
and the footer can drive the ecosystem without the modules importing one another.

## How the design answers the discovery

| Discovery finding | In the design |
|---|---|
| Unclear brand positioning | Hero states Curated Community Living over Bloom's own photography; three floating arches show education, hospitality and landscaping from the first screen; the About section carries the master-developer statement and the RFP figures |
| Limited visibility of user journeys | "Where would you like to begin?" puts the four destinations — and the audience each serves — directly under the hero, before any scrolling of the page's body |
| Fragmented property discovery | One search console with a Buy / Rent switch, community, type and bedrooms, replacing today's separate sales and leasing journeys |
| Disconnected ecosystem storytelling | The seven businesses orbit one centre; selecting one draws its connection into Curated Community Living and swaps the image and copy |
| Limited community discovery | A draggable editorial gallery of the five communities; each card names its Bloom developments and links straight into the search for that community |
| Customer service discoverability | A full section, not a footer link: say what you need to do and the matching pathway highlights |

## Motion

Different techniques per section, on purpose: a masked arch opening for the page load,
staggered word reveals in the hero, a clip-path wipe for Buy / Rent and the ecosystem images,
drag with inertia in the carousel, a pinned scroll sequence for Life at Bloom, counting figures
in About, and a scrubbed reveal in the footer.

`prefers-reduced-motion: reduce` (or `?motion=off`) turns all of it off: no intro, no pinning,
no reveals, and every element renders in its final state. The page never hides content that only
a script can reveal — the `motion` class that hides pre-animation state is set only when scripts
run and motion is wanted, and a timeout clears it if the scripts fail.

## Content: what is real and what is not

Verified from bloomholding.com (13 Nov 2026) and the Website RFP, via
`../docs/homepage-reference-notes.md`:

- The five communities, their locations, and which Bloom developments sit in each.
- The three e-service apps and what they do; construction updates; the phone numbers,
  email, head office address and social links in the footer.
- The six figures in About, as stated in the RFP, and the master-developer statement.
- The Bloom wordmark (the supplied red, cream and charcoal PNGs, used unaltered) and all
  photography, which is Bloom's own.

Placeholder or unverified, and marked as such on the page:

- **Search results.** No inventory is connected. The search reports what it would look for and
  says so, under a "Prototype result" tag.
- **Retail and Healthcare.** Bloom's site shows five businesses, not seven. The brief names
  seven, so both appear, with one line of sample copy, no brand name, a "Sample copy and
  temporary image" tag, and a stand-in photograph (a Bloom Living town-centre render and a
  Bloom Living landscape render) noted in the image manifest.
- **Life at Bloom chapter titles and copy**, and the audience labels on the four doors: written
  for this prototype from the discovery deck's audience work, not supplied by Bloom.
- **Arabic.** The EN/AR switch is present and explains that the prototype is English only.
- Every destination outside the homepage (community pages, business pages, the apps, legal
  pages) says so when activated, rather than linking nowhere.

## Images

Every photograph is listed in `assets/img/manifest.json` with its source page on
bloomholding.com, the alt text, where it is used, and whether it is temporary. The build script
downloads each original into `tools/originals/` (git-ignored), crops it around a focal point and
writes the `.webp` sizes the page uses. To replace one, change its `source_url` (or drop a file
named `<name>.<ext>` into `tools/originals/`) and run `npm run images -- --force`.

## Publishing

`npm run artifact` writes three files into `dist/` (ignored by git): `artifact-index.html`,
the page without its document skeleton, which the artifact host supplies; `preview.html`, the
same content inside a copy of that skeleton so it can be tested locally; and `files.json`, the
105 supporting files to publish alongside it. To check that build before publishing:

```sh
npm start
PAGE_URL=http://localhost:4173/dist/preview.html npm test
```

Publishing is one `Artifact` call: `dist/artifact-index.html` as the page and the paths in
`dist/files.json` as its files. Republishing the same path updates the same URL.

## One-file copy

`npm run standalone` writes `dist/bloom-homepage.html`, a single file that opens straight from
disk with no server. Stylesheets, GSAP and the page's modules are inlined (the modules bundled
by a small built-in bundler in `tools/build_standalone.py`), and every picture is embedded once,
keeping the largest size up to 1400px wide. Only the Google Fonts request goes out; offline the
page uses the fallback fonts in `css/tokens.css`. To check it:

```sh
PAGE_URL=file://$PWD/dist/bloom-homepage.html npm test
```

## Checks

`npm test` drives a real browser through every interaction the brief lists: header states and
the scroll spy, the mega menu by mouse and keyboard, the full-screen mobile menu, Buy / Rent,
both dropdowns by mouse and keyboard, bedroom chips, quick starts, the demo search and its
follow-through into a community, carousel arrows / drag / arrow keys / touch swipe, the
ecosystem by click, keyboard and tap, the pinned Life chapters, the service task finder, the
enquiry panel including validation, the counting figures, the language switch, demo-destination
feedback, and back to top. It also asserts no horizontal overflow, no broken images, no console
errors, touch targets of at least 40px, and that nothing stays hidden under reduced motion.

`SHOTS=1 npm test` writes screenshots to `tests/output/`, and `PAGE_URL=…` points the same
checks at another build of the page, such as the artifact preview above.

## Known gaps

- Figures, copy and the image list are all editable in place, but there is no CMS: this is a
  prototype, not a production front end.
- The hero uses photographs rather than Bloom's Vimeo-hosted video, which the discovery capture
  could not reach. A video source can replace the first slide without changing the layout.
- Tested in Chromium only.
