// Bloom Holding — Homepage Product Discovery deck (6 slides, editable .pptx)
// Usage: node build.js   -> ../Bloom_Homepage_Product_Discovery.pptx
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const sharp = require("sharp");
const lu = require("react-icons/lu");
const { applyTheme } = require("./apply_theme.js");

const OUT = path.join(__dirname, "..", "Bloom_Homepage_Product_Discovery.pptx");
const IMG = (f) => path.join(__dirname, "assets", "deck", f);

const THEME = {
  name: "Bloom Discovery",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "2B2B28", // deep charcoal
    lt1: "FAF7F1", // warm off-white
    dk2: "46553A", // deep olive
    lt2: "EAE2D3", // warm sand
    accent1: "6F7F52", // olive
    accent2: "B9C1A3", // pale olive
    accent3: "922A22", // Bloom red (sampled from bloomholding.com) — high priority
    accent4: "BD8A3E", // ochre — medium priority
    accent5: "6B675F", // muted text
    accent6: "FFFFFF", // card surface
    hlink: "46553A",
    folHlink: "6B675F",
  },
};
const HEAD = "+mj-lt";

const icon = async (name, hex) => {
  const svg = renderToStaticMarkup(React.createElement(lu[name], { size: 256, color: "#" + hex, strokeWidth: 1.6 }));
  return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
};

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.title = "Bloom Holding — Homepage Product Discovery";
  pres.subject = "Product Discovery: current experience, pain points and UX disparities";
  const C = pres.SchemeColor;
  const INK = C.text1, PAPER = C.background1, OLIVE_D = C.text2, SAND = C.background2;
  const OLIVE = C.accent1, RED = C.accent3, OCHRE = C.accent4, MUTE = C.accent5, CARD = C.accent6;
  const M = 0.6, W = 13.333, CW = W - 2 * M;

  // ---------- layouts ----------
  const footer = [
    { image: { path: IMG("wordmark-charcoal.png"), x: M, y: 7.0, w: 0.64, h: 0.2 } },
    { text: { text: "Homepage Product Discovery", options: { x: 1.4, y: 6.98, w: 2.6, h: 0.24, fontSize: 9, color: MUTE, margin: 0, valign: "middle" } } },
  ];
  const slideNumber = { x: 12.13, y: 6.98, w: 0.6, h: 0.24, fontSize: 9, color: MUTE, align: "right", margin: 0 };
  pres.defineSlideMaster({
    title: "COVER",
    background: { color: PAPER },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: M, y: 1.75, w: 7.7, h: 1.5, fontSize: 46, color: INK, margin: 0, valign: "top", align: "left" }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: PAPER },
    objects: [
      ...footer,
      { placeholder: { options: { name: "title", type: "title", x: M, y: 0.8, w: CW, h: 0.65, fontSize: 32, color: INK, margin: 0, valign: "middle", align: "left" }, text: "" } },
      { placeholder: { options: { name: "subtitle", type: "body", x: M, y: 1.48, w: CW, h: 0.4, fontSize: 14, color: MUTE, margin: 0, valign: "top" }, text: "" } },
    ],
    slideNumber,
  });

  // ---------- helpers ----------
  const T = (s, text, o) => s.addText(text, { isTextBox: true, margin: 0, valign: "top", color: INK, fontSize: 12, ...o });
  const eyebrow = (s, text) => T(s, text, { x: M, y: 0.5, w: 9, h: 0.24, fontSize: 9.5, bold: true, color: OLIVE, charSpacing: 2, objectName: "Eyebrow" });
  const label = (s, text, o) => T(s, text, { fontSize: 9, bold: true, color: OLIVE, charSpacing: 1.5, h: 0.22, ...o });
  const source = (s, text) => T(s, text, { x: 4.2, y: 6.98, w: 7.8, h: 0.24, fontSize: 9, color: MUTE, align: "right", valign: "middle", objectName: "Source" });
  const card = (s, x, y, w, h, name, fill = CARD) =>
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: SAND, width: 0.75 }, objectName: name,
      shadow: { type: "outer", color: "000000", blur: 10, offset: 2, angle: 90, opacity: 0.07 } });
  const band = (s, text, { x, y, w, h, fill, pad = 0.2, name, ...o }) => {
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { type: "none" }, objectName: name + " band" });
    T(s, text, { x: x + pad, y, w: w - 2 * pad, h, valign: "middle", objectName: name, ...o });
  };
  const marker = (s, n, cx, cy, d = 0.32) =>
    s.addText(n, { shape: pres.shapes.OVAL, x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: PAPER }, line: { color: INK, width: 1 },
      fontSize: 9, bold: true, color: INK, align: "center", valign: "middle", margin: 0, objectName: `Marker ${n}`,
      shadow: { type: "outer", color: "000000", blur: 4, offset: 1, angle: 90, opacity: 0.3 } });
  const content = (title, subtitle, eb, section) => {
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
    eyebrow(s, eb);
    s.addText(title, { placeholder: "title" });
    s.addText(subtitle, { placeholder: "subtitle" });
    return s;
  };

  // =====================================================================
  // 01 — PROJECT OVERVIEW
  // =====================================================================
  pres.addSection({ title: "Overview" });
  {
    const s = pres.addSlide({ masterName: "COVER", sectionTitle: "Overview" });
    s.addImage({ path: IMG("cover.jpg"), x: 8.9, y: 0, w: 4.433, h: 7.5, objectName: "Cover image (bloomholding.com)", altText: "Bloom residential towers, image from the Bloom Holding homepage" });
    s.addImage({ path: IMG("wordmark-red.png"), x: M, y: 0.55, w: 1.19, h: 0.37, objectName: "Bloom wordmark", altText: "Bloom wordmark" });
    T(s, "CORPORATE WEBSITE REDESIGN  ·  PRODUCT DISCOVERY", { x: M, y: 1.38, w: 7.7, h: 0.24, fontSize: 9.5, bold: true, color: OLIVE, charSpacing: 2, objectName: "Eyebrow" });
    s.addText([
      { text: "Bloom Holding", options: { breakLine: true } },
      { text: "Homepage Product Discovery", options: { fontSize: 30, color: OLIVE_D } },
    ], { placeholder: "title" });
    T(s, "Understanding the current experience, identifying user pain points and defining opportunities for a more intuitive digital homepage.",
      { x: M, y: 3.3, w: 7.2, h: 0.6, fontSize: 14, color: MUTE, objectName: "Subtitle" });

    const y = 4.2;
    label(s, "PROJECT CONTEXT", { x: M, y, w: 3.5 });
    T(s, [
      { text: "Bloom Holding is a diversified master developer with businesses across Real Estate, Education, Hospitality, Retail, Healthcare, Facilities Management and Landscaping.", options: { breakLine: true } },
      { text: "The current website needs to evolve into a connected digital ecosystem that communicates Bloom's proposition while serving the needs of its different audiences." },
    ], { x: M, y: y + 0.3, w: 3.5, h: 2.05, fontSize: 11.5, paraSpaceAfter: 6, objectName: "Project context" });

    label(s, "DISCOVERY OBJECTIVE", { x: 4.55, y, w: 3.8 });
    T(s, "Evaluate the current homepage experience and identify opportunities to:", { x: 4.55, y: y + 0.3, w: 3.8, h: 0.42, fontSize: 11.5, objectName: "Objective intro" });
    T(s, [
      "Communicate Bloom's brand proposition more clearly.",
      "Improve discoverability of key user journeys.",
      "Connect Bloom's business ecosystem.",
      "Make property and community discovery more accessible.",
      "Improve access to relevant customer services.",
    ].map((t, i, a) => ({ text: t, options: { bullet: { type: "number" }, breakLine: i < a.length - 1 } })),
      { x: 4.55, y: y + 0.76, w: 3.8, h: 1.6, fontSize: 11.5, paraSpaceAfter: 3, objectName: "Objectives" });

    band(s, [
      { text: "SCOPE   ", options: { bold: true, color: OLIVE, fontSize: 9, charSpacing: 1.5 } },
      { text: "Homepage discovery and UX assessment only." },
    ], { x: M, y: 6.56, w: 4.1, h: 0.4, fill: SAND, pad: 0.16, name: "Scope", fontSize: 11.5 });
    T(s, "Source: Bloom Holding Website RFP, pp. 1, 4–6", { x: 4.95, y: 6.64, w: 3.4, h: 0.24, fontSize: 9, color: MUTE, align: "right", valign: "middle", objectName: "Source" });
    s.addNotes("Source: Website RFP pp. 1, 4–6. Bloom is a master developer with a diversified portfolio (p.1). The RFP asks for a connected digital ecosystem expressing 'Curated Community Living' across seven business priorities (p.1) and a homepage that acts as the gateway to the Bloom ecosystem (p.5). This deck covers homepage discovery only: it is not a redesign proposal. Cover image and wordmark are Bloom's own, taken from bloomholding.com.");
  }

  // =====================================================================
  // 02 — EXISTING HOMEPAGE AUDIT
  // =====================================================================
  pres.addSection({ title: "Current experience" });
  {
    const s = content("Understanding the Current Experience",
      "An initial review of how the existing homepage communicates Bloom's brand, services and user journeys.",
      "02  ·  EXISTING HOMEPAGE AUDIT", "Current experience");
    const x0 = M, y0 = 2.0, hw = 5.5, hh = hw * 10 / 16;
    const frame = { color: SAND, width: 0.75 };
    s.addImage({ path: IMG("hero.jpg"), x: x0, y: y0, w: hw, h: hh, objectName: "Screenshot — homepage first view", altText: "Live screenshot of the bloomholding.com homepage first view" });
    s.addShape(pres.shapes.RECTANGLE, { x: x0, y: y0, w: hw, h: hh, fill: { type: "none" }, line: frame, objectName: "Screenshot frame" });
    const tw = 1.7, th = tw * 10 / 16, ty = y0 + hh + 0.2, tg = (hw - 3 * tw) / 2;
    [["ccl.jpg", "Screenshot — Curated Community Living section"], ["verticals.jpg", "Screenshot — business tiles"], ["footer.jpg", "Screenshot — footer"]].forEach(([f, n], i) => {
      const x = x0 + i * (tw + tg);
      s.addImage({ path: IMG(f), x, y: ty, w: tw, h: th, objectName: n, altText: n });
      s.addShape(pres.shapes.RECTANGLE, { x, y: ty, w: tw, h: th, fill: { type: "none" }, line: frame, objectName: n + " frame" });
    });
    // markers (numbers match the audit dimensions on the right)
    marker(s, "03", x0 + hw * 0.655, y0 + hh * 0.085);
    marker(s, "02", x0 + hw * 0.075, y0 + hh * 0.48);
    marker(s, "04", x0 + hw * 0.5, y0 + hh * 0.875);
    marker(s, "01", x0 + 0.24, ty + 0.24);
    marker(s, "05", x0 + tw + tg + 0.24, ty + 0.24);
    marker(s, "06", x0 + 2 * (tw + tg) + 0.24, ty + 0.24);

    const px = 6.6, pw = W - M - px;
    label(s, "SIX AUDIT DIMENSIONS  ·  PRELIMINARY OBSERVATIONS FROM THE LIVE HOMEPAGE", { x: px, y: y0, w: pw });
    const rows = [
      ["First Impression & Brand Proposition", "The first view shows the Bloom wordmark only. “Curated Community Living” appears on scroll as a heading without explanation; the master developer statement sits further down."],
      ["Hero Section & Primary CTA", "One primary action, Search Properties, with Make Enquiry in the header. No visible entry point for residents, investors or corporate visitors."],
      ["Navigation & Information Hierarchy", "Who We Are, What We Do, Properties, Media Centre, Careers. Labels follow Bloom's company structure more than visitor intent."],
      ["Property & Community Discovery", "Search filters by property, type and bedrooms, with no Buy or Rent choice. Sales and Leasing are separate menu items; communities are listed by name."],
      ["Business Ecosystem", "Five businesses appear as numbered tiles. Retail and Healthcare are not shown, and the link between the businesses and community living is not explained."],
      ["Customer Services", "No resident or customer entry point in the header. The Bloom apps sit under “E-Services” in the footer."],
    ];
    const ry = y0 + 0.34, rh = 0.66;
    rows.forEach(([t, d], i) => {
      const y = ry + i * rh;
      if (i) s.addShape(pres.shapes.LINE, { x: px, y: y - 0.05, w: pw, h: 0, line: { color: SAND, width: 0.75 }, objectName: `Divider ${i}` });
      marker(s, "0" + (i + 1), px + 0.16, y + 0.22);
      T(s, t, { x: px + 0.5, y: y, w: pw - 0.5, h: 0.22, fontSize: 12.5, bold: true, objectName: `Dimension 0${i + 1} title` });
      T(s, d, { x: px + 0.5, y: y + 0.23, w: pw - 0.5, h: 0.36, fontSize: 10.5, color: MUTE, objectName: `Dimension 0${i + 1} observation` });
    });
    band(s, [
      { text: "Key observation   ", options: { bold: true, color: OLIVE_D } },
      { text: "The current experience is primarily organization-led, while Bloom's ambition is to make it more user-led." },
    ], { x: px, y: 6.32, w: pw, h: 0.54, fill: SAND, pad: 0.18, name: "Key observation", fontSize: 11.5 });
    source(s, "RFP pp. 2–4  ·  Live capture of bloomholding.com, desktop 1440px, 12 Nov 2026 (hero video not loaded)");
    s.addNotes(`Sources: Website RFP pp. 2–4 and a preliminary audit of the live homepage (bloomholding.com, captured 12 Nov 2026, desktop 1440px). Screenshots are genuine captures. The hero background video did not load in the capture environment, so the first view shows the wordmark on black; re-capture in a normal browser before client use.

Audit questions per dimension:
01 First Impression & Brand Proposition — Does the homepage immediately communicate who Bloom Holding is? Is its master developer positioning clear? Is Curated Community Living meaningfully explained?
02 Hero Section & Primary CTA — Does the hero serve different audience needs? Are key user actions immediately visible? Does the primary CTA reflect the breadth of Bloom's offering?
03 Navigation & Information Hierarchy — Can users easily identify where to go? Are important journeys easily discoverable? Is navigation based on user intent or business structure?
04 Property & Community Discovery — How easily can users find a home? Are Buy and Rent pathways visible? Can users explore communities without unnecessary navigation?
05 Business Ecosystem — Are Bloom's business verticals clearly represented? Is the relationship between businesses and community living explained?
06 Customer Services — Can existing customers and residents easily identify their relevant service entry points?

Observations are preliminary and desktop-only; mobile, Arabic and analytics review are still to come.`);
  }

  // =====================================================================
  // 03 — AUDIENCE & USER INTENT
  // =====================================================================
  {
    const s = content("One Homepage. Multiple User Intentions",
      "The homepage needs to accommodate different audiences without requiring them to understand Bloom's organizational structure.",
      "03  ·  AUDIENCE & USER INTENT", "Current experience");
    const aud = [
      ["LuKeyRound", "Buyers & Renters", ["Find available properties.", "Explore residential communities.", "Understand property details.", "Submit an enquiry."], "Find a suitable home."],
      ["LuHeadset", "Existing Residents & Customers", ["Access customer services.", "Find relevant support.", "Access community-related services."], "Get assistance and access services."],
      ["LuTrendingUp", "Investors & Business Partners", ["Understand Bloom's business portfolio.", "Explore its scale and capabilities.", "Evaluate its credibility and track record."], "Understand Bloom's business and opportunities."],
      ["LuLandmark", "Corporate Visitors & Stakeholders", ["Understand Bloom's identity.", "Explore its business verticals.", "Discover leadership, news and company information."], "Learn about Bloom Holding."],
    ];
    const g = 0.22, cw = (CW - 3 * g) / 4, y0 = 2.1, ch = 3.8, p = 0.26;
    for (let i = 0; i < aud.length; i++) {
      const [ic, name, needs, intent] = aud[i];
      const x = M + i * (cw + g), n = "0" + (i + 1);
      card(s, x, y0, cw, ch, `Audience ${n} card`);
      s.addShape(pres.shapes.OVAL, { x: x + p, y: y0 + p, w: 0.56, h: 0.56, fill: { color: SAND }, line: { type: "none" }, objectName: `Audience ${n} icon circle` });
      s.addImage({ data: await icon(ic, THEME.colors.dk2), x: x + p + 0.14, y: y0 + p + 0.14, w: 0.28, h: 0.28, objectName: `Audience ${n} icon` });
      label(s, `AUDIENCE ${n}`, { x: x + p + 0.72, y: y0 + p, w: cw - 2 * p - 0.72, h: 0.56, valign: "middle" });
      T(s, name, { x: x + p, y: y0 + 0.96, w: cw - 2 * p, h: 0.58, fontSize: 16, fontFace: HEAD, valign: "top", objectName: `Audience ${n} name` });
      T(s, "What they need", { x: x + p, y: y0 + 1.58, w: cw - 2 * p, h: 0.2, fontSize: 10, color: MUTE, objectName: `Audience ${n} needs label` });
      T(s, needs.map((t, k) => ({ text: t, options: { bullet: { indent: 10 }, breakLine: k < needs.length - 1 } })),
        { x: x + p, y: y0 + 1.8, w: cw - 2 * p, h: 1.05, fontSize: 11, paraSpaceAfter: 2, objectName: `Audience ${n} needs` });
      s.addShape(pres.shapes.RECTANGLE, { x, y: y0 + ch - 0.84, w: cw, h: 0.84, fill: { color: SAND }, line: { type: "none" }, objectName: `Audience ${n} intention band` });
      label(s, "PRIMARY INTENTION", { x: x + p, y: y0 + ch - 0.74, w: cw - 2 * p, h: 0.2, fontSize: 8.5 });
      T(s, intent, { x: x + p, y: y0 + ch - 0.52, w: cw - 2 * p, h: 0.42, fontSize: 12, bold: true, color: OLIVE_D, objectName: `Audience ${n} intention` });
    }
    const by = 6.13;
    s.addText([
      { text: "Key insight   ", options: { bold: true, color: OLIVE_D } },
      { text: "Different audiences arrive with different expectations. The homepage should provide clear entry points based on what visitors want to accomplish." },
    ], { isTextBox: true, x: M, y: by, w: 4.35, h: 0.72, fontSize: 11, color: INK, margin: 0, valign: "middle", objectName: "Key insight" });
    const dx = 5.25, dg = 0.14, dw = (W - M - dx - 3 * dg) / 4;
    label(s, "FOUR PRIMARY HOMEPAGE DESTINATIONS", { x: dx, y: by, w: 6 });
    ["Find a Home", "Explore Communities", "Customer Services", "About Bloom"].forEach((d, i) =>
      s.addText(d, { shape: pres.shapes.RECTANGLE, x: dx + i * (dw + dg), y: by + 0.28, w: dw, h: 0.44, fill: { color: OLIVE_D }, line: { type: "none" },
        fontSize: 12, bold: true, color: PAPER, align: "center", valign: "middle", margin: 0, objectName: `Destination — ${d}` }));
    source(s, "RFP pp. 2, 5–6  ·  Audience needs are working assumptions to validate in research");
    s.addNotes("Sources: Website RFP pp. 2, 5–6. The RFP names the audiences (buyers, investors, brokers, residents, partners, corporate stakeholders, media, employees; pp. 2, 5, 6) and the four priority journeys: Find a Home, Explore Communities, Customer Services and About Bloom (p. 5). The four groupings and the needs listed are our working assumptions for discovery; they have not yet been validated with users. Personas are an RFP discovery deliverable (p. 6).");
  }

  // =====================================================================
  // 04 — KEY PAIN POINTS
  // =====================================================================
  pres.addSection({ title: "Pain points & disparities" });
  {
    const s = content("Where Does the Current Experience Fall Short?",
      "The initial discovery highlights gaps in brand communication, navigation, discoverability and audience relevance.",
      "04  ·  KEY PAIN POINTS", "Pain points & disparities");
    // legend
    const lx = 9.63, ly = 0.49;
    [[RED, "High priority", 0], [OCHRE, "Medium priority", 1.12]].forEach(([c, t, dx]) => {
      s.addShape(pres.shapes.OVAL, { x: lx + dx, y: ly + 0.07, w: 0.12, h: 0.12, fill: { color: c }, line: { type: "none" }, objectName: `Legend dot — ${t}` });
      T(s, t, { x: lx + dx + 0.18, y: ly, w: 1.05, h: 0.26, fontSize: 10, color: MUTE, valign: "middle", objectName: `Legend — ${t}` });
    });
    T(s, "(preliminary)", { x: lx + 2.3, y: ly, w: 0.8, h: 0.26, fontSize: 10, color: MUTE, italic: true, align: "right", valign: "middle", objectName: "Legend note" });

    const pp = [
      ["Unclear Brand Positioning", "The homepage does not immediately communicate Bloom's complete identity, scale and differentiated value proposition.", "First-time visitors may not fully understand what Bloom offers beyond its property developments.", 1],
      ["Limited Visibility of User Journeys", "The experience does not give sufficient prominence to the key actions visitors want to accomplish.", "Buyers, renters and residents may need to explore navigation before reaching their intended destination.", 1],
      ["Fragmented Property Discovery", "Sales and leasing journeys are not sufficiently unified into an intuitive discovery experience.", "Finding the right property can involve unnecessary navigation and disconnected journeys.", 1],
      ["Disconnected Ecosystem Storytelling", "Bloom's business verticals are not sufficiently connected through one consistent expression of Curated Community Living.", "Visitors may not understand how Bloom's businesses collectively contribute to its communities.", 0],
      ["Limited Community Discovery", "Community storytelling and active property opportunities are not sufficiently connected.", "Users may struggle to move naturally from exploring a community to finding relevant properties.", 0],
      ["Customer Service Discoverability", "The homepage needs stronger pathways for existing residents and customers to access relevant services.", "Important post-purchase and resident service journeys may be less accessible.", 0],
    ];
    const g = 0.2, cw = (CW - g) / 2, y0 = 2.1, ch = 1.46, vg = 0.13;
    pp.forEach(([t, prob, imp, high], i) => {
      const x = M + (i % 2) * (cw + g), y = y0 + Math.floor(i / 2) * (ch + vg), n = "0" + (i + 1), tx = x + 0.95, tw = cw - 0.95 - 0.28;
      card(s, x, y, cw, ch, `Pain point ${n} card`);
      T(s, n, { x: x + 0.28, y: y + 0.17, w: 0.6, h: 0.42, fontSize: 24, fontFace: HEAD, color: OLIVE, objectName: `Pain point ${n} number` });
      T(s, t, { x: tx, y: y + 0.2, w: tw - 1.2, h: 0.28, fontSize: 14.5, bold: true, valign: "middle", objectName: `Pain point ${n} title` });
      s.addShape(pres.shapes.OVAL, { x: x + cw - 1.33, y: y + 0.28, w: 0.12, h: 0.12, fill: { color: high ? RED : OCHRE }, line: { type: "none" }, objectName: `Pain point ${n} priority dot` });
      T(s, high ? "High priority" : "Medium priority", { x: x + cw - 1.15, y: y + 0.2, w: 0.9, h: 0.28, fontSize: 9, bold: true, color: MUTE, valign: "middle", objectName: `Pain point ${n} priority` });
      T(s, prob, { x: tx, y: y + 0.56, w: tw, h: 0.4, fontSize: 11.5, objectName: `Pain point ${n} problem` });
      T(s, [{ text: "User impact  ", options: { bold: true, color: OLIVE_D } }, { text: imp }],
        { x: tx, y: y + 1.0, w: tw, h: 0.38, fontSize: 10.5, color: MUTE, objectName: `Pain point ${n} impact` });
    });
    source(s, "Problems: RFP pp. 2–4  ·  User impacts are hypotheses to validate");
    s.addNotes("Sources: Website RFP pp. 2–4. Each problem statement traces to an RFP-stated challenge: 01 Brand & Proposition (p.2 A); 02 Information Architecture & User Journey (p.2 B); 03 fragmented sales and leasing journeys (p.3 B/C); 04 ecosystem not connected into one brand story (p.2 A); 05 community storytelling and active inventory need to work together (p.3 C); 06 customer services need to be better connected and prioritised (p.2, p.6). The preliminary live-site audit (slide 2) is consistent with these. 'User impact' lines are hypotheses, not validated user feedback. Priority indicators are a preliminary view for discussion, to be confirmed with stakeholders, research and analytics.");
  }

  // =====================================================================
  // 05 — CURRENT VS DESIRED
  // =====================================================================
  {
    const s = content("From Organization-Led to User-Led",
      "The opportunity is to transform the homepage from a corporate introduction into a connected gateway to Bloom's ecosystem.",
      "05  ·  CURRENT EXPERIENCE VS DESIRED EXPERIENCE", "Pain points & disparities");
    const y0 = 2.1, hh = 0.68, rh = 0.545, lw = 2.25, g = 0.14, colw = (CW - lw - g) / 2;
    const xc = M + lw, xd = xc + colw + g, th = hh + 6 * rh, pad = 0.26;
    s.addShape(pres.shapes.RECTANGLE, { x: xc, y: y0, w: colw, h: th, fill: { color: SAND }, line: { type: "none" }, objectName: "Current column" });
    s.addShape(pres.shapes.RECTANGLE, { x: xd, y: y0, w: colw, h: th, fill: { color: OLIVE_D }, line: { type: "none" }, objectName: "Desired column" });
    label(s, "CURRENT EXPERIENCE", { x: xc + pad, y: y0 + 0.14, w: colw - 2 * pad, color: MUTE });
    T(s, "Organization-led", { x: xc + pad, y: y0 + 0.34, w: colw - 2 * pad, h: 0.3, fontSize: 16, fontFace: HEAD, objectName: "Current heading" });
    label(s, "DESIRED EXPERIENCE", { x: xd + pad, y: y0 + 0.14, w: colw - 2 * pad, color: C.accent2 });
    T(s, "User-led", { x: xd + pad, y: y0 + 0.34, w: colw - 2 * pad, h: 0.3, fontSize: 16, fontFace: HEAD, color: PAPER, objectName: "Desired heading" });
    const rows = [
      ["Brand Communication", ["Broad corporate messaging.", "Limited immediate differentiation."], ["Clear positioning.", "Evidence-led Curated Community Living proposition."]],
      ["Navigation", ["Primarily organization-led.", "Users need to understand business categories."], ["User-intent-led structure.", "Clear and accessible navigation."]],
      ["User Journeys", ["Important actions are not sufficiently prominent.", "Different journeys require navigation exploration."], ["Prominent entry points for priority audiences."]],
      ["Property Discovery", ["Sales and leasing journeys lack a unified experience."], ["Unified Find a Home experience with clear Buy and Rent pathways."]],
      ["Business Ecosystem", ["Business verticals are presented as separate organizational categories."], ["Connected expression of Bloom's businesses and capabilities."]],
      ["Customer Services", ["Customer-facing pathways need greater homepage prominence."], ["Easy access to relevant customer and resident services."]],
    ];
    const bl = (items) => items.map((t, k) => ({ text: t, options: { bullet: { indent: 10 }, breakLine: k < items.length - 1 } }));
    rows.forEach(([l, cur, des], i) => {
      const y = y0 + hh + i * rh;
      s.addShape(pres.shapes.LINE, { x: M, y, w: lw - 0.1, h: 0, line: { color: SAND, width: 0.75 }, objectName: `Row ${i + 1} rule` });
      s.addShape(pres.shapes.LINE, { x: xc + pad, y, w: colw - 2 * pad, h: 0, line: { color: C.accent2, width: 0.5 }, objectName: `Row ${i + 1} rule (current)` });
      s.addShape(pres.shapes.LINE, { x: xd + pad, y, w: colw - 2 * pad, h: 0, line: { color: OLIVE, width: 0.5 }, objectName: `Row ${i + 1} rule (desired)` });
      T(s, l, { x: M, y, w: lw - 0.1, h: rh, fontSize: 12.5, bold: true, valign: "middle", objectName: `Row ${i + 1} label` });
      T(s, bl(cur), { x: xc + pad, y, w: colw - 2 * pad, h: rh, fontSize: 11.5, valign: "middle", objectName: `Row ${i + 1} current` });
      T(s, bl(des), { x: xd + pad, y, w: colw - 2 * pad, h: rh, fontSize: 11.5, color: PAPER, valign: "middle", objectName: `Row ${i + 1} desired` });
    });
    const ky = y0 + th + 0.2;
    label(s, "KEY TAKEAWAY", { x: M, y: ky, w: lw - 0.1, h: 0.56, valign: "middle" });
    T(s, "The homepage should not simply introduce Bloom Holding. It should help every visitor understand Bloom and identify their next meaningful action.",
      { x: xc, y: ky, w: CW - lw, h: 0.56, fontSize: 14, fontFace: HEAD, italic: true, valign: "middle", objectName: "Key takeaway" });
    source(s, "Current: RFP pp. 2–4 and preliminary audit  ·  Desired: RFP ambition, pp. 4–6");
    s.addNotes("Sources: Website RFP pp. 4–6. 'Current' summarises RFP-stated challenges (pp. 2–4) and the preliminary live-site audit. 'Desired' reflects the RFP ambition: evolve from an organization-led corporate platform into a user-led digital ecosystem (p.4); restructure around user intent with Find a Home, Explore Communities, Customer Services and About Bloom (p.5); make the homepage the gateway to the Bloom ecosystem (p.5); unified property discovery with clear Buy and Rent pathways (p.5); improve customer access to services (p.6). This is a direction of travel, not a layout proposal.");
  }

  // =====================================================================
  // 06 — OPPORTUNITIES & NEXT STEPS
  // =====================================================================
  pres.addSection({ title: "Opportunities & next steps" });
  {
    const s = content("Where Should We Focus Next?",
      "The discovery findings point towards five key areas of homepage experience improvement.",
      "06  ·  KEY UX OPPORTUNITIES & NEXT STEPS", "Opportunities & next steps");
    const opp = [
      ["Stronger Brand Introduction", "Establish Bloom's identity, scale and unique proposition immediately."],
      ["Intent-Led Homepage Navigation", "Make important destinations accessible according to visitor needs."],
      ["Prominent Property & Community Discovery", "Create clearer entry points to finding homes and exploring communities."],
      ["Connected Ecosystem Storytelling", "Demonstrate how Bloom's business verticals collectively support its community living proposition."],
      ["Improved Customer Access & Engagement", "Make customer services, enquiries and important next steps easier to identify."],
    ];
    const g = 0.18, cw = (CW - 4 * g) / 5, y0 = 2.1, ch = 2.0, p = 0.22;
    opp.forEach(([t, d], i) => {
      const x = M + i * (cw + g), n = "0" + (i + 1);
      card(s, x, y0, cw, ch, `Opportunity ${n} card`);
      T(s, n, { x: x + p, y: y0 + 0.16, w: 0.8, h: 0.4, fontSize: 22, fontFace: HEAD, color: OLIVE, objectName: `Opportunity ${n} number` });
      T(s, t, { x: x + p, y: y0 + 0.62, w: cw - 2 * p, h: 0.46, fontSize: 13, bold: true, objectName: `Opportunity ${n} title` });
      T(s, d, { x: x + p, y: y0 + 1.13, w: cw - 2 * p, h: 0.78, fontSize: 11, color: MUTE, objectName: `Opportunity ${n} description` });
    });
    const ny = 4.4;
    label(s, "NEXT STEPS", { x: M, y: ny, w: 3 });
    const steps = [
      "Complete the detailed section-by-section homepage UX audit.",
      "Validate pain points through stakeholder feedback, user research and analytics.",
      "Prioritize audience needs and primary homepage journeys.",
      "Define homepage information hierarchy and experience strategy.",
      "Move into homepage wireframing and interaction design.",
    ];
    const d = 0.32, cy = ny + 0.5;
    s.addShape(pres.shapes.LINE, { x: M + d / 2, y: cy, w: 4 * (cw + g), h: 0, line: { color: C.accent2, width: 1.25 }, objectName: "Timeline" });
    steps.forEach((t, i) => {
      const x = M + i * (cw + g);
      s.addText(String(i + 1), { shape: pres.shapes.OVAL, x, y: cy - d / 2, w: d, h: d, fill: { color: OLIVE_D }, line: { color: PAPER, width: 2 },
        fontSize: 10, bold: true, color: PAPER, align: "center", valign: "middle", margin: 0, objectName: `Step ${i + 1} node` });
      T(s, t, { x, y: cy + 0.28, w: cw - 0.15, h: 0.6, fontSize: 11, objectName: `Step ${i + 1}` });
    });
    band(s, "A more intuitive homepage should connect Bloom's brand, communities, properties and services through one clear and meaningful user experience.",
      { x: M, y: 5.98, w: CW, h: 0.8, fill: OLIVE_D, pad: 0.3, name: "Closing statement", fontSize: 14, fontFace: HEAD, italic: true, color: PAPER });
    source(s, "RFP pp. 5–6  ·  Opportunity areas for exploration, not design solutions");
    s.addNotes("Sources: Website RFP pp. 5–6. The five opportunity areas map to the RFP ambition: differentiate the master brand through evidence; restructure around user intent; make the homepage the gateway to the Bloom ecosystem; unify property discovery; improve customer access to services. They are areas to explore, not UI solutions. Next steps follow the RFP discovery, IA and UX phases (pp. 6–8): complete the audit, validate with stakeholders, research and analytics, prioritise audiences and journeys, define hierarchy and strategy, then move to wireframes.");
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
