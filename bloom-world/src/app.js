(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  // ?still freezes the ambient scene (traffic, boats, autoplay) for screenshots and motion capture
  const still = new URLSearchParams(location.search).has("still");
  // motion is on unless the visitor asked for less of it (or a capture froze the page)
  const motion = document.documentElement.classList.contains("anim");

  /* ------------------------------------------------------------ smooth, weighted scrolling (fine pointers only) */
  const smooth = (() => {
    if (!motion || !window.matchMedia("(pointer: fine)").matches) return null;
    document.documentElement.classList.add("smooth");
    let target = window.scrollY, current = window.scrollY, running = false;
    const max = () => document.documentElement.scrollHeight - window.innerHeight;
    function tick() {
      current += (target - current) * 0.16;
      if (Math.abs(target - current) < 0.4) { current = target; running = false; }
      window.scrollTo(0, current);
      if (running) requestAnimationFrame(tick);
    }
    function start() { if (!running) { running = true; current = window.scrollY; requestAnimationFrame(tick); } }
    window.addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.defaultPrevented || document.querySelector("dialog[open]")) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.target.closest && e.target.closest("textarea, select, .plan-pan, .clock-track")) return;
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      target = Math.max(0, Math.min(max(), (running ? target : window.scrollY) + d));
      start();
    }, { passive: false });
    window.addEventListener("scroll", () => { if (!running) { target = current = window.scrollY; } }, { passive: true });
    return { to(y) { target = Math.max(0, Math.min(max(), y)); start(); } };
  })();
  function scrollToEl(el) {
    const y = el.id === "top" ? 0 : el.getBoundingClientRect().top + window.scrollY - 84;
    if (smooth) smooth.to(y); else window.scrollTo({ top: y, behavior: reduced.matches ? "auto" : "smooth" });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || a.classList.contains("skip")) return;
    const id = a.getAttribute("href").slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
    try { history.replaceState(null, "", "#" + id); } catch (err) { /* the viewer may refuse; scrolling still works */ }
  });
  if (still) window.addEventListener("load", () => document.querySelectorAll("svg").forEach((v) => v.pauseAnimations && v.pauseAnimations()));
  const SVGNS = "http://www.w3.org/2000/svg";

  /* ------------------------------------------------------------ data */
  const BIZ = {
    re: { name: "Real Estate", op: "Bloom Properties", hour: "07:00", moment: "Morning, at home", zc: "var(--re)",
      text: "The day starts in a Bloom home: an apartment, townhouse or villa in a community planned around everyday life.",
      stat: "6,500+ residential units delivered", links: ["fm", "land", "edu"], url: "https://bloomholding.com/what-we-do/properties", visit: "Visit Bloom Properties",
      at: [675, 725] },
    edu: { name: "Education", op: "Bloom Education", hour: "07:45", moment: "The school run", zc: "var(--edu)",
      text: "Schools anchor Bloom's communities, from Brighton College to Bloom World Academy, so learning stays close to home.",
      stat: "15 schools serving more than 20,000 students", links: ["re", "land", "health"], url: "https://www.bloomeducation.com/", visit: "Visit Bloom Education",
      at: [675, 337] },
    fm: { name: "Facilities Management", op: "Bloom Facilities Management", hour: "10:00", moment: "Everything working", zc: "var(--fm)",
      text: "Behind the scenes, community and facilities management keeps homes, buildings and shared spaces running day to day.",
      stat: "8,500+ units managed", links: ["re", "hosp", "retail"], url: "https://bfm.ae/", visit: "Visit Bloom Facilities Management",
      at: [1456, 725] },
    retail: { name: "Retail", op: "Part of Bloom Holding", hour: "13:00", moment: "Lunch around the corner", zc: "var(--retail)",
      text: "Shops, cafés and everyday conveniences bring a community's streets to life, a short walk from home.",
      stat: "", links: ["re", "hosp", "fm"], url: "", visit: "Retail website to come",
      at: [1050, 206] },
    health: { name: "Healthcare", op: "Part of Bloom Holding", hour: "16:00", moment: "Care, close by", zc: "var(--health)",
      text: "Care and wellbeing, close to where people live, as part of the same connected community.",
      stat: "", links: ["re", "edu", "land"], url: "", visit: "Healthcare website to come",
      at: [928, 368] },
    land: { name: "Landscaping", op: "Bloom Landscape", hour: "18:30", moment: "An evening walk", zc: "var(--land)",
      text: "The parks, streets and gardens between the buildings are designed, built and cared for by Bloom Landscape.",
      stat: "", links: ["re", "edu", "hosp"], url: "https://bloomholding.com/what-we-do/bloomscape", visit: "Visit Bloom Landscape",
      at: [1050, 725] },
    hosp: { name: "Hospitality", op: "Bloom Hospitality", hour: "20:00", moment: "Guests in town", zc: "var(--hosp)",
      text: "When family visits, there is a place for them too: Marriott Downtown, The Abu Dhabi EDITION and Bloom Arjaan by Rotana.",
      stat: "851 hotel rooms and serviced apartments", links: ["retail", "land", "fm"], url: "https://bloomholding.com/what-we-do/hospitality", visit: "Visit Bloom Hospitality",
      at: [1155, 368] },
  };
  const DAY = ["re", "edu", "fm", "retail", "health", "land", "hosp", "all"];
  // sun angle per step: shadow offset and a multiply tint for the light of that hour
  const LIGHT = {
    re: { dx: -8, dy: 5, tint: "#fff3e4", night: 0 },
    edu: { dx: -7, dy: 6, tint: "#fff8ee", night: 0 },
    fm: { dx: -4, dy: 7, tint: "transparent", night: 0 },
    retail: { dx: 0, dy: 6, tint: "transparent", night: 0 },
    health: { dx: 5, dy: 6, tint: "#fff6ea", night: 0 },
    land: { dx: 9, dy: 5, tint: "#ffd8bf", night: 0 },
    hosp: { dx: 0, dy: 0, tint: "#7f8cc9", night: 1 },
    all: { dx: 0, dy: 0, tint: "#6f7dbf", night: 1 },
  };

  const COMMUNITIES = [
    { name: "Zayed City", where: "Khalifa City C, Abu Dhabi", line: "A new community living experience, and home to Bloom Living.", devs: "Bloom Living", img: "assets/img/community-zayed-city.webp", alt: "Waterfront plaza framed by mid-rise buildings at Bloom Living, Zayed City (architectural render)", key: "zayed" },
    { name: "Saadiyat Island", where: "Abu Dhabi", line: "Where nature meets culture, minutes from downtown.", devs: "Park View, Soho Square", img: "assets/img/community-saadiyat.webp", alt: "Apartment buildings behind a landscaped podium on Saadiyat Island", key: "saadiyat" },
    { name: "Al Bateen Marina", where: "Abu Dhabi", line: "A waterfront escape from the city buzz.", devs: "Bloom Marina", img: "assets/img/community-al-bateen.webp", alt: "Aerial view of the marina and waterfront buildings at Al Bateen", key: "bateen" },
    { name: "Jumeirah Village Circle", where: "Dubai", line: "A dynamic lifestyle in the heart of JVC.", devs: "Bloom Towers, Bloom Heights", img: "assets/img/community-jvc.webp", alt: "Two residential towers seen through palm fronds in Jumeirah Village Circle", key: "jvc" },
    { name: "Eastern Mangrove Corniche", where: "Abu Dhabi", line: "A coveted address beside the mangroves.", devs: "Bloom Gardens, Faya, Aldhay", img: "assets/img/community-eastern-mangrove.webp", alt: "Mediterranean-style villa with arches and bougainvillea at Bloom Gardens", key: "mangrove" },
  ];
  const COMMUNITY_NAME = Object.fromEntries(COMMUNITIES.map((c) => [c.key, c.name]));

  // sample screens for each app: demonstration data, labelled as such on the page
  const APPS = [
    { name: "Bloom Community App", ac: "var(--red)", icon: "i-home", hello: "Good morning", sub: "Your home in a Bloom community",
      card: { k: "Service request", v: "AC check booked", s: "Technician visit tomorrow, 10:00", p: 0 },
      tiles: [["i-tool", "Service requests"], ["i-calendar", "Amenity bookings"], ["i-box", "Moving in and out"], ["i-refresh", "Tenancy renewals"]],
      feats: [["i-tool", "Service requests"], ["i-calendar", "Amenity bookings"], ["i-box", "Moving in and out"], ["i-refresh", "Tenancy renewals"], ["i-card", "Service charges"]] },
    { name: "Bloom Super App", ac: "#b86f12", icon: "i-key", hello: "Your property", sub: "Everything about the homes you own",
      card: { k: "Construction update", v: "Phase 2 progress", s: "Next site update this month", p: 68 },
      tiles: [["i-card", "Payments"], ["i-doc", "Property documents"], ["i-crane", "Construction updates"], ["i-calendar", "Handover dates"]],
      feats: [["i-card", "Payments"], ["i-doc", "Property documents"], ["i-crane", "Construction updates"]] },
    { name: "Bloom Partners App", ac: "#0e7c8c", icon: "i-handshake", hello: "Hello, partner", sub: "Your agency's Bloom workspace",
      card: { k: "Live inventory", v: "Units ready to sell", s: "Updated in real time", p: 0 },
      tiles: [["i-users", "Onboarding"], ["i-box", "Live inventory"], ["i-chart", "Leads"], ["i-coins", "Commission tracking"]],
      feats: [["i-users", "Onboarding"], ["i-box", "Live inventory"], ["i-chart", "Leads"], ["i-coins", "Commission tracking"]] },
  ];

  const STORY = [
    { y: 2008, t: "Bloom Gardens begins", d: "The first phase of Bloom Gardens launches: villas and townhouses inspired by the architecture of the Mediterranean.", img: "assets/img/story-2008.webp", alt: "Clipped hedges and flowering shrubs in front of villas" },
    { y: 2011, t: "Brighton College Al Ain", d: "Bloom Education launches Brighton College Al Ain, the second sister school of Brighton College UK in the UAE.", img: "assets/img/story-2011.webp", alt: "School pupils walking along a palm-shaded lane" },
    { y: 2012, t: "First homes handed over", d: "Phase One of Bloom Gardens is handed over to its owners.", img: "assets/img/story-2012.webp", alt: "Garden path between white villas and hedges" },
    { y: 2015, t: "Soho Square on Saadiyat", d: "Soho Square launches on Saadiyat Island: 304 homes, from studios to three-bedroom apartments, green houses and a sky villa.", img: "assets/img/community-saadiyat.webp", alt: "Apartment buildings behind a landscaped podium on Saadiyat Island" },
    { y: 2017, t: "Bloom Gardens grows", d: "Phase Three of Bloom Gardens is completed and handed over: 147 villas and townhouses.", img: "assets/img/dev-bloom-gardens.webp", alt: "Mediterranean-style villa with arches and bougainvillea at Bloom Gardens" },
    { y: 2018, t: "Schools open in Dubai", d: "Brighton College Dubai opens its doors, and Bloom Education opens Dwight School's first campus in the Middle East.", img: "assets/img/biz-education.webp", alt: "Two pupils in school gowns under a colonnade" },
    { y: 2022, t: "Bloom Living launches", d: "Cordoba, the first phase of Bloom Living in Zayed City, launches in March and sells out within four hours.", img: "assets/img/community-zayed-city.webp", alt: "Waterfront plaza at Bloom Living, Zayed City (architectural render)" },
    { y: 2024, t: "Three more phases", d: "Seville, Olvera and Almeria, the fifth to seventh phases of Bloom Living, launch with lakeside villas and townhouses.", img: "assets/img/story-2024.webp", alt: "Villas along a landscaped lake at Bloom Living (architectural render)" },
    { y: 2026, t: "Bloom Arjaan by Rotana opens", d: "The 217-key residential-style hotel opens on Saadiyat Island, adding to Bloom's hospitality portfolio.", img: "assets/img/biz-hospitality.webp", alt: "Hotel bedroom with a view over a marina" },
  ];

  /* ------------------------------------------------------------ toast */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.remove("is-in"); void toastEl.offsetWidth; toastEl.classList.add("is-in");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 4200);
  }

  /* ------------------------------------------------------------ header + mobile menu */
  const menuBtn = $(".menu-btn");
  const menu = $("#mobile-menu");
  menuBtn.addEventListener("click", () => {
    const open = menuBtn.getAttribute("aria-expanded") !== "true";
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menuBtn.querySelector("use").setAttribute("href", open ? "#i-close" : "#i-menu");
    menu.hidden = !open;
  });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) menuBtn.click(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { menuBtn.click(); menuBtn.focus(); } });

  const navLinks = $$(".nav a");
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + en.target.id)));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["find", "communities", "services", "story", "about"].forEach((id) => spy.observe(document.getElementById(id)));

  /* ------------------------------------------------------------ floating section dock */
  const dock = $("#dock");
  const dockBtn = $(".dock-current", dock);
  const dockMenu = $("#dock-menu");
  const dockLinks = $$("a", dockMenu);
  let dockSec = "top";
  function setDockSection(id) {
    if (id === dockSec) return;
    dockSec = id;
    const link = dockLinks.find((a) => a.dataset.sec === id);
    if (!link) return;
    const label = $(".dock-label", dock);
    label.textContent = link.textContent.trim();
    label.classList.remove("is-swap"); void label.offsetWidth; label.classList.add("is-swap");
    $(".dock-dot", dock).style.setProperty("--dc", link.style.getPropertyValue("--dc"));
    dockBtn.setAttribute("aria-label", `Sections: ${link.textContent.trim()}. Open the section list`);
    dockLinks.forEach((a) => a.setAttribute("aria-current", String(a === link)));
  }
  const dockSpy = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) setDockSection(en.target.id); }), { rootMargin: "-45% 0px -50% 0px" });
  dockLinks.forEach((a) => { const el = document.getElementById(a.dataset.sec); if (el) dockSpy.observe(el); });
  function setDockMenu(open) {
    dockMenu.hidden = !open;
    dockBtn.setAttribute("aria-expanded", String(open));
  }
  dockBtn.addEventListener("click", () => setDockMenu(dockMenu.hidden));
  dockLinks.forEach((a) => a.addEventListener("click", () => setDockMenu(false)));
  document.addEventListener("click", (e) => { if (!dockMenu.hidden && !dock.contains(e.target)) setDockMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !dockMenu.hidden) { setDockMenu(false); dockBtn.focus(); } });

  /* ------------------------------------------------------------ the living masterplan */
  const plan = $("#plan");
  const svg = $(".plan-svg");
  let conns = $(".conns", svg);
  const labels = Object.fromEntries($$(".plot-label", svg).map((l) => [l.dataset.biz, l]));
  // pill widths are measured from the font at build time (drawings.py), so nothing resizes in the browser
  const pan = $("#plan-pan");
  const tint = $(".tint", svg);
  const sun = $("#sun-shadow");
  const card = $("#plot-card");
  const plots = Object.fromEntries($$(".plot", svg).map((g) => [g.dataset.biz, g]));
  const track = $(".clock-track");
  const playBtn = $(".clock-play");
  let step = 0;
  let playing = !reduced.matches && !still;
  let inView = true;
  let timer;

  DAY.forEach((key, i) => {
    const b = BIZ[key];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hour";
    btn.setAttribute("role", "tab");
    btn.dataset.biz = key;
    btn.dataset.i = i;
    btn.setAttribute("aria-selected", "false");
    btn.innerHTML = key === "all"
      ? "<b>24/7</b><small>Together</small>"
      : `<b>${b.hour}</b><small>${b.name === "Facilities Management" ? "Facilities" : b.name}</small>`;
    btn.addEventListener("click", () => { stop(); if (step === i && !card.hidden) { closeCard(); return; } go(i, true); });
    track.appendChild(btn);
  });
  const hours = $$(".hour", track);
  track.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const rtl = document.dir === "rtl";
    let i = step;
    if (e.key === "Home") i = 0; else if (e.key === "End") i = DAY.length - 1;
    else i = (step + ((e.key === "ArrowRight") !== rtl ? 1 : -1) + DAY.length) % DAY.length;
    stop(); go(i, true); hours[i].focus();
  });

  function setLight(key) {
    const L = LIGHT[key];
    if (sun) { sun.setAttribute("dx", L.dx); sun.setAttribute("dy", L.dy); sun.setAttribute("flood-opacity", L.night ? "0.12" : "0.32"); }
    tint.style.fill = L.tint;
    plan.dataset.night = L.night;
  }

  function curve(a, b) {
    const [x1, y1] = a, [x2, y2] = b;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(140, len * 0.28);
    return `M${x1} ${y1} Q ${mx - (dy / len) * k} ${my + (dx / len) * k} ${x2} ${y2}`;
  }

  function clearLinks() {
    // the old line layer fades out as a whole while a fresh layer takes its place
    const old = conns;
    conns = old.cloneNode(false);
    old.after(conns);
    if (!old.childElementCount || reduced.matches) { old.remove(); return; }
    old.style.pointerEvents = "none";
    const fade = old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-out", fill: "forwards" });
    // removed when the fade itself finishes, so the fade is never cut short; the timer is only a safety net
    const drop = () => old.isConnected && old.remove();
    fade.finished.then(drop, drop);
    setTimeout(drop, 2000);
  }

  function drawLinks(key) {
    clearLinks();
    if (!key) return;
    const keys = key === "all" ? Object.keys(BIZ) : [key];
    const pairs = new Set();
    keys.forEach((k) => BIZ[k].links.forEach((l) => {
      const id = [k, l].sort().join("-");
      if (key === "all" && pairs.has(id)) return;
      pairs.add(id);
      const d = curve(BIZ[k].at, BIZ[l].at);
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", d); p.setAttribute("class", "conn");
      const f = document.createElementNS(SVGNS, "path");
      f.setAttribute("d", d); f.setAttribute("class", "conn-flow");
      conns.append(p, f);
      if (!reduced.matches) {
        const L = p.getTotalLength();
        p.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }],
          { duration: 700, easing: "cubic-bezier(0.16, 1, 0.3, 1)", delay: pairs.size * 70, fill: "backwards" });
        f.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 600 + pairs.size * 70, fill: "backwards" });
      }
      const [ex, ey] = BIZ[l].at;
      const end = document.createElementNS(SVGNS, "circle");
      end.setAttribute("cx", ex); end.setAttribute("cy", ey); end.setAttribute("r", 9); end.setAttribute("class", "conn-end");
      const ring = document.createElementNS(SVGNS, "circle");
      ring.setAttribute("cx", ex); ring.setAttribute("cy", ey); ring.setAttribute("r", 12); ring.setAttribute("class", "conn-ring");
      conns.append(ring, end);
      if (!reduced.matches) end.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: 420, delay: 520 + pairs.size * 70, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" });
    }));
    if (key !== "all") {
      const [sx, sy] = BIZ[key].at;
      const start = document.createElementNS(SVGNS, "circle");
      start.setAttribute("cx", sx); start.setAttribute("cy", sy); start.setAttribute("r", 13); start.setAttribute("class", "conn-end");
      conns.append(start);
      if (!reduced.matches) start.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: 380, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    }
  }

  function fillCard(key) {
    const isAll = key === "all";
    const b = isAll ? null : BIZ[key];
    $(".card-hour", card).textContent = isAll ? "24/7" : b.hour;
    $(".card-moment", card).textContent = isAll ? "All seven, together" : b.moment;
    $(".card-name", card).textContent = isAll ? "This is Bloom World" : b.name;
    card.style.setProperty("--zc", isAll ? "var(--red)" : b.zc);
    $(".card-operator", card).textContent = isAll ? "Seven businesses, one idea: Curated Community Living" : b.op;
    $(".card-text", card).textContent = isAll
      ? "Each business makes the others better: homes, schools, hotels, shops, care, facilities and landscapes, working as one."
      : b.text;
    $(".card-stat", card).textContent = isAll ? "" : b.stat;
    const chips = $(".card-chips", card);
    chips.replaceChildren();
    (isAll ? DAY.slice(0, 7) : b.links).forEach((l) => {
      const c = document.createElement("button");
      c.type = "button"; c.className = "chip-biz";
      c.style.setProperty("--zc", BIZ[l].zc);
      c.innerHTML = `<i></i>${BIZ[l].name}`;
      c.addEventListener("click", () => { stop(); go(DAY.indexOf(l), true); });
      chips.appendChild(c);
    });
    $(".card-links-label", card).textContent = isAll ? "Tap any business" : "Works with";
    const visit = $(".card-visit", card);
    if (isAll) {
      visit.textContent = "";
      visit.removeAttribute("href");
    } else if (b.url) {
      visit.href = b.url; visit.classList.remove("is-soon");
      visit.innerHTML = `${b.visit}<svg class="ic ic-sm"><use href="#i-out"/></svg><span class="sr"> (opens their website in a new tab)</span>`;
    } else {
      visit.removeAttribute("href"); visit.classList.add("is-soon"); visit.textContent = b.visit;
    }
  }

  const mobile = window.matchMedia("(max-width: 1200px)");
  // on desktop the business card sits in the intro column; on smaller screens it follows the plan
  const cardHome = $("#card-home");
  const cardAway = card.parentNode;
  const cardAfter = card.nextSibling;
  function homeCard() {
    if (!mobile.matches) { if (card.parentNode !== cardHome) cardHome.appendChild(card); }
    else if (card.parentNode !== cardAway) cardAway.insertBefore(card, cardAfter);
    card.classList.toggle("in-intro", !mobile.matches);
  }
  // desktop: fit the plotted area (x 576..1590) into the space beside the intro, so text never sits on a plot
  const PLOT_L = 560, PLOT_R = 1596, PLOT_T = 20, PLOT_B = 950;
  function fitPlan() {
    if (mobile.matches) {
      svg.setAttribute("viewBox", "540 30 1060 940");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      return;
    }
    const W = plan.clientWidth, H = plan.clientHeight;
    const ir = $(".hero-intro").getBoundingClientRect(), pr = plan.getBoundingClientRect();
    const rtl = document.dir === "rtl";
    const free = rtl ? ir.left - pr.left - 40 : pr.right - ir.right - 40;
    const s = Math.min(H / (PLOT_B - PLOT_T + 40), free / (PLOT_R - PLOT_L));
    const vbW = W / s, vbH = H / s;
    const vx = rtl ? PLOT_R - (ir.left - pr.left - 24) / s : PLOT_L - (ir.right - pr.left + 24) / s;
    const vy = (PLOT_T + PLOT_B) / 2 - vbH / 2 + 18 / s;
    svg.setAttribute("viewBox", `${vx.toFixed(1)} ${vy.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`);
    svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
  }
  homeCard();
  fitPlan();
  mobile.addEventListener("change", () => { homeCard(); fitPlan(); });
  window.addEventListener("resize", fitPlan);
  let autoPan = false;
  pan.addEventListener("scroll", () => { if (!autoPan) plan.classList.add("is-panned"); }, { passive: true });
  let docked = true;
  function placeCard(key) {
    if (mobile.matches || card.classList.contains("in-intro")) { card.style.left = ""; card.style.top = ""; return; }
    const pr = plan.getBoundingClientRect();
    const target = key === "all" ? null : plots[key].querySelector(".zone").getBoundingClientRect();
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const tb = $(".hero-intro").getBoundingClientRect();
    const minX = (document.dir === "rtl" ? 16 : tb.right - pr.left + 20);
    const maxX = (document.dir === "rtl" ? tb.left - pr.left - 20 : pr.width - 16) - cw;
    const top0 = 100, bottom0 = pr.height - 100 - ch;
    // try several spots and keep the one that hides the fewest plot labels and the least of the selected plot
    const far = document.dir === "rtl" ? minX : maxX;
    const near = document.dir === "rtl" ? maxX : minX;
    const midY = (top0 + bottom0) / 2;
    const spots = [[far, top0 + 24], [far, midY], [far, bottom0], [far, top0], [near, top0 + 24], [near, midY], [near, bottom0]];
    if (target) {
      const ty = target.top - pr.top + target.height / 2 - ch / 2;
      spots.unshift([target.right - pr.left + 18, ty], [target.left - pr.left - cw - 18, ty]);
    }
    const clampX = (v) => Math.max(Math.min(minX, maxX), Math.min(Math.max(minX, maxX), v));
    const clampY = (v) => Math.max(top0, Math.min(bottom0, v));
    const rel = (r) => ({ l: r.left - pr.left, t: r.top - pr.top, r: r.right - pr.left, b: r.bottom - pr.top });
    const labelBoxes = Object.values(labels).map((l) => rel(l.getBoundingClientRect()));
    const tBox = target ? rel(target) : null;
    const overlap = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
    let best = null;
    spots.forEach(([sx, sy], idx) => {
      const x0 = clampX(sx), y0 = clampY(sy);
      const box = { l: x0, t: y0, r: x0 + cw, b: y0 + ch };
      let score = labelBoxes.reduce((s, lb) => s + (overlap(box, lb) > 0 ? 1e6 + overlap(box, lb) : 0), 0);
      if (tBox) score += overlap(box, tBox) * 2;
      if (docked && idx === (target ? 2 : 0)) score -= 1; // autoplay prefers the top-right dock on a tie
      if (!best || score < best.score) best = { x: x0, y: y0, score };
    });
    const x = best.x, y = best.y;
    card.style.left = x + "px"; card.style.top = y + "px";
    if (target) {
      card.style.setProperty("--ox", (target.left + target.width / 2 - pr.left - x) + "px");
      card.style.setProperty("--oy", (target.top + target.height / 2 - pr.top - y) + "px");
    }
  }

  function go(i, user) {
    step = i;
    const key = DAY[i];
    plan.classList.add("has-active");
    Object.entries(plots).forEach(([k, g]) => {
      const on = key === "all" || k === key;
      g.classList.toggle("is-on", on);
      g.classList.toggle("is-linked", key !== "all" && BIZ[key].links.includes(k));
      g.setAttribute("aria-pressed", String(k === key));
    });
    Object.entries(labels).forEach(([k, l]) => {
      l.classList.toggle("is-on", key === "all" || k === key);
      l.classList.toggle("is-dim", key !== "all" && k !== key && !BIZ[key].links.includes(k));
    });
    hours.forEach((h, j) => { h.setAttribute("aria-selected", String(j === i)); h.tabIndex = j === i ? 0 : -1; });
    const h = hours[i];
    const smooth = reduced.matches ? "auto" : "smooth";
    track.scrollTo({ left: h.offsetLeft - track.clientWidth / 2 + h.offsetWidth / 2, behavior: smooth });
    if (mobile.matches && pan.scrollWidth > pan.clientWidth && key !== "all") {
      const zr = plots[key].querySelector(".zone").getBoundingClientRect();
      const pr = pan.getBoundingClientRect();
      autoPan = true;
      pan.scrollTo({ left: pan.scrollLeft + zr.left - pr.left + zr.width / 2 - pr.width / 2, behavior: user ? smooth : "auto" });
      setTimeout(() => { autoPan = false; }, user ? 700 : 50);
    }
    docked = !user;
    setLight(key);
    drawLinks(key);
    card.classList.remove("is-rest");
    fillCard(key);
    if (cardExit) { cardExit.cancel(); cardExit = null; card.style.overflow = ""; }
    card.hidden = false;
    placeCard(key);
    if (!reduced.matches) { card.classList.remove("is-in"); void card.offsetWidth; card.classList.add("is-in"); }
    fitPlan();
    if (user) $(".plan-hint").textContent = "";
  }

  function schedule() {
    clearTimeout(timer);
    if (playing && inView && !document.hidden) timer = setTimeout(() => { go((step + 1) % DAY.length, false); schedule(); }, step === DAY.length - 1 ? 6500 : 4600);
  }
  function setPlaying(p) {
    playing = p;
    playBtn.setAttribute("aria-pressed", String(p));
    playBtn.setAttribute("aria-label", p ? "Pause the day" : "Play the day");
    schedule();
  }
  function stop() { setPlaying(false); }
  playBtn.addEventListener("click", () => setPlaying(!playing));

  const acts = {};
  Object.entries(plots).forEach(([k, g]) => {
    const act = () => { stop(); if (plan.classList.contains("has-active") && step === DAY.indexOf(k) && !card.hidden) { closeCard(); return; } go(DAY.indexOf(k), true); };
    acts[k] = act;
    const l = labels[k];
    g.addEventListener("click", act);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
    g.addEventListener("pointerenter", () => l.classList.add("is-hover"));
    g.addEventListener("pointerleave", () => l.classList.remove("is-hover"));
    g.addEventListener("focus", () => l.classList.toggle("is-focus", g.matches(":focus-visible")));
    g.addEventListener("blur", () => l.classList.remove("is-focus"));
    l.addEventListener("click", act);
    l.addEventListener("pointerenter", () => l.classList.add("is-hover"));
    l.addEventListener("pointerleave", () => l.classList.remove("is-hover"));
  });
  let cardExit = null;
  function hideCard() {
    // the card leaves quickly; in the stacked layout its row collapses so the content below glides up
    if (cardExit) cardExit.cancel();
    if (reduced.matches || card.hidden) { card.hidden = true; return; }
    const stacked = mobile.matches;
    const h = card.offsetHeight;
    const frames = stacked
      ? [{ opacity: 1, height: h + "px", marginBottom: "0px" }, { opacity: 0, height: "0px", marginBottom: "0px", paddingTop: "0px", paddingBottom: "0px", borderWidth: "0px" }]
      : [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.96)" }];
    card.style.overflow = "hidden";
    cardExit = card.animate(frames, { duration: stacked ? 260 : 160, easing: "cubic-bezier(0.4, 0, 1, 1)" });
    const done = () => { card.hidden = true; card.style.overflow = ""; cardExit = null; };
    cardExit.finished.then(done, () => { card.style.overflow = ""; });
  }
  function restCard() {
    $(".card-hour", card).textContent = "";
    $(".card-moment", card).textContent = "Tap any plot, or press play, to see how it works with the others.";
    $(".card-name", card).textContent = "Pick a plot";
    card.style.setProperty("--zc", "var(--red)");
    $(".card-operator", card).textContent = "";
    $(".card-text", card).textContent = "";
    $(".card-stat", card).textContent = "";
    $(".card-chips", card).replaceChildren();
    $(".card-links-label", card).textContent = "";
    const v = $(".card-visit", card); v.textContent = ""; v.removeAttribute("href");
    card.classList.add("is-rest");
  }
  function closeCard() {
    if (card.classList.contains("in-intro")) restCard(); else hideCard();
    hours.forEach((h) => h.setAttribute("aria-selected", "false"));
    plan.classList.remove("has-active");
    Object.values(plots).forEach((g) => g.classList.remove("is-on", "is-linked"));
    Object.values(labels).forEach((l) => l.classList.remove("is-on", "is-dim"));
    clearLinks();
  }
  $(".card-close", card).addEventListener("click", () => { stop(); closeCard(); });

  new IntersectionObserver(([en]) => {
    inView = en.isIntersecting;
    if (inView && !still) { svg.unpauseAnimations(); } else { svg.pauseAnimations(); }
    if (reduced.matches) svg.pauseAnimations();
    schedule();
  }, { threshold: 0.25 }).observe($(".hero"));
  document.addEventListener("visibilitychange", schedule);
  window.addEventListener("resize", () => { if (!card.hidden) placeCard(DAY[step]); });
  if (reduced.matches) { svg.pauseAnimations(); playBtn.setAttribute("aria-pressed", "false"); playBtn.setAttribute("aria-label", "Play the day"); }

  // the first state: the morning, so the plan explains itself before anyone touches it
  // ?plot=<business> opens the plan with that business selected (a shareable deep link)
  const deep = new URLSearchParams(location.search).get("plot");
  if (deep && DAY.includes(deep)) { playing = false; go(DAY.indexOf(deep), true); } else go(0, false);
  setPlaying(playing);

  /* ------------------------------------------------------------ search */
  const form = $("#search");
  const intro = $("#find-intro");
  const budget = $("#f-budget");
  const goLabel = $("#search-go-label");
  const result = $("#search-result");
  const BUDGET = {
    buy: { label: "Budget", opts: ["Up to AED 1.5M", "AED 1.5M to 3M", "AED 3M to 5M", "AED 5M and above"] },
    rent: { label: "Yearly rent", opts: ["Up to AED 80K", "AED 80K to 150K", "AED 150K to 250K", "AED 250K and above"] },
  };
  function setMode(mode) {
    form.elements.mode.value = mode;
    const b = BUDGET[mode];
    $("#budget-label").textContent = b.label;
    budget.replaceChildren(new Option("Any budget", ""), ...b.opts.map((o) => new Option(o, o)));
    goLabel.textContent = mode === "buy" ? "Search homes to buy" : "Search homes to rent";
    intro.textContent = mode === "buy"
      ? "Looking to own? Search apartments, townhouses and villas across Bloom's five communities."
      : "Looking to lease? Search apartments, townhouses and villas across Bloom's five communities.";
  }
  $$('input[name="mode"]', form).forEach((r) => r.addEventListener("change", () => setMode(r.value)));
  function describe() {
    const f = form.elements;
    const mode = f.mode.value;
    const type = f.type.value ? (f.type.value === "Hotel apartment" ? "Hotel apartments" : f.type.value + "s") : "Homes";
    const where = f.community.value ? ` in ${COMMUNITY_NAME[f.community.value]}` : " across all five communities";
    const beds = f.beds.value ? (f.beds.value === "Studio" ? ", studio" : `, ${f.beds.value} bedroom${f.beds.value === "1" ? "" : "s"}`) : "";
    const money = f.budget.value ? `, ${f.budget.value}${mode === "rent" ? " a year" : ""}` : "";
    return `${type} to ${mode}${where}${beds}${money}`;
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    $(".result-q", result).textContent = describe();
    result.hidden = false;
    result.classList.remove("is-in"); void result.offsetWidth; result.classList.add("is-in");
  });
  function prefill(o, submit) {
    if (o.mode) { setMode(o.mode); }
    if ("community" in o) form.elements.community.value = o.community || "";
    if ("type" in o) form.elements.type.value = o.type || "";
    scrollToEl(document.getElementById("find"));
    if (submit) form.requestSubmit();
  }
  $$(".try-chip").forEach((b) => b.addEventListener("click", () => {
    const o = JSON.parse(b.dataset.try);
    setMode(o.mode); form.elements.community.value = o.community; form.elements.type.value = o.type;
    form.requestSubmit();
  }));
  $$("[data-prefill]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); prefill(JSON.parse(a.dataset.prefill), true); }));

  /* ------------------------------------------------------------ communities */
  const cis = $$(".ci");
  const locPins = $$(".loc-pin");
  const panel = $("#comm-panel");
  let cIndex = 0;
  function showCommunity(i, focus) {
    const next = (i + COMMUNITIES.length) % COMMUNITIES.length;
    const changed = next !== cIndex;
    cIndex = next;
    const c = COMMUNITIES[cIndex];
    cis.forEach((b, j) => { b.setAttribute("aria-selected", String(j === cIndex)); b.tabIndex = j === cIndex ? 0 : -1; });
    locPins.forEach((p, j) => p.classList.toggle("is-on", j === cIndex));
    $("#comm-img").src = c.img; $("#comm-img").alt = c.alt;
    $("#comm-name").textContent = c.name;
    $("#comm-where").textContent = c.where;
    $("#comm-line").textContent = c.line;
    $("#comm-devs").textContent = c.devs;
    $("#comm-index").textContent = cIndex + 1;
    panel.setAttribute("aria-label", c.name);
    if (changed && motion) { panel.classList.remove("is-swap"); void panel.offsetWidth; panel.classList.add("is-swap"); }
    if (focus) cis[cIndex].focus();
  }
  cis.forEach((b, i) => {
    b.addEventListener("click", () => showCommunity(i));
  });
  $(".comm-index").addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); showCommunity(cIndex + 1, true); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); showCommunity(cIndex - 1, true); }
  });
  $("#comm-prev").addEventListener("click", () => showCommunity(cIndex - 1));
  $("#comm-next").addEventListener("click", () => showCommunity(cIndex + 1));
  $("#comm-find").addEventListener("click", () => prefill({ community: COMMUNITIES[cIndex].key }, true));
  $("#comm-explore").addEventListener("click", (e) => { e.preventDefault(); toast(`The ${COMMUNITIES[cIndex].name} community page is not part of this prototype.`); });
  let sx = null;
  const media = $(".comm-media");
  media.addEventListener("pointerdown", (e) => { sx = e.clientX; });
  media.addEventListener("pointerup", (e) => {
    if (sx === null) return;
    const d = e.clientX - sx; sx = null;
    if (Math.abs(d) > 50) showCommunity(cIndex + (d < 0 ? 1 : -1) * (document.dir === "rtl" ? -1 : 1));
  });
  // the locator pins drop in the first time the section is seen
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    $(".pins").classList.add("dropped");
    if (!motion) return;
    locPins.forEach((p, i) => { p.style.animationDelay = 300 + i * 110 + "ms"; p.classList.add("is-drop"); });
  }, { threshold: 0.35 }).observe(panel);
  const coastSvg = $(".coast-svg");
  new IntersectionObserver(([en]) => { if (still || reduced.matches || !en.isIntersecting) coastSvg.pauseAnimations(); else coastSvg.unpauseAnimations(); }).observe(coastSvg);

  /* ------------------------------------------------------------ life: a bento collage of the day */
  const lifeSec = $("#life");
  const bento = $("#bento");
  const tiles = $$(".tile", bento);
  const WAY_MS = 6000;
  let wi = 0, wTimer = null, lifeVisible = false, wAuto = motion, held = false;
  function applyWay(i) {
    wi = i;
    // the chosen moment takes the big slot; the rest follow it in day order
    tiles.forEach((t, j) => {
      const k = (j - i + tiles.length) % tiles.length;
      t.dataset.slot = "abcd"[k];
      t.setAttribute("aria-pressed", String(k === 0));
      t.setAttribute("aria-label", (k === 0 ? "Showing: " : "Show ") + $(".tile-time", t).textContent + ", " + $(".tile-title", t).textContent);
    });
    const bar = $(".tile-bar i", tiles[i]);
    if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
  }
  function showWay(i) {
    if (i === wi && tiles[i].dataset.slot === "a") { scheduleWay(); return; }
    if (motion && document.startViewTransition) document.startViewTransition(() => applyWay(i));
    else applyWay(i);
    scheduleWay();
  }
  function scheduleWay() {
    clearTimeout(wTimer);
    lifeSec.classList.toggle("is-auto", wAuto);
    if (wAuto && lifeVisible && !held && !document.hidden) wTimer = setTimeout(() => showWay((wi + 1) % tiles.length), WAY_MS);
  }
  tiles.forEach((t, i) => t.addEventListener("click", () => { if (t.dataset.slot === "a") return; wAuto = false; showWay(i); }));
  bento.addEventListener("pointerenter", () => { held = true; bento.classList.add("is-held"); clearTimeout(wTimer); });
  bento.addEventListener("pointerleave", () => { held = false; bento.classList.remove("is-held"); const bar = $(".tile-bar i", tiles[wi]); if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; } scheduleWay(); });
  new IntersectionObserver(([en]) => { lifeVisible = en.isIntersecting; scheduleWay(); }, { threshold: 0.35 }).observe(lifeSec);
  document.addEventListener("visibilitychange", scheduleWay);
  applyWay(0);
  scheduleWay();
  // tiles lean toward the pointer, and the photo shifts the other way (fine pointers, motion on)
  if (motion && window.matchMedia("(pointer: fine)").matches) {
    tiles.forEach((t) => {
      t.addEventListener("pointermove", (e) => {
        const r = t.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        const k = t.dataset.slot === "a" ? 3 : 6;
        t.style.setProperty("--ry", (x * k).toFixed(2) + "deg");
        t.style.setProperty("--rx", (-y * k).toFixed(2) + "deg");
        t.style.setProperty("--px", (-x * 14).toFixed(1) + "px");
        t.style.setProperty("--py", (-y * 14).toFixed(1) + "px");
      });
      t.addEventListener("pointerleave", () => { ["--rx", "--ry", "--px", "--py"].forEach((v) => t.style.removeProperty(v)); });
    });
  }

  /* ------------------------------------------------------------ services: your app, on a phone */
  const roleBtns = $$(".role");
  const svcStage = $("#svc-stage");
  const screen = $("#phone-screen");
  const stickers = $("#feat-stickers");
  // sticker spots around the phone (percent of the stage), alternating sides
  const SPOTS = [["14%", "22%", "-6deg"], ["86%", "30%", "5deg"], ["12%", "62%", "4deg"], ["88%", "68%", "-5deg"], ["16%", "88%", "-3deg"]];
  const ic = (id) => `<svg class="ic"><use href="#${id}"/></svg>`;
  function showApp(i) {
    const a = APPS[i];
    roleBtns.forEach((b, j) => { b.setAttribute("aria-selected", String(j === i)); b.tabIndex = j === i ? 0 : -1; });
    svcStage.style.setProperty("--ac", a.ac);
    svcStage.setAttribute("aria-label", a.name);
    const wordmark = document.querySelector(".brand img").getAttribute("src");
    screen.innerHTML = `
      <div class="ps-status"><span>9:41</span><span>5G</span></div>
      <div class="ps-head"><img src="${wordmark}" alt=""><span class="ps-avatar">${ic(a.icon)}</span></div>
      <p class="ps-hello">${a.hello}</p>
      <p class="ps-sub">${a.name}</p>
      <div class="ps-card"><small>${a.card.k}</small><strong>${a.card.v}</strong><span>${a.card.s}</span>${a.card.p ? `<div class="ps-progress" style="--p:0%"><i></i></div>` : ""}</div>
      <div class="ps-tiles">${a.tiles.map(([id, t]) => `<span class="ps-tile">${ic(id)}${t}</span>`).join("")}</div>
      <div class="ps-tabs"><i></i><i></i><i></i><i></i></div>`;
    if (a.card.p) requestAnimationFrame(() => requestAnimationFrame(() => { const p = $(".ps-progress", screen); if (p) p.style.setProperty("--p", a.card.p + "%"); }));
    stickers.innerHTML = a.feats.map(([id, t], k) => `<li style="--fx:${SPOTS[k][0]};--fy:${SPOTS[k][1]};--fr:${SPOTS[k][2]};--k:${k}">${ic(id)}${t}</li>`).join("");
    if (motion) { screen.classList.remove("is-swap"); void screen.offsetWidth; screen.classList.add("is-swap"); }
  }
  roleBtns.forEach((b, i) => b.addEventListener("click", () => showApp(i)));
  $(".roles").addEventListener("keydown", (e) => {
    const i = roleBtns.indexOf(document.activeElement);
    if (i < 0 || !["ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const n = (i + (e.key === "ArrowDown" ? 1 : -1) + 3) % 3;
    showApp(n); roleBtns[n].focus();
  });
  $$("[data-app-link]").forEach((a) => a.addEventListener("click", () => showApp(Number(a.dataset.appLink))));
  $$(".store").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); toast("Store links are not connected in this prototype."); }));
  $$("[data-construction]").forEach((a) => a.addEventListener("click", () => { showApp(1); toast("Construction updates live in the Bloom Super App, for the homes you own."); }));
  showApp(0);

  /* ------------------------------------------------------------ story: a cinematic reel of chapters, scrubbed by scroll */
  const storySec = $("#story");
  const reel = $("#story-reel"), storyTrack = $("#story-track");
  const chs = $$(".ch", storySec);
  const rlBtns = $$(".rl-btn", storySec);
  const ghost = $$(".story-ghost .odo-strip", storySec);
  const YEARS = chs.map((c) => Number($(".ch-year", c).textContent));
  const N_CH = chs.length;
  const pinnable = window.matchMedia("(min-width: 861px)");
  const storyPinned = () => motion && pinnable.matches;
  let storyIdx = -1;
  function countUp(el) {
    const n = Number(el.dataset.n);
    if (!motion || n < 3) { el.textContent = n; return; }
    const t0 = performance.now(), dur = 900;
    const step = (t) => { const e = Math.min(1, (t - t0) / dur); el.textContent = Math.round(n * (1 - Math.pow(1 - e, 3))); if (e < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function setChapter(k) {
    if (k === storyIdx) return;
    storyIdx = k;
    String(YEARS[k]).split("").forEach((d, n) => ghost[n] && ghost[n].style.setProperty("--d", d));
    $("#story-cur").textContent = String(k + 1).padStart(2, "0");
    chs.forEach((c, n) => c.classList.toggle("is-on", n === k));
    rlBtns.forEach((b, n) => { b.classList.toggle("is-on", n === k); b.classList.toggle("is-past", n < k); b.setAttribute("aria-current", String(n === k)); });
    $("#story-prev").disabled = k === 0;
    $("#story-next").disabled = k === N_CH - 1;
    countUp($(".ch-n", chs[k]));
  }
  // where along the ruler a fractional chapter index sits (years are spaced to scale)
  function rulerAt(f) {
    const a = Math.floor(f), b = Math.min(N_CH - 1, a + 1), t = f - a;
    const y = YEARS[a] + (YEARS[b] - YEARS[a]) * t;
    return (y - YEARS[0]) / (YEARS[N_CH - 1] - YEARS[0]);
  }
  function clearScrub() {
    storyTrack.style.transform = "";
    chs.forEach((c) => {
      c.style.opacity = ""; c.style.transform = "";
      $(".ch-photo", c).style.clipPath = ""; $(".ch-photo", c).style.filter = ""; $("img", c).style.transform = "";
      $$(".ch-copy > *", c).forEach((el) => { el.style.opacity = ""; el.style.transform = ""; });
    });
  }
  function drawStory() {
    const pinned = storyPinned();
    if (pinned !== storySec.classList.contains("is-pinned")) { storySec.classList.toggle("is-pinned", pinned); if (!pinned) clearScrub(); }
    let f;
    if (pinned) {
      const r = storySec.getBoundingClientRect();
      const span = storySec.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, -r.top / span));
      f = p * (N_CH - 1);
      const stride = chs[1].offsetLeft - chs[0].offsetLeft;
      storyTrack.style.transform = `translate3d(${(-f * stride).toFixed(1)}px, 0, 0)`;
      chs.forEach((c, n) => {
        const d = n - f; // 0 = in focus, >0 still to come, <0 already passed
        const reveal = d <= 0 ? 1 : Math.max(0, Math.min(1, (1.15 - d) / 0.9));
        const ph = $(".ch-photo", c);
        ph.style.clipPath = `inset(${((1 - reveal) * 10).toFixed(2)}% 0 ${((1 - reveal) * 10).toFixed(2)}% 0 round 24px)`;
        ph.style.filter = reveal < 1 ? `brightness(${(0.4 + 0.6 * reveal).toFixed(3)}) saturate(${(0.5 + 0.5 * reveal).toFixed(3)})` : "";
        $("img", c).style.transform = `translateX(${(d * -7).toFixed(2)}%) scale(${(1.14 - 0.1 * reveal).toFixed(3)})`;
        c.style.opacity = d < 0 ? Math.max(0, 1 + d * 1.7).toFixed(3) : "1";
        c.style.transform = d < 0 ? `scale(${(1 + d * 0.08).toFixed(3)})` : "";
        $$(".ch-copy > *", c).forEach((el, q) => {
          const lag = Math.max(0, Math.min(1, Math.abs(d) * 1.8 - q * 0.08));
          el.style.opacity = (1 - lag * 0.85).toFixed(3);
          el.style.transform = `translateX(${(d * (50 + q * 22)).toFixed(1)}px)`;
        });
      });
    } else {
      const stride = chs[1].offsetLeft - chs[0].offsetLeft;
      f = Math.max(0, Math.min(N_CH - 1, reel.scrollLeft / stride));
    }
    storySec.style.setProperty("--rp", rulerAt(f).toFixed(4));
    setChapter(Math.round(f));
  }
  function goToChapter(k) {
    k = Math.max(0, Math.min(N_CH - 1, k));
    if (storyPinned()) {
      const span = storySec.offsetHeight - window.innerHeight;
      const target = storySec.offsetTop + span * (k / (N_CH - 1)) + 1;
      if (smooth) smooth.to(target); else window.scrollTo({ top: target, behavior: "smooth" });
    } else {
      reel.scrollTo({ left: chs[k].offsetLeft - chs[0].offsetLeft, behavior: motion ? "smooth" : "auto" });
    }
  }
  rlBtns.forEach((b) => b.addEventListener("click", () => goToChapter(Number(b.dataset.k))));
  $("#story-prev").addEventListener("click", () => goToChapter(storyIdx - 1));
  $("#story-next").addEventListener("click", () => goToChapter(storyIdx + 1));
  let storyTick = false;
  const queueStory = () => { if (!storyTick) { storyTick = true; requestAnimationFrame(() => { storyTick = false; drawStory(); }); } };
  window.addEventListener("scroll", queueStory, { passive: true });
  reel.addEventListener("scroll", queueStory, { passive: true });
  window.addEventListener("resize", queueStory);
  pinnable.addEventListener("change", queueStory);
  drawStory();

  /* ------------------------------------------------------------ about: area schedule counts up */
  const nums = $$(".num[data-count]");
  const fmt = new Intl.NumberFormat("en");
  if (motion) nums.forEach((n) => { n.textContent = "0" + (n.dataset.suffix || ""); });
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    if (!motion) return;
    nums.forEach((n, i) => {
      const end = Number(n.dataset.count), suf = n.dataset.suffix || "";
      const t0 = performance.now() + i * 90, dur = 1300;
      const tick = (t) => {
        const p = Math.min(1, Math.max(0, (t - t0) / dur));
        n.textContent = fmt.format(Math.round(end * (1 - Math.pow(1 - p, 4)))) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.3 }).observe($(".schedule"));

  /* ------------------------------------------------------------ enquiry dialog */
  const dlg = $("#enquiry");
  const enq = $("#enq-form");
  const done = $("#enq-done");
  let opener = null;
  $$("[data-enquire]").forEach((b) => b.addEventListener("click", () => {
    opener = b;
    enq.hidden = false; done.hidden = true; enq.reset();
    $$(".field", enq).forEach((f) => f.classList.remove("is-bad"));
    const want = b.dataset.enquire;
    if (want) { const r = dlg.querySelector(`input[name="interest"][value="${want}"]`); if (r) r.checked = true; }
    dlg.classList.remove("is-sent");
    setTopic(false);
    dlg.showModal();
  }));
  dlg.addEventListener("close", () => { if (opener) opener.focus(); });
  const topics = $$('input[name="interest"]', dlg);
  // the side panel recolours and rewords itself for the chosen topic
  function setTopic(animate = true) {
    const t = topics.find((r) => r.checked) || topics[0];
    dlg.style.setProperty("--tc", t.closest(".enq-topic").style.getPropertyValue("--tc"));
    const lede = $("#enq-lede");
    lede.textContent = t.dataset.lede;
    enq.elements.message.placeholder = t.dataset.ph;
    if (animate && motion) { lede.classList.remove("is-swap"); void lede.offsetWidth; lede.classList.add("is-swap"); }
  }
  topics.forEach((r) => r.addEventListener("change", () => setTopic()));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  function check(input) {
    const ok = input.name === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()) : input.value.trim().length > 1;
    input.closest(".field").classList.toggle("is-bad", !ok);
    input.setAttribute("aria-invalid", String(!ok));
    return ok;
  }
  $$("input[required]", enq).forEach((i) => i.addEventListener("blur", () => { if (i.value) check(i); }));
  $$("input[required]", enq).forEach((i) => i.addEventListener("input", () => { if (i.closest(".field").classList.contains("is-bad")) check(i); }));
  enq.addEventListener("submit", (e) => {
    e.preventDefault();
    const bad = $$("input[required]", enq).filter((i) => !check(i));
    if (bad.length) { bad[0].focus(); return; }
    const first = enq.elements.name.value.trim().split(/\s+/)[0];
    $("#enq-name").textContent = first ? `, ${first}` : "";
    const topic = topics.find((r) => r.checked);
    $("#enq-topic-done").textContent = (topic ? topic.value : "your enquiry").toLowerCase();
    enq.hidden = true; done.hidden = false; dlg.classList.add("is-sent");
    done.classList.remove("is-in"); void done.offsetWidth; done.classList.add("is-in");
    done.focus();
  });
  $("#enq-back").addEventListener("click", () => { dlg.close(); window.scrollTo({ top: 0, behavior: reduced.matches ? "auto" : "smooth" }); });


  /* ------------------------------------------------------------ custom cursor: a trailing ring that knows what it is over */
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (motion && finePointer.matches) {
    const cur = document.createElement("div");
    cur.className = "cur is-out";
    cur.setAttribute("aria-hidden", "true");
    cur.innerHTML = '<div class="cur-ring"><span class="cur-label"></span></div><svg class="cur-dot" viewBox="0 0 22 26"><path d="M3 2.5v18.2l4.9-4.6 3.4 7.4 3.4-1.6-3.4-7.2h6.6z"/></svg>';
    document.body.appendChild(cur);
    document.documentElement.classList.add("has-cursor");
    const ring = $(".cur-ring", cur), dot = $(".cur-dot", cur), label = $(".cur-label", cur);
    let mx = -100, my = -100, rx = -100, ry = -100;
    // what the cursor says over each kind of thing (first match wins)
    const LABELS = [
      [".plot, .plot-label", (el) => ({ t: "Explore", c: `var(--${el.dataset.biz})` })],
      [".parcel-hit", () => ({ t: "Enquire", c: "var(--red)" })],
      [".ci", () => ({ t: "View", c: "var(--water-deep)" })],
      [".tile:not([data-slot='a'])", () => ({ t: "Open", c: "var(--land)" })],
      [".role", () => ({ t: "Try it", c: "var(--fm)" })],
      [".story.is-pinned .story-reel", () => ({ t: "Scroll", c: "var(--site)", ic: "i-down" })],
    ];
    const HOVER = "a, button, [role='button'], label, select, summary, input[type='radio'], input[type='range']";
    const TEXT = "input:not([type='radio']):not([type='checkbox']):not([type='range']), textarea";
    let lastKey = "";
    function setState(target) {
      let key = "", info = null;
      if (target.closest && target.closest(TEXT)) key = "text";
      else {
        for (const [sel, fn] of LABELS) { const el = target.closest && target.closest(sel); if (el) { info = fn(el); key = "label:" + info.t + info.c; break; } }
        if (!info && target.closest && target.closest(HOVER)) key = "hover";
      }
      if (key === lastKey) return;
      lastKey = key;
      cur.classList.toggle("is-text", key === "text");
      cur.classList.toggle("is-hover", key === "hover");
      cur.classList.toggle("is-label", !!info);
      if (!info) cur.style.removeProperty("--cc");
      if (info) {
        cur.style.setProperty("--cc", info.c);
        // dark text on the light zone colours, white on the deep ones
        cur.style.setProperty("--cf", /--(re|land|health|hosp|site)\)/.test(info.c) ? "var(--ink)" : "#fff");
        label.innerHTML = info.t + (info.ic ? `<svg class="ic"><use href="#${info.ic}"/></svg>` : "");
      }
    }
    // primary buttons lean towards the cursor
    const MAGNETS = ".btn-red, .btn-ink, .dock-cta, .story-nav, .enq-send";
    let magnet = null;
    function pullMagnet(target) {
      const m = target.closest && target.closest(MAGNETS);
      if (magnet && magnet !== m) { magnet.style.translate = ""; magnet = null; }
      if (!m) return;
      magnet = m; m.classList.add("is-magnetic");
      const r = m.getBoundingClientRect();
      const dx = (mx - (r.left + r.width / 2)) / r.width, dy = (my - (r.top + r.height / 2)) / r.height;
      m.style.translate = `${(dx * 10).toFixed(1)}px ${(dy * 8).toFixed(1)}px`;
    }
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX; my = e.clientY;
      if (cur.classList.contains("is-out")) { rx = mx; ry = my; cur.classList.remove("is-out"); }
      setState(e.target);
      pullMagnet(e.target);
    }, { passive: true });
    // the label can change under a still cursor when the page scrolls
    window.addEventListener("scroll", () => { const el = document.elementFromPoint(mx, my); if (el) setState(el); }, { passive: true });
    document.addEventListener("pointerleave", () => cur.classList.add("is-out"));
    window.addEventListener("blur", () => cur.classList.add("is-out"));
    window.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      cur.classList.add("is-down");
      // a small burst of zone colours
      const cols = ["--re", "--edu", "--hosp", "--land", "--water", "--red"];
      for (let i = 0; i < 6; i++) {
        const sp = document.createElement("span");
        sp.className = "cur-spark";
        sp.style.background = `var(${cols[i]})`;
        document.body.appendChild(sp);
        const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5, d = 26 + Math.random() * 18;
        sp.animate([
          { transform: `translate(${mx}px, ${my}px) scale(1)`, opacity: 1 },
          { transform: `translate(${mx + Math.cos(a) * d}px, ${my + Math.sin(a) * d}px) scale(0)`, opacity: 0.9 },
        ], { duration: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }).onfinish = () => sp.remove();
      }
    });
    window.addEventListener("pointerup", () => cur.classList.remove("is-down"));
    let ang = 0, stretch = 1;
    (function loop() {
      // the tile sits just behind the arrow's tail, unless it is showing a label
      const labelled = cur.classList.contains("is-label") || cur.classList.contains("is-hover");
      const ox = labelled ? 0 : 16, oy = labelled ? 0 : 22;
      const vx = mx + ox - rx, vy = my + oy - ry;
      rx += (mx + ox - rx) * 0.18; ry += (my + oy - ry) * 0.18;
      const speed = Math.hypot(vx, vy);
      const tAng = labelled || speed < 2 ? 0 : Math.atan2(vy, vx) * 180 / Math.PI;
      let dA = ((tAng - ang + 540) % 360) - 180;
      ang += dA * 0.2;
      stretch += ((labelled ? 1 : 1 + Math.min(speed / 60, 0.55)) - stretch) * 0.25;
      dot.style.transform = `translate3d(${mx - 3}px, ${my - 2}px, 0)`;
      ring.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0) rotate(${ang.toFixed(1)}deg) scale(${stretch.toFixed(3)}, ${(1 / Math.sqrt(stretch)).toFixed(3)})`;
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------------------------------------ entrance: the plan draws itself */
  const ease = "cubic-bezier(0.16, 1, 0.3, 1)";
  function enter(el, frames, delay, duration = 900) {
    if (el) el.animate(frames, { duration, delay, easing: ease, fill: "backwards" });
  }
  if (motion) {
    const up = (px) => [{ opacity: 0, transform: `translateY(${px}px)` }, { opacity: 1, transform: "none" }];
    enter($(".site-header .bar"), up(-30), 80, 900);
    enter($(".roads", svg), [{ opacity: 0 }, { opacity: 1 }], 60, 700);
    enter($(".beyond", svg), [{ opacity: 0 }, { opacity: 1 }], 60, 900);
    ["edu", "retail", "health", "hosp", "re", "land", "fm"].forEach((k, i) => {
      $$(".zone", plots[k]).forEach((z) => enter(z, [{ opacity: 0, transform: "scale(0.86)" }, { opacity: 1, transform: "none" }], 160 + i * 85, 850));
      $$(".bld", plots[k]).forEach((b) => enter(b, up(-16), 420 + i * 70, 800));
    });
    $$(".tree-canopy, .tree-light, .palm path, .umbrella circle", svg).forEach((t, i) => enter(t, [{ transform: "scale(0)" }, { transform: "none" }], 650 + ((i * 37) % 480), 700));
    $$(".water, .pool, .track, .pitch, .park-lawn", svg).forEach((w, i) => enter(w, [{ opacity: 0 }, { opacity: 1 }], 380 + i * 30, 700));
    $$(".label-in", svg).forEach((l, i) => enter(l, [{ opacity: 0, transform: "scale(0.6)" }, { opacity: 1, transform: "none" }], 1050 + i * 60, 700));
    enter($(".traffic", svg), [{ opacity: 0 }, { opacity: 1 }], 1200, 800);
    $$(".hero-intro h1 > span").forEach((sp, i) => enter(sp, up(48), 220 + i * 120, 1100));
    enter($(".hero-intro"), [{ opacity: 0 }, { opacity: 1 }], 120, 600);
    enter($(".hero-lede"), up(24), 520, 900);
    enter($(".hero-cta"), up(24), 760, 900);
    enter($(".day-clock"), up(28), 560, 950);
    enter($(".plan-note"), [{ opacity: 0 }, { opacity: 1 }], 1300, 700);
    if (!card.hidden) enter(card, [{ opacity: 0, transform: "scale(0.92) translateY(10px)" }, { opacity: 1, transform: "none" }], 1250, 800);
    enter(conns, [{ opacity: 0 }, { opacity: 1 }], 1150, 700);
  }
  document.documentElement.classList.remove("intro");

  /* ------------------------------------------------------------ scroll reveals */
  if (motion) {
    // clipped elements never intersect, so an element hidden by clip-path is watched through its parent
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      if (en.target.__self) en.target.classList.add("in");
      (en.target.__rv || []).forEach((t) => t.classList.add("in"));
      io.unobserve(en.target);
    }), { rootMargin: "0px 0px -10% 0px", threshold: 0.01 });
    const watch = (el, cls, d) => {
      el.classList.add(cls);
      if (d) el.style.setProperty("--d", d);
      if (cls === "rv-img") {
        const host = el.parentElement;
        (host.__rv = host.__rv || []).push(el);
        io.observe(host);
      } else { el.__self = true; io.observe(el); }
    };
    $$("main h2.display, .footer h2.display").forEach((h) => {
      const words = h.textContent.trim().split(/\s+/);
      h.textContent = "";
      words.forEach((w, i) => {
        const o = document.createElement("span"); o.className = "w";
        const inner = document.createElement("span"); inner.className = "wi"; inner.textContent = w; inner.style.setProperty("--i", i);
        o.appendChild(inner); h.appendChild(o);
        if (i < words.length - 1) h.appendChild(document.createTextNode(" "));
      });
      watch(h, "rv-words");
    });
    [".find-intro", ".comm-head p", ".svc-head p", ".awards-head p", ".life-head .life-lede", ".about-lede", ".about-actions", ".search",
      ".parcels-head", ".comm-index", ".comm-stage", ".roles", ".svc-stage", ".stores", ".talk", ".news-head",
      ".schedule", ".close-actions", ".foot-bar", ".foot-mark", ".bento"].forEach((sel) => $$(sel).forEach((el) => watch(el, "rv", sel === ".talk" || sel === ".comm-stage" ? 140 : 0)));
    [".parcels > li", ".news-list > li", ".foot-grid > *", ".schedule tbody tr"].forEach((sel) => $$(sel).forEach((el, i) => watch(el, "rv", 80 + i * 90)));
    $$(".stamp").forEach((el, i) => watch(el, "rv", i * 130));
    $$(".parcel-media, .comm-media").forEach((el) => watch(el, "rv-img", 120));
  }

  /* ------------------------------------------------------------ parallax and the header */
  const header = $("#site-header");
  const para = $$("[data-parallax]");
  const planSvg = svg;
  let tops = [];
  function measure() { tops = para.map((el) => { let y = 0, n = el; while (n) { y += n.offsetTop; n = n.offsetParent; } return y + el.offsetHeight / 2; }); }
  let lastY = window.scrollY, ticking = false;
  function onScroll() {
    const y = window.scrollY, vh = window.innerHeight;
    if (motion) {
      para.forEach((el, i) => {
        const c = tops[i] - (y + vh / 2);
        if (Math.abs(c) < vh * 1.5) el.style.setProperty("--py", (-c * Number(el.dataset.parallax)).toFixed(1) + "px");
      });
      if (!mobile.matches && y < vh * 1.2) planSvg.style.translate = `0 ${(y * 0.22).toFixed(1)}px`;
    }
    const menuOpen = menuBtn.getAttribute("aria-expanded") === "true";
    if (!menuOpen && y > 420 && y > lastY + 2) header.classList.add("is-hidden");
    else if (menuOpen || y < lastY - 2 || y <= 420) header.classList.remove("is-hidden");
    // the dock stands in for the header while it is tucked away (and stays while its menu is open)
    const showDock = (header.classList.contains("is-hidden") && !reduced.matches) || !dockMenu.hidden;
    dock.classList.toggle("is-shown", showDock);
    document.body.classList.toggle("dock-on", showDock);
    if (!showDock && !dockMenu.hidden) setDockMenu(false);
    const max = document.documentElement.scrollHeight - vh;
    dock.style.setProperty("--pg", max > 0 ? (y / max).toFixed(3) : "0");
    lastY = y; ticking = false;
  }
  measure();
  window.addEventListener("resize", () => { measure(); onScroll(); });
  window.addEventListener("load", measure);
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
  onScroll();

  /* ------------------------------------------------------------ language: EN / AR preview */
  const AR = {
    "nav.find": "ابحث عن منزل", "nav.communities": "المجتمعات", "nav.services": "خدمة العملاء", "nav.story": "قصتنا", "nav.about": "عن بلوم",
    "cta.enquire": "استفسر", "cta.enquiry": "أرسل استفساراً", "cta.search": "ابحث عن منزل",
    "hero.title1": "مرحباً بكم في", "hero.title2": "عالم بلوم", "hero.lede": "سبعة أعمال. مجتمع واحد متصل. اضغط على أي قطعة لترى كيف تتصل.",
    "mode.buy": "شراء", "mode.rent": "إيجار",
    "find.title": "ابحث عن مكان تسميه منزلك.", "comm.title": "خمسة مجتمعات، ساحل واحد.", "life.title": "أكثر من مكان. أسلوب حياة.",
    "svc.title": "كل ما تحتاجه، أقرب إلى منزلك.", "awards.title": "تقدير لطريقتنا في بناء المجتمعات.", "story.title": "من مجتمع واحد إلى عالم بلوم.",
    "about.title": "نبني المجتمعات بعناية. ونصنع قيمة دائمة.", "footer.title": "لنجد مكانك في عالم بلوم.",
  };
  const EN = {};
  $$("[data-i18n]").forEach((el) => { EN[el.dataset.i18n] ??= el.textContent; });
  function setLang(lang) {
    const ar = lang === "ar";
    document.documentElement.lang = ar ? "ar" : "en";
    document.documentElement.dir = ar ? "rtl" : "ltr";
    $$("[data-i18n]").forEach((el) => { const k = el.dataset.i18n; el.textContent = ar ? (AR[k] || EN[k]) : EN[k]; });
    $$(".lang-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    fitPlan();
    if (!card.hidden) placeCard(DAY[step]);
    if (ar) toast("معاينة عربية: العناوين والتنقل فقط. Arabic preview covers headings and navigation only.");
  }
  $$(".lang-btn").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
})();
