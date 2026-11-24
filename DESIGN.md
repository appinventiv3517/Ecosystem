---
name: Bloom World
description: A living masterplan. Bloom's seven businesses drawn as one site plan in planning-drawing material.
colors:
  bloom-red: "#922a22"
  bloom-red-deep: "#73201a"
  bloom-red-tint: "#f6d9d3"
  zone-residential: "#f0a431"
  zone-education: "#3b74cc"
  zone-hospitality: "#ec6a51"
  zone-retail: "#d94c84"
  zone-healthcare: "#2aa889"
  zone-facilities: "#586683"
  zone-landscape: "#5da246"
  zone-lagoon: "#2bb1c3"
  lagoon-deep: "#0e6676"
  night-plan: "#161d3d"
  blueprint: "#1d4c9c"
  site-sand: "#e7c48a"
  site-sand-deep: "#d6a964"
  site-line: "#b98a45"
  drawing-paper: "#fff8ec"
  drafting-ink: "#1d1830"
  ink-soft: "#463d55"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Readex Pro, system-ui, sans-serif"
    fontSize: "clamp(2.3rem, 5.2vw, 4.6rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  figure:
    fontFamily: "Bricolage Grotesque, Readex Pro, system-ui, sans-serif"
    fontSize: "clamp(4.4rem, 9vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Bricolage Grotesque, Readex Pro, system-ui, sans-serif"
    fontSize: "clamp(1.8rem, 2.6vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Bricolage Grotesque, Readex Pro, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  lede:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 600
    lineHeight: 1.3
  cell-label:
    fontFamily: "Readex Pro, system-ui, sans-serif"
    fontSize: "0.74rem"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  sheet: "6px"
  field: "12px"
  tile: "16px"
  card: "18px"
  frame: "22px"
  panel: "26px"
  pill: "999px"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  section: "clamp(80px, 11vw, 150px)"
  section-head: "40px"
  container: "1320px"
components:
  button-primary:
    backgroundColor: "{colors.bloom-red}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 1.35em"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.bloom-red-deep}"
  button-ink:
    backgroundColor: "{colors.drafting-ink}"
    textColor: "{colors.drawing-paper}"
    rounded: "{rounded.pill}"
    padding: "0 1.35em"
    height: "48px"
  button-paper:
    backgroundColor: "{colors.drawing-paper}"
    textColor: "{colors.bloom-red}"
    rounded: "{rounded.pill}"
    padding: "0 1.35em"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.drafting-ink}"
    rounded: "{rounded.pill}"
    padding: "0 1.35em"
    height: "48px"
  legend-chip:
    backgroundColor: "transparent"
    textColor: "{colors.drafting-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 9px 0 6px"
    height: "30px"
  legend-chip-pressed:
    backgroundColor: "{colors.drafting-ink}"
    textColor: "{colors.drawing-paper}"
  input-field:
    backgroundColor: "{colors.drawing-paper}"
    textColor: "{colors.drafting-ink}"
    rounded: "{rounded.field}"
    padding: "0 14px"
    height: "46px"
  title-block-sheet:
    backgroundColor: "{colors.drawing-paper}"
    textColor: "{colors.drafting-ink}"
    rounded: "{rounded.sheet}"
  plot-card:
    backgroundColor: "{colors.drawing-paper}"
    textColor: "{colors.drafting-ink}"
    rounded: "{rounded.card}"
    padding: "20px 20px 18px"
    width: "340px"
  panel:
    backgroundColor: "{colors.drawing-paper}"
    textColor: "{colors.drafting-ink}"
    rounded: "{rounded.panel}"
---

# Design System: Bloom World

## Overview

**Creative North Star: "The Living Masterplan"**

Bloom World is drawn, not photographed. The whole system is planning-drawing material at page scale: a saturated desert-sand site ground, zoning fields in full colour, white roads with dashed centre lines, plot outlines, north arrows, scale bars, legends and a drawing title block. Every Bloom business is a zone with its own colour, and those colours are big enough to own whole sections of the page, so scrolling reads like walking across the site from the residential quarter to the lagoon, the park, the facilities yard, the blueprint archive and the night plan.

Tools sit on top of the drawing as sheets of paper outlined in drafting ink: the title block, the legend, the day clock, the plot card, the search sheet, the area schedule. Controls borrow the plan's own furniture: filters are legend entries with zone swatches, confirmations are stamps, the footer is a title block. Bloom red is the one voice that is not a zone: it marks the main action and Bloom's own connections between plots.

Motion is the plan working. Service lines draw between plots when one is tapped, cars and boats move on the roads and water, and a day clock runs the plan from morning light to a multiply-tinted night with lamps on. Everything else moves little and briefly.

**Key Characteristics:**
- Saturated sand site ground with zoning colours at full strength as section grounds.
- Paper sheets with 2px drafting-ink borders and ruled cells carry every tool.
- Dashed lines mean available or at rest; solid lines mean selected, built or engaged.
- Bricolage Grotesque at weight 800 with tight tracking for drawing titles; Readex Pro for all running text and Arabic.
- Bloom red for main actions, focus, selection and service lines only.
- Bilingual by construction: logical properties throughout, mirrored arrows and clip reveals in RTL.

## Colors

A planning palette: sand ground, paper and ink, eight zoning colours plus two drawing grounds, and one brand red standing apart from all of them.

### Primary
- **Bloom Red** (bloom-red): every main action (enquire, search, primary CTA), the focus ring, the selected coast pin, the service lines drawn between plots, the "reserved" stamp, the route on the coast map and the second line of the hero H1.
- **Bloom Red Deep** (bloom-red-deep): hover and pressed state of red actions only.
- **Bloom Red Tint** (bloom-red-tint): a quiet red wash where red needs a background; reserved, rarely used.

### Secondary: the zoning set
Each Bloom business has one zone colour. On the plan a zone is drawn as the colour mixed into the sand (roughly 50 to 62 percent) with a dashed outline in the full colour; as a section ground it appears at full strength; as a key swatch it is a 12px square.
- **Residential Ochre** (zone-residential): homes and Bloom Properties; owns the Find a Home section; also the highlight on the night plan (story year, range slider).
- **Education Blue** (zone-education): schools.
- **Hospitality Coral** (zone-hospitality): hotels and serviced apartments.
- **Retail Rose** (zone-retail): shops, promenade, awnings.
- **Healthcare Mint** (zone-healthcare): clinics and care.
- **Facilities Slate** (zone-facilities): facilities management; owns the Customer Services and apps section.
- **Landscape Green** (zone-landscape): parks, lawns, mangroves; owns the Life section; also the success colour (result panel, enquiry-sent stamp).
- **Lagoon Turquoise** (zone-lagoon): water on every drawing; **Lagoon Deep** (lagoon-deep) owns the Communities (coast) section.

### Tertiary: drawing grounds
- **Blueprint Blue** (blueprint): the Awards and news section, overlaid with a 32px white grid at 7 percent.
- **Night Plan Navy** (night-plan): the Story section, where the plan is redrawn at night with dimmed zone fills and lit windows.

### Neutral
- **Site Sand** (site-sand): the page ground, the hero plan ground and the About section; the colour Bloom builds on.
- **Site Sand Deep** (site-sand-deep) and **Site Line** (site-line): road centre-lines, plot hatching, survey dots and dashed lot boundaries on the plan.
- **Drawing Paper** (drawing-paper): every sheet, panel, road surface, input and label chip.
- **Drafting Ink** (drafting-ink): text, sheet borders, pressed/selected fills, the footer ground.
- **Ink Soft** (ink-soft): secondary text, field labels, title-block cell labels.

Where a zone colour carries white text at small size (the day clock's selected hour), it is darkened toward ink rather than used raw; on the night plan, zone outlines lighten instead. These are legibility variants of the same zone, not new colours.

**The Zone Owns the Section Rule.** A content section takes one zone or drawing ground at full strength as its whole background, and its accent details stay in that zone's family. Sections are flat colour fields, never gradients or photo backgrounds.

**The One Red Rule.** Bloom red is not a zone and never fills a section or a plot. It marks what Bloom asks you to do (the main action) and what Bloom connects (service lines, routes, the selected pin, focus). If two red buttons compete in one view, one of them is wrong.

## Typography

**Display Font:** Bricolage Grotesque (falling back to Readex Pro, then system-ui), self-hosted variable 200 to 800.
**Body Font:** Readex Pro (system-ui fallback), self-hosted variable 160 to 700, with its own Arabic subset.

**Character:** Bricolage at 800 with tight negative tracking reads like the bold lettering on a drawing title; Readex Pro is a clear, slightly technical sans that carries Latin and Arabic in one voice, so the AR page keeps the same texture.

### Hierarchy
- **Display** (800, clamp 2.3 to 4.6rem, line-height 0.98, -0.035em, balanced wrap): one per section, the section's headline. The hero H1 uses the same treatment at clamp 2.3 to 3.3rem inside the title block.
- **Figure** (800, clamp 4.4 to 6rem, line-height 0.9, tabular): the single big number in a section, such as the story year. Area-schedule figures use the same voice at clamp 1.6 to 2.3rem.
- **Headline** (800, clamp 1.8 to 2.5rem, line-height 1): names inside panels: community name, app name, enquiry title, plot-card name (1.7rem), parcel name (1.45rem).
- **Title** (700, 1.25rem, line-height 1.3): sub-headings, legend title, schedule caption, news titles.
- **Body** (400, 1rem, line-height 1.55): running text; intros step up to the lede size (1.05 to 1.15rem) and hold 40 to 46ch.
- **Label** (600, 0.8 to 0.92rem): chips, buttons, field labels, legend entries, operator lines.
- **Cell label** (600, 0.74rem, 0.04em tracking, uppercase): only the field names inside a title-block cell (Client, Scale, Status), the way a drawing title block labels its fields.

**The Drawing Title Rule.** Display type is always Bricolage at 800 with negative tracking; nothing between 400 and 700 is set in the display face at large sizes. Running text, controls and Arabic stay in Readex Pro.

**The Tabular Clock Rule.** Hours, years, counts and schedule figures use tabular numerals so the day clock and timelines never jitter.

## Layout

A centred container of 1320px with a fluid gutter (clamp 16 to 56px) and generous section padding (clamp 80 to 150px). Section heads are a two-column grid (headline 1.2fr, intro 1fr, aligned to the bottom) with 40px below; content grids use asymmetric splits (1.35fr / 1fr map and panel, 2fr / 1fr apps and contact, 1.25fr / 1fr drawing and story).

The hero is the exception: a full-bleed plan filling at least the viewport, with paper sheets pinned to its corners (title block and legend at the inline start, day clock along the bottom, a note at the inline end). Below 1100px the hero unstacks into a column: title sheet, collapsed legend search, a horizontally pannable plan (minimum 560px wide), the day clock, the plot card and the note. Below 860px all two-column heads and grids collapse to one column and the life strips stack; below 560px parcels and search fields go single-column.

All placement uses logical properties (inline-start/end), so the layout mirrors for Arabic without separate rules beyond arrows, clip reveals and the range track.

## Elevation & Depth

The drawing is flat; the paper on top of it is lifted. One warm, sand-tinted shadow (a long soft drop plus a short contact shadow) sits under every sheet that floats over the plan or a section: title block, legend, day clock, plot card, search sheet, schedule, mobile menu, toast. The header bar has a lighter variant of the same shadow. Coast pins carry a small dark drop so they read as stuck into the map. Panels set into a coloured section (community panel, app panel) sit flat with no shadow. On the plan, depth comes from a sun-angle drop shadow on buildings that moves with the day clock, and night is a multiply tint over the whole drawing with lamps glowing.

**The Paper Lift Rule.** Shadows belong to paper sheets resting on the drawing, never to drawn things (plots, zones, roads) and never as a hard offset block.

## Shapes

Two families of form. Sheets that behave like drawing documents (title block, legend) have near-square corners (6px) and 2px ink borders with internal ruled cells at 1.5px ink-25-percent. Panels, cards and frames that hold content are generously rounded (16 to 26px), and every control (buttons, chips, legend entries, segmented switches, the day clock, the header bar) is a full pill. Fields are 12px.

Line language carries meaning: dashed outlines (zones, parcels, mode options, lot boundaries, centre lines) are the drawing at rest; they turn solid on hover, focus or selection. Circles are reserved for stamps (awards, the enquiry-sent stamp) and round icon buttons; the "reserved" stamp is a rotated, uppercase red box.

**The Dashed Means Proposed Rule.** A dashed edge means available, at rest or not yet built; a solid edge means chosen, engaged or built. Never draw a selected state dashed.

## Components

### Buttons
- **Shape:** full pill (rounded.pill), 48px tall (40px small, 58px large), 2px border, label weight 600.
- **Primary:** Bloom red with white text; hover deepens to Bloom red deep; a trailing arrow nudges 3px toward the reading direction.
- **Ink / Paper / Ghost / Line:** ink fill on light grounds; paper fill with red text on dark grounds; ghost outlines in currentColor and fills ink on hover; line is a paper outline at 55 percent for dark sections.
- **Pressed:** translates 1px down. Round icon buttons are 46px circles outlined in currentColor.

### Legend chips and segmented controls
- **Style:** pill entries with a 12px zone swatch, no border, label weight 600; hover washes with sand.
- **State:** pressed or checked fills with drafting ink and paper text. The same grammar runs the Buy/Rent segment, bedroom chips, audience switch (outlined in white on slate) and the coast legend (numbered paper badges that turn red when current).

### Inputs / Fields
- **Style:** paper fill, 2px ink border at 20 percent, 12px radius, 46px tall, custom chevron on selects (mirrored in RTL).
- **Focus:** border goes full ink plus a 3px Bloom red halo at 40 percent.
- **Error:** border and message in Bloom red; the message appears under the field.

### Title-block sheet
Paper sheet with a 2px ink border, 6px corners and the paper lift shadow; headline on top, then a grid of ruled cells (uppercase cell label over a 600-weight value). A full-width status cell takes a light sand wash. The footer repeats the title block in ink with paper rules: brand, business key, contact, drawing register and a scale bar.

### Plot card
Paper card (18px, 2px ink border, lift shadow) that scales in from the tapped plot. A zone-coloured dot precedes the plot name; the hour sits in tabular Bricolage; linked businesses appear as outlined chips with zone dots that fill ink on hover.

### Cards / Parcels
Parcels are paper tiles with a 2.5px dashed ink border and 20px corners that go solid on hover while the image scales 6 percent; unbuilt parcels show a hatched ground and a rotated red "reserved" stamp.

### Navigation
A floating paper pill bar with the wordmark, text links that wash with sand on hover or when current, an EN/AR switch whose active side fills ink, and a red enquire button. Below 1100px links collapse into a round sand menu button and a paper sheet menu.

### Day clock (signature)
A paper pill along the bottom of the plan: an ink play button and a scrollable track of hour stops. The selected hour fills with its zone's colour (darkened for white text; red for the 24/7 stop), the plan's sun shadow and tint follow, and from evening the lamps light.

### Service lines (signature motion)
Tapping a plot dims and desaturates every unrelated plot to 42 percent, thickens the chosen zone's outline to solid, and draws 5px Bloom red lines to each linked plot, with a paper dash flowing along them and a red ring pulsing at each end. All easing is one expressive ease-out curve; reduced motion keeps colour changes and drops the flow, rings and movement.

## Do's and Don'ts

### Do:
- **Do** give each new content section one zone or drawing ground at full strength, chosen by the business the section is about.
- **Do** put tools on paper sheets with a 2px drafting-ink border and the warm paper lift shadow.
- **Do** build filters and selectors as legend entries with zone swatches; pressed state fills ink.
- **Do** use dashed edges for at-rest or unbuilt states and solid edges for selected or built ones.
- **Do** keep Bloom red for the main action, focus and Bloom's connections, one primary red button per view.
- **Do** use logical properties and mirror directional arrows and reveals for Arabic.
- **Do** label anything not live (search, listings, form, illustrative plan) in plain text on the surface itself.

### Don't:
- **Don't** fill a section, plot or zone with Bloom red, or use red as a decorative accent.
- **Don't** use gradients for section grounds; the only gradients are the blueprint grid rules, photo scrims and slider fills.
- **Don't** set display headlines in a light weight or in the text face, or set running text in Bricolage.
- **Don't** put shadows on drawn plan elements or use hard offset shadows; depth on the plan comes from the sun angle and the night tint.
- **Don't** return to the incumbent prototype's cream ground, serif display or scattered red accents.
