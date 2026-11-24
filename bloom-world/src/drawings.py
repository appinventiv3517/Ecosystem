"""Generates the three hand-authored plan drawings used on the Bloom World homepage.

- masterplan(): the hero site plan, an illustrative Bloom community with one plot per business.
- coastmap():   the not-to-scale coast from Abu Dhabi to Dubai used by the communities section.
- growthplan(): the night plan in Our Story; each element carries the year it appears.

Every drawing is plain SVG markup styled by classes defined in styles.css, so colours stay tokens.
"""
import random

R = random.Random(11)


def f(n):
    return f"{n:.1f}".rstrip("0").rstrip(".")


# --------------------------------------------------------------------------- shared bits

def tree(x, y, r, cls="tree"):
    return (f'<g class="{cls}" transform="translate({f(x)} {f(y)})">'
            f'<circle r="{f(r)}" class="tree-canopy"/>'
            f'<circle r="{f(r*0.45)}" cx="{f(-r*0.25)}" cy="{f(-r*0.25)}" class="tree-light"/></g>')


def palm(x, y, s=1.0):
    blades = "".join(
        f'<path d="M0 0 Q {f(7*s)} {f(-3*s)} {f(13*s)} {f(1*s)}" transform="rotate({a})"/>' for a in range(0, 360, 60))
    return f'<g class="palm" transform="translate({f(x)} {f(y)})">{blades}<circle r="{f(2.4*s)}"/></g>'


def car(path, dur, begin, cls="car", reverse=False):
    kp = ' keyPoints="1;0" keyTimes="0;1" calcMode="linear"' if reverse else ""
    return (f'<g class="{cls}"><rect x="-9" y="-5" width="18" height="10" rx="3"/>'
            f'<rect class="car-glass" x="2" y="-3.6" width="4.5" height="7.2" rx="1.2"/>'
            f'<animateMotion dur="{dur}s" begin="{begin}s" repeatCount="indefinite" rotate="auto"{kp} path="{path}"/></g>')


def walker(path, dur, begin, cls="walker"):
    return (f'<circle class="{cls}" r="5.5"><animateMotion dur="{dur}s" begin="{begin}s" '
            f'repeatCount="indefinite" path="{path}"/></circle>')


LABELS = []


def label(x, y, text, zone, anchor="start"):
    """Plot labels are collected and drawn last, above the service lines, so nothing covers them."""
    w = 30 + len(text) * 7.6
    x0 = x if anchor == "start" else x - w / 2
    LABELS.append(f'<g class="plot-label" data-biz="{zone}" transform="translate({f(x0)} {f(y)})"><g class="label-in">'
                  f'<rect width="{f(w)}" height="30" rx="15"/>'
                  f'<circle cx="15" cy="15" r="5.5" class="dot z-{zone}"/>'
                  f'<text x="26" y="20">{text}</text></g></g>')
    return ""


def lamp(x, y):
    return f'<circle class="lamp" cx="{f(x)}" cy="{f(y)}" r="5"/>'


# --------------------------------------------------------------------------- the masterplan

def masterplan():
    LABELS.clear()
    out = []
    a = out.append
    a('<svg class="plan-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" '
      'xmlns="http://www.w3.org/2000/svg" aria-labelledby="plan-title plan-desc">')
    a('<title id="plan-title">Illustrative masterplan of a Bloom community</title>')
    a('<desc id="plan-desc">Seven plots, one for each Bloom business: homes, a school, a hotel, a high street, '
      'a clinic, a facilities depot and a park around a lagoon. Select a plot to see the businesses it works with.</desc>')
    a('''<defs>
  <filter id="sun" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow id="sun-shadow" dx="-7" dy="6" stdDeviation="2.5" flood-color="#4a3413" flood-opacity=".32"/>
  </filter>
  <filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="5"/></filter>
  <pattern id="awning" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" class="awning-a"/><rect width="5" height="10" class="awning-b"/></pattern>
  <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" class="grid-dot"/></pattern>
  <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="9" class="hatch-line"/></pattern>
  <pattern id="solar" width="12" height="8" patternUnits="userSpaceOnUse"><rect width="11" height="7" class="solar-cell"/></pattern>
</defs>''')

    # ground
    a('<rect class="g-site" width="1600" height="1000"/>')
    a('<rect fill="url(#dots)" width="1600" height="1000"/>')

    # beyond the plan (under the title block): faded future phases
    a('<g class="beyond">')
    for i in range(6):
        for j in range(9):
            x, y = 40 + i * 78, 40 + j * 104
            if 440 < y < 520:
                continue
            a(f'<rect x="{x}" y="{y}" width="62" height="78" rx="4" class="beyond-lot"/>')
    a('<rect x="0" y="0" width="540" height="1000" fill="url(#hatch)" opacity=".5"/>')
    a('</g>')

    # roads
    a('<g class="roads">')
    a('<rect x="0" y="458" width="1600" height="44" class="road"/>')
    a('<rect x="784" y="0" width="32" height="1000" class="road"/>')
    a('<rect x="1284" y="0" width="32" height="1000" class="road"/>')
    a('<rect x="816" y="258" width="468" height="24" class="road road-minor"/>')
    a('<line x1="0" y1="480" x2="1600" y2="480" class="road-line"/>')
    a('<line x1="800" y1="0" x2="800" y2="1000" class="road-line"/>')
    a('<line x1="1300" y1="0" x2="1300" y2="1000" class="road-line"/>')
    for x in (800, 1300):
        a(f'<g class="roundabout"><circle cx="{x}" cy="480" r="38" class="road"/><circle cx="{x}" cy="480" r="18" class="roundabout-in"/></g>')
    a('</g>')

    # ---------------------------------------------------------------- plots
    # Education
    a('<g class="plot" data-biz="edu" tabindex="0" role="button" aria-label="Education plot: Bloom Education">')
    a('<rect class="zone z-edu" x="576" y="70" width="198" height="374" rx="18"/>')
    a('<g class="bld" filter="url(#sun)">'
      '<rect class="roof" x="598" y="88" width="154" height="38" rx="4"/>'
      '<rect class="roof" x="598" y="126" width="40" height="64" rx="4"/>'
      '<rect class="roof" x="712" y="126" width="40" height="64" rx="4"/>'
      '<rect class="roof-accent z-edu" x="598" y="88" width="154" height="9" rx="3"/></g>')
    a(tree(675, 158, 14))
    a('<rect class="track" x="604" y="240" width="142" height="194" rx="70"/>')
    a('<rect class="pitch" x="621" y="259" width="108" height="156" rx="54"/>')
    a('<line class="pitch-line" x1="621" y1="337" x2="729" y2="337"/><circle class="pitch-line" cx="675" cy="337" r="19" fill="none"/>')
    for i, (cx, cy) in enumerate([(650, 305), (700, 365), (660, 385), (705, 300)]):
        a(f'<circle class="kid" cx="{cx}" cy="{cy}" r="5"><animate attributeName="cx" values="{cx};{cx+22};{cx-8};{cx}" dur="{5+i}s" repeatCount="indefinite"/>'
          f'<animate attributeName="cy" values="{cy};{cy-16};{cy+12};{cy}" dur="{6+i}s" repeatCount="indefinite"/></circle>')
    a(lamp(620, 200)); a(lamp(730, 200))
    a(label(675, 199, "Education", "edu", "middle"))
    a('</g>')

    # Retail high street (town centre)
    a('<g class="plot" data-biz="retail" tabindex="0" role="button" aria-label="Retail plot: shops and cafés">')
    a('<rect class="zone z-retail" x="830" y="70" width="440" height="176" rx="18"/>')
    a('<rect class="promenade" x="846" y="146" width="408" height="26" rx="13"/>')
    a('<g class="bld" filter="url(#sun)">')
    for i in range(7):
        x = 850 + i * 57
        a(f'<rect class="roof" x="{x}" y="88" width="50" height="50" rx="4"/><rect x="{x}" y="128" width="50" height="12" fill="url(#awning)"/>')
        a(f'<rect class="roof" x="{x}" y="180" width="50" height="50" rx="4"/><rect x="{x}" y="180" width="50" height="12" fill="url(#awning)"/>')
    a('</g>')
    for i in range(5):
        a(f'<g class="umbrella" transform="translate({880 + i * 84} 159)"><circle r="9"/><path d="M-9 0H9M0-9V9" /></g>')
    a(walker("M850 152 H1250", 24, 0)); a(walker("M1250 166 H850", 19, -6)); a(walker("M850 160 H1250", 28, -12))
    for i in range(7):
        a(lamp(876 + i * 57, 112)); a(lamp(876 + i * 57, 206))
    a(label(1050, 144, "Retail", "retail", "middle"))
    a('</g>')

    # Healthcare
    a('<g class="plot" data-biz="health" tabindex="0" role="button" aria-label="Healthcare plot: care close to home">')
    a('<rect class="zone z-health" x="830" y="294" width="196" height="150" rx="18"/>')
    a('<g class="bld" filter="url(#sun)"><rect class="roof" x="852" y="314" width="122" height="88" rx="6"/></g>')
    a('<path class="cross z-health" d="M904 334h18v16h16v18h-16v16h-18v-16h-16v-18h16z"/>')
    a(tree(995, 330, 13)); a(tree(1000, 372, 10)); a(tree(990, 410, 12))
    a('<rect class="parking" x="852" y="410" width="122" height="22" rx="3"/>')
    a(lamp(860, 330)); a(lamp(966, 330))
    a(label(928, 255, "Healthcare", "health", "middle"))
    a('</g>')

    # Hospitality
    a('<g class="plot" data-biz="hosp" tabindex="0" role="button" aria-label="Hospitality plot: hotels and serviced apartments">')
    a('<rect class="zone z-hosp" x="1040" y="294" width="230" height="150" rx="18"/>')
    a('<g class="bld" filter="url(#sun)"><rect class="roof" x="1058" y="310" width="130" height="46" rx="5"/>'
      '<rect class="roof" x="1058" y="356" width="48" height="74" rx="5"/>'
      '<rect class="roof-accent z-hosp" x="1058" y="310" width="130" height="8" rx="3"/></g>')
    a('<rect class="pool" x="1124" y="374" width="122" height="52" rx="10"/>')
    a('<path class="pool-ripple" d="M1134 392 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0"/>')
    for i in range(4):
        a(f'<rect class="lounger" x="{1132 + i * 28}" y="432" width="16" height="7" rx="2"/>')
    a(palm(1218, 330, 1.2)); a(palm(1250, 352, 1)); a(palm(1205, 360, .9))
    for i in range(5):
        a(lamp(1072 + i * 26, 334))
    a(label(1155, 255, "Hospitality", "hosp", "middle"))
    a('</g>')

    # Real estate: villas (south-west) and apartments (north-east)
    a('<g class="plot" data-biz="re" tabindex="0" role="button" aria-label="Real estate plot: Bloom homes">')
    a('<rect class="zone z-re" x="576" y="516" width="198" height="420" rx="18"/>')
    a('<rect class="zone z-re" x="1330" y="70" width="252" height="374" rx="18"/>')
    a('<g class="bld" filter="url(#sun)">')
    for r in range(5):
        for c in range(3):
            x, y = 590 + c * 62, 534 + r * 80
            a(f'<rect class="lot" x="{x}" y="{y}" width="54" height="70" rx="5"/>')
            a(f'<g class="villa" transform="translate({x + 8} {y + 8})"><rect width="38" height="30" rx="3" class="villa-roof"/><line x1="0" y1="15" x2="38" y2="15" class="villa-ridge"/></g>')
            if (r + c) % 2 == 0:
                a(f'<rect class="pool" x="{x + 10}" y="{y + 46}" width="18" height="14" rx="3"/>')
    for i, (x, y, w, h) in enumerate([(1348, 88, 100, 150), (1464, 88, 100, 150), (1348, 260, 216, 160)]):
        a(f'<rect class="roof" x="{x}" y="{y}" width="{w}" height="{h}" rx="6"/>')
        a(f'<rect class="courtyard" x="{x + 18}" y="{y + 18}" width="{w - 36}" height="{h - 36}" rx="4"/>')
    a('</g>')
    a(tree(1398, 163, 14)); a(tree(1514, 163, 14)); a(tree(1420, 340, 16)); a(tree(1490, 340, 16))
    for r in range(5):
        for c in range(3):
            a(lamp(617 + c * 62, 562 + r * 80))
    for x in (1398, 1514):
        a(lamp(x, 110))
    a(label(675, 501, "Real Estate", "re", "middle"))
    a('</g>')

    # Landscaping: the park around the lagoon
    a('<g class="plot" data-biz="land" tabindex="0" role="button" aria-label="Landscaping plot: parks, streets and gardens">')
    a('<rect class="zone z-land" x="830" y="516" width="440" height="420" rx="18"/>')
    lagoon = "M900 620 C 930 560 1040 560 1100 590 C 1180 620 1240 600 1236 690 C 1232 780 1160 860 1060 852 C 960 846 880 820 870 740 C 862 690 880 660 900 620 Z"
    a(f'<path class="park-lawn" d="M846 540 H1254 V920 H846 Z"/>')
    a(f'<path class="water" d="{lagoon}"/>')
    a('<path class="water-edge" d="M900 620 C 930 560 1040 560 1100 590 C 1180 620 1240 600 1236 690 C 1232 780 1160 860 1060 852 C 960 846 880 820 870 740 C 862 690 880 660 900 620 Z"/>')
    for i, (x, y) in enumerate([(960, 660), (1100, 700), (1010, 780), (1160, 650)]):
        a(f'<path class="ripple" d="M{x} {y} q8 -5 16 0 t16 0 t16 0"><animate attributeName="opacity" values="0;.9;0" dur="{4 + i}s" begin="{-i}s" repeatCount="indefinite"/></path>')
    a('<rect class="bridge" x="1046" y="640" width="16" height="140" rx="3" transform="rotate(-28 1054 710)"/>')
    a('<path class="park-path" d="M852 560 C 900 540 980 540 1040 556 S 1200 548 1250 560"/>')
    a('<path class="park-path" d="M852 900 C 940 920 1080 900 1250 912"/>')
    for x, y, r in [(866, 580, 13), (890, 878, 15), (1240, 880, 14), (1250, 760, 12), (858, 700, 11), (1210, 560, 13), (950, 900, 10), (1150, 904, 12), (1028, 556, 9), (1120, 556, 11)]:
        a(tree(x, y, r))
    a('<g class="playground"><circle cx="1196" cy="830" r="20"/><path d="M1182 830h28M1196 816v28"/></g>')
    boat_path = "M960 700 C 1000 640 1120 640 1170 690 C 1210 740 1140 810 1060 810 C 980 810 930 760 960 700 Z"
    a(f'<g class="boat"><path d="M-20 -8 H12 L22 0 L12 8 H-20 Z"/><rect x="-10" y="-4" width="10" height="8" rx="2" class="boat-cabin"/><animateMotion dur="26s" repeatCount="indefinite" rotate="auto" path="{boat_path}"/></g>')
    a(f'<g class="boat boat-b"><path d="M-16 -6 H10 L18 0 L10 6 H-16 Z"/><animateMotion dur="34s" begin="-14s" repeatCount="indefinite" rotate="auto" path="{boat_path}"/></g>')
    a(walker("M852 560 C 900 540 980 540 1040 556 S 1200 548 1250 560", 30, 0))
    a(walker("M1250 912 C 1080 900 940 920 852 900", 26, -8))
    a(walker("M852 900 C 940 920 1080 900 1250 912", 35, -20))
    for x, y in [(900, 560), (1000, 550), (1100, 556), (1200, 556), (920, 905), (1040, 910), (1160, 908)]:
        a(lamp(x, y))
    a(label(1050, 501, "Landscaping", "land", "middle"))
    a('</g>')

    # Facilities management depot
    a('<g class="plot" data-biz="fm" tabindex="0" role="button" aria-label="Facilities management plot: the team behind the scenes">')
    a('<rect class="zone z-fm" x="1330" y="516" width="252" height="420" rx="18"/>')
    a('<g class="bld" filter="url(#sun)"><rect class="roof" x="1350" y="536" width="210" height="96" rx="5"/>'
      '<rect x="1360" y="546" width="190" height="76" fill="url(#solar)"/>'
      '<rect class="roof" x="1350" y="654" width="96" height="120" rx="5"/>'
      '<rect class="roof-accent z-fm" x="1350" y="654" width="96" height="9" rx="3"/></g>')
    a('<rect class="yard" x="1462" y="654" width="98" height="262" rx="6"/>')
    for i in range(4):
        a(f'<g class="van" transform="translate({1486} {680 + i * 52})"><rect width="50" height="22" rx="4"/><rect class="car-glass" x="38" y="3" width="8" height="16" rx="2"/></g>')
    a(tree(1380, 820, 14)); a(tree(1420, 880, 12)); a(tree(1370, 900, 10))
    a(lamp(1360, 790)); a(lamp(1440, 790))
    a(label(1456, 628, "Facilities", "fm", "middle"))
    a('</g>')

    # traffic on top of plots so it reads on every road
    a('<g class="traffic">')
    a(car("M-20 470 H1620", 22, 0)); a(car("M-20 470 H1620", 22, -9, "car car-b"))
    a(car("M1620 490 H-20", 19, -4, "car car-c")); a(car("M1620 490 H-20", 19, -13, "car"))
    a(car("M792 -20 V1020", 17, -2, "car car-b")); a(car("M808 1020 V-20", 15, -7, "car car-c"))
    a(car("M1292 -20 V1020", 18, -11, "car")); a(car("M1308 1020 V-20", 16, -3, "car van-car"))
    a(car("M1308 1020 V-20", 16, -11, "car van-car"))
    a('</g>')
    for x in range(30, 1600, 96):
        if 760 < x < 840 or 1260 < x < 1340:
            continue
        a(lamp(x, 452)); a(lamp(x, 508))

    # north arrow and scale bar
    a('<g class="north" transform="translate(1556 168)"><circle r="16"/><path d="M0 -12 L6 6 L0 2 L-6 6 Z"/><text y="-22" text-anchor="middle">N</text></g>')

    a('<rect class="tint" width="1600" height="1000"/>')
    a('<g class="conns" aria-hidden="true"></g>')
    a('<g class="labels">' + "".join(LABELS) + '</g>')
    LABELS.clear()
    a('</svg>')
    return "\n".join(out)


# --------------------------------------------------------------------------- the coast map

def coastmap():
    return '''<svg class="coast-svg" viewBox="0 0 1000 640" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs><pattern id="sea-lines" width="40" height="14" patternUnits="userSpaceOnUse"><path d="M0 7 q10 -6 20 0 t20 0" class="sea-wave"/></pattern></defs>
<rect width="1000" height="640" class="sea"/>
<rect width="1000" height="640" fill="url(#sea-lines)" class="sea-texture"/>
<path class="land" d="M1000 0 L1000 640 L0 640 L0 560 C 60 540 120 520 170 530 C 210 520 230 500 260 505 C 330 470 380 440 420 430 C 500 400 560 360 620 330 C 690 290 760 240 820 190 C 860 160 900 110 940 70 C 960 45 980 20 1000 0 Z"/>
<path class="island" d="M200 470 C 220 440 270 430 320 432 C 360 434 384 448 378 470 C 372 492 340 504 300 506 C 250 508 210 498 200 470 Z"/>
<path class="island" d="M270 392 C 290 374 340 372 368 380 C 392 388 390 404 368 410 C 336 418 292 416 276 410 C 262 404 262 398 270 392 Z"/>
<path class="island" d="M640 230 C 660 214 700 214 712 224 C 722 234 708 246 684 248 C 660 250 640 244 640 230 Z"/>
<path class="mangrove" d="M362 452 C 380 446 396 456 392 470 C 388 482 372 486 362 478 Z"/>
<path class="route" d="M330 470 C 420 470 470 452 540 400 C 620 340 700 300 780 240 C 820 210 846 196 870 186"/>
<g class="route-car"><rect x="-10" y="-5" width="20" height="10" rx="3"/><animateMotion dur="14s" repeatCount="indefinite" rotate="auto" path="M330 470 C 420 470 470 452 540 400 C 620 340 700 300 780 240 C 820 210 846 196 870 186"/></g>
<g class="dhow"><path d="M-16 0 H16 L10 7 H-10 Z"/><path d="M0 0 V-22 L14 -4 Z" class="sail"/><animateMotion dur="40s" repeatCount="indefinite" path="M120 300 C 260 260 420 240 560 160 C 640 120 700 80 760 40"/></g>
<g class="dhow"><path d="M-12 0 H12 L8 5 H-8 Z"/><path d="M0 0 V-16 L10 -3 Z" class="sail"/><animateMotion dur="52s" begin="-20s" repeatCount="indefinite" path="M560 160 C 420 240 260 260 60 360"/></g>
<text class="city" x="905" y="128">Dubai</text>
<text class="city" x="150" y="560">Abu Dhabi</text>
<text class="sea-name" x="230" y="200">Arabian Gulf</text>
<g class="north" transform="translate(950 590)"><circle r="16"/><path d="M0 -12 L6 6 L0 2 L-6 6 Z"/><text y="-22" text-anchor="middle">N</text></g>
<g class="scale" transform="translate(40 610)"><path d="M0 0 H120 M0 -6 V6 M60 -4 V4 M120 -6 V6"/><text x="130" y="5">Not to scale</text></g>
</svg>'''


# --------------------------------------------------------------------------- the growth plan

def growthplan():
    o = []
    a = o.append
    a('<svg class="growth-svg" viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">')
    a('<rect width="600" height="420" class="night-ground"/>')
    for x in range(0, 600, 30):
        a(f'<line x1="{x}" y1="0" x2="{x}" y2="420" class="night-grid"/>')
    for y in range(0, 420, 30):
        a(f'<line x1="0" y1="{y}" x2="600" y2="{y}" class="night-grid"/>')
    a('<path class="night-road" d="M0 210 H600 M300 0 V420"/>')

    def grp(year, inner):
        a(f'<g class="grow" data-year="{year}">{inner}</g>')

    def villas(x0, y0, cols, rows):
        s = ""
        for r in range(rows):
            for c in range(cols):
                s += f'<rect class="g-villa" x="{x0 + c * 22}" y="{y0 + r * 20}" width="16" height="14" rx="2"/>'
        return s

    # 2008 Bloom Gardens phase 1
    grp(2008, '<rect class="g-zone z-re" x="30" y="236" width="120" height="96" rx="10"/>' + villas(42, 248, 5, 4))
    # 2011 Brighton College Al Ain
    grp(2011, '<rect class="g-zone z-edu" x="30" y="30" width="110" height="150" rx="10"/><rect class="g-bld" x="44" y="44" width="82" height="34" rx="3"/><rect class="g-track" x="48" y="92" width="74" height="74" rx="37"/>')
    # 2012 First homes handed over: gardens and lights
    grp(2012, "".join(f'<circle class="g-light" cx="{50 + c * 22}" cy="{255 + r * 20}" r="3"/>' for r in range(4) for c in range(5)))
    # 2015 Soho Square on Saadiyat
    grp(2015, '<path class="g-water" d="M330 20 H590 V170 H330 Z"/><rect class="g-island" x="380" y="50" width="160" height="90" rx="30"/><rect class="g-zone z-re" x="400" y="64" width="120" height="62" rx="8"/><rect class="g-bld" x="414" y="74" width="40" height="42" rx="3"/><rect class="g-bld" x="466" y="74" width="40" height="42" rx="3"/>')
    # 2017 Bloom Gardens grows
    grp(2017, '<rect class="g-zone z-re" x="160" y="236" width="120" height="96" rx="10"/>' + villas(172, 248, 5, 4))
    # 2018 Schools open in Dubai
    grp(2018, '<rect class="g-zone z-edu" x="160" y="30" width="120" height="150" rx="10"/><rect class="g-bld" x="174" y="44" width="92" height="34" rx="3"/><rect class="g-bld" x="174" y="96" width="92" height="34" rx="3"/>')
    # 2022 Bloom Living launches (lake + first villas)
    grp(2022, '<rect class="g-zone z-land" x="320" y="236" width="260" height="164" rx="12"/><path class="g-water" d="M380 300 C 410 270 500 270 530 300 C 556 330 520 372 460 372 C 400 372 360 336 380 300 Z"/>' + villas(336, 250, 3, 2))
    # 2024 Three more phases
    grp(2024, villas(494, 250, 3, 2) + villas(336, 344, 2, 2) + villas(520, 344, 2, 2))
    # 2026 Bloom Arjaan by Rotana
    grp(2026, '<rect class="g-zone z-hosp" x="30" y="350" width="250" height="56" rx="10"/><rect class="g-bld" x="44" y="362" width="120" height="32" rx="3"/><rect class="g-pool" x="176" y="364" width="90" height="28" rx="6"/>')
    a('</svg>')
    return "\n".join(o)
