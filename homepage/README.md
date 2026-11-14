# Bloom Holding — homepage prototype

An interactive design prototype of the Bloom Holding homepage, built from the approved
discovery deck (`../discovery-deck/final`) and the brief in `../docs/homepage-ui-brief.md`.
Homepage only: inner pages, search results and the Arabic site are out of scope.

```sh
npm start          # http://localhost:4173
npm test           # browser checks: desktop, opening, laptop, phone, tablet, reduced motion
npm run images     # rebuild assets/img from assets/img/manifest.json
npm run artifact   # prepare the page for publishing as a Claude Artifact
npm run standalone # one self-contained file: dist/bloom-homepage.html
```

This cinematic redesign is published for review at <https://claude.ai/artifact/3ooRrhXXGpoZXkencD2EXu>.
The previous design (commit 434c635) stays at <https://claude.ai/artifact/DntWyZ7vHFeYHKbwEbYNL4>.
Both are private to the owner until shared from the page's Share menu.

`npm start` needs nothing installed. `npm test` needs Playwright with Chromium;
`npm run images` needs Python with Pillow.

Useful query string while reviewing: `?motion=off` renders the page as a visitor who has asked
for reduced motion sees it. There is no loading screen: the headline is in the page from the
first paint.

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
| Unclear brand positioning | A full-screen photographic hero states Curated Community Living at once; Our philosophy then explains it word by word (the evidence-led proposition the discovery asked for), each word defined and backed by verified figures |
| Limited visibility of user journeys | Find a Home and Explore Communities are the hero's two actions and the next two sections; the header, mega menu and section dock reach every part of the page |
| Fragmented property discovery | One search console with a Buy / Rent switch, community, type and bedrooms, replacing today's separate sales and leasing journeys |
| Disconnected ecosystem storytelling | "Seven businesses. One connected world.": a numbered index of all seven, with a wire from the selected business to its photograph and an orbit that turns to it |
| Limited community discovery | A horizontal gallery of the five communities in mixed proportions, with location, developments and a link into the search for each |
| Customer service discoverability | A full section of six numbered pathways (three apps, construction updates, phone, enquiry), followed by a closing enquiry screen |

## Motion

Each section moves in its own way, all driven by GSAP and ScrollTrigger over natural browser
scrolling (sticky CSS stages, no scroll hijacking):

| Section | Motion |
|---|---|
| Hero | The photograph settles from a slow push-in, the headline rises out of line masks, an arch window wipes open and its outline draws; scrolling away parts the layers at different speeds; a mouse adds slight depth |
| 01 Our philosophy | Sticky stage in four chapters (Curated, Community, Living, Together): each word is set huge and filled with a photograph that drifts inside the letters; words wipe out and in through masks, definitions rise line by line, figures count up, the arch photograph opens; a step bar fills with the scroll and jumps to a chapter on click |
| 02 Find a Home | Clip-path wipe between the Buy and Rent photographs, sliding pill, animated dropdowns, an outlined word drifting sideways behind |
| 03 Communities | Sticky horizontal rail moved by the scroll (drag and sideways trackpad swipes scroll the page by the same amount); the crop slides inside each frame; the centred card scales up; custom progress. Phones and tablets swipe natively |
| 04 Ecosystem | Sticky two columns; scroll walks the selection down seven numbered rows; images wipe in from the direction of travel; a wire draws to the photograph; the orbit turns; the ground tint changes |
| 05 Life at Bloom | Six photographs drift past the headline at different depths, then a doorway-shaped frame opens to the whole screen |
| 06 About Bloom | Figures rise out of masks and count up as their rules draw across |
| 07 Customer Services | Rows slide in; hover fills a row with cream and a screenshot follows the pointer |
| 08 Closing | An arch window opens to full screen behind the enquiry headline |

Shared micro-interactions: rolling button labels, magnetic calls to action, arrows that pass
through and return, numbered section labels whose rule draws across, the floating section dock.

`prefers-reduced-motion: reduce` (or `?motion=off`) turns all of it off: no sticky stages, no
reveals, and every element renders in its final state; the gallery and ecosystem still work by
buttons and clicks. The page never hides content that only a script can reveal: the `motion`
class that hides pre-animation state is set only when scripts run and motion is wanted, and a
timeout clears it if the scripts fail.

## Content: what is real and what is not

Verified from bloomholding.com (13 Nov 2026) and the Website RFP, via
`../docs/homepage-reference-notes.md`:

- The five communities, their locations, and which Bloom developments sit in each.
- The three e-service apps and what they do; construction updates; the phone numbers,
  email, head office address and social links in the footer.
- The seven figures in About, as stated in the RFP, and the master-developer statement.
- The Bloom wordmark (the supplied red, cream and charcoal PNGs, used unaltered) and all
  photography, which is Bloom's own.

Placeholder or unverified, and marked as such on the page:

- **Search results.** No inventory is connected. The search reports what it would look for and
  says so, under a "Prototype result" tag.
- **Retail and Healthcare.** Bloom's site shows five businesses, not seven. The brief names
  seven, so both appear, with one line of sample copy, no brand name, a "Sample copy and
  temporary image" tag, and a stand-in photograph (a Bloom Living town-centre render and a
  Bloom Living landscape render) noted in the image manifest.
- **Our philosophy definitions and closing line, and the Life at Bloom category captions**:
  written for this prototype from the discovery deck, not supplied by Bloom. The figures in Our
  philosophy are the RFP figures (7 businesses, 5 communities, 15 schools, 20,000+ students,
  6,500+ units delivered, 8,500+ units managed).
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
supporting files to publish alongside it. To check that build before publishing:

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

`npm test` drives a real browser through the page in six suites (`node tests/check.cjs <suite>`
runs one): `desktop` (1440 x 900), `opening` (no loader; the headline is up within 1.5 s),
`laptop` (1366 x 768 and 1280 x 800: every sticky stage fits the screen and clears the dock),
`phone` (390 x 844, touch), `tablet` (834 x 1112, touch) and `reducedMotion`. Between them they
cover the hero layers, header states and scroll spy, the mega menu by mouse and keyboard, the
mobile menu, every story chapter, Buy / Rent, both dropdowns, bedroom chips, quick starts and the
demo search, the gallery by scroll, buttons, arrow keys, drag and native swipe, the ecosystem by
scroll and click with its wire and orbit, the Life frame opening, the counting figures, the
service pathways and pointer preview, the enquiry panel including validation, the closing screen,
the dock, and back to top. They also assert no horizontal overflow, no broken images, no console
errors, touch targets of at least 40px, and that nothing stays hidden or pinned under reduced
motion.

`SHOTS=1 npm test` writes screenshots to `tests/output/`, and `PAGE_URL=…` points the same
checks at another build of the page, such as the artifact preview above.

## Known gaps

- Figures, copy and the image list are all editable in place, but there is no CMS: this is a
  prototype, not a production front end.
- The hero and Life at Bloom use photographs rather than video: Bloom's films are hosted on
  Vimeo, which the discovery capture could not reach. A `<video>` can take the place of the hero
  photograph or the Life closing frame without changing the layout.
- The footer wordmark is capped at 762px, the width of the supplied PNG; a vector logo would
  let it run the full width.
- Tested in Chromium only.
