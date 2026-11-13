# Homepage build — reference notes

Facts verified during the discovery phase, for use when building the homepage prototype.
Anything not listed here is unverified: mark it as placeholder content.

## Where things are

| What | Path |
|---|---|
| Approved discovery deck (10 slides, standalone HTML) | `discovery-deck/final/Bloom Homepage Product Discovery.html` |
| Discovery deck slide sources | `discovery-deck/final/slides/*.html` |
| Brief for this phase (the request, verbatim) | `docs/homepage-ui-brief.md` |
| Bloom wordmark (red / cream / charcoal PNG, from an alpha mask) | `discovery-deck/assets/deck/wordmark-*.png`, source mask `src/assets/bloom-wordmark-alpha.png` |
| Bloom photography taken from bloomholding.com | `discovery-deck/assets/deck/cover.jpg`, `photo-marina.jpg`, `photo-skyline.jpg`, and originals in `discovery-deck/assets/site/*.webp` |
| Live homepage screenshots (12 Nov 2026, 1440px) | `discovery-deck/assets/home-*.png` |
| Screenshot capture script (Playwright) | `discovery-deck/capture.js` |

The repository had no frontend framework before this phase: a static proposal page
(`src/proposal.html`, built by `build.py`) and the discovery deck generator (`discovery-deck/`).

## Brand, as used in the approved deck

- Red `#962B23`, cream `#F8F6EA`, ink `#1D1A17`, black `#0E0D0C`, sand `#E9E1CF`, line `#DDD3BD`, muted text `#6B655C`, card `#FFFDF7`.
- Playfair Display (headlines, one italic red accent word) and DM Sans (everything else).
- Motif: arches (rounded-top frames and panels), from the arched architecture in Bloom's communities.

## Verified from the live homepage (bloomholding.com, 12 Nov 2026)

- Current navigation: Who We Are, What We Do, Properties, Media Centre, Careers, Contact Us, Make Enquiry, Arabic switch.
- Developments listed under Properties: Al Metlaa, Aldhay, Bloom Arjaan by Rotana, Bloom Central, Bloom Gardens,
  Bloom Heights, Bloom Living Abu Dhabi, Bloom Marina, Bloom Towers, Faya, Park View, Rochester (USA), Soho Square.
- Footer "Our Communities" locations: Jumeirah Village Circle, Al Bateen Marina, Eastern Mangrove Corniche,
  Saadiyat Island, Zayed City (Khalifa City C).
- Footer "E-Services": Bloom Community App, Bloom Super App, Bloom Partners App. Also: Construction Updates, Become a Partner.
- Current search filters: property, property type, bedrooms (no Buy/Rent choice). Leasing and Sales are separate menu items.
- Businesses shown on the homepage today: Bloom Properties, Bloom Education, Bloom Hospitality, Bloom Landscape,
  Bloom Facilities Management. Retail and Healthcare are not shown.
- Homepage statement: "We are a master developer committed to curating premium communities that provide a high standard of living."
- The hero background video is served from Vimeo and did not load in the capture environment.

Which development sits in which location was not verified. Do not pair them without checking the live site.

## Figures stated in the Website RFP (page 1, "About Bloom")

- Delivered more than 6,500 residential units.
- Over 25,000 units in the pipeline.
- More than 1,000 residential units within its leasing portfolio.
- Hospitality: Marriott Downtown, The Abu Dhabi EDITION and Bloom Arjaan by Rotana, comprising 851 hotel rooms and serviced apartments.
- Bloom Education operates 15 schools serving more than 20,000 students, including Brighton College and Bloom World Academy.
- Bloom Facilities Management (bfm) manages more than 8,500 units.

The RFP PDF itself is not in the repository.
