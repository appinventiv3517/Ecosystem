(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  // ?still freezes the ambient scene (traffic, boats, autoplay) for screenshots and motion capture
  const still = new URLSearchParams(location.search).has("still");
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
      at: [675, 260] },
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

  const APPS = [
    { name: "Bloom Community App", img: "assets/img/app-community.webp", alt: "Two phones showing the Bloom Community App",
      feats: ["Service requests", "Amenity bookings", "Moving in and out", "Tenancy renewals", "Service charges"] },
    { name: "Bloom Super App", img: "assets/img/app-super.webp", alt: "Laptop and phone showing the Bloom Super App",
      feats: ["Payments", "Property documents", "Construction updates for the homes you own"] },
    { name: "Bloom Partners App", img: "assets/img/app-partners.webp", alt: "Laptop and phone showing the Bloom Partners App",
      feats: ["Onboarding", "Live inventory", "Leads", "Commission tracking"] },
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

  /* ------------------------------------------------------------ the living masterplan */
  const plan = $("#plan");
  const svg = $(".plan-svg");
  let conns = $(".conns", svg);
  const labels = Object.fromEntries($$(".plot-label", svg).map((l) => [l.dataset.biz, l]));
  const keyBtns = $$(".key button");
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

  const mobile = window.matchMedia("(max-width: 1100px)");
  function fitPlan() {
    svg.setAttribute("viewBox", mobile.matches ? "540 30 1060 940" : "0 0 1600 1000");
    svg.setAttribute("preserveAspectRatio", mobile.matches ? "xMidYMid meet" : "xMidYMid slice");
  }
  fitPlan();
  mobile.addEventListener("change", fitPlan);
  let autoPan = false;
  pan.addEventListener("scroll", () => { if (!autoPan) plan.classList.add("is-panned"); }, { passive: true });
  let docked = true;
  function placeCard(key) {
    if (mobile.matches) { card.style.left = ""; card.style.top = ""; return; }
    const pr = plan.getBoundingClientRect();
    const target = key === "all" ? null : plots[key].querySelector(".zone").getBoundingClientRect();
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const tb = $(".title-block").getBoundingClientRect();
    const minX = (document.dir === "rtl" ? 16 : tb.right - pr.left + 20);
    const maxX = (document.dir === "rtl" ? tb.left - pr.left - 20 : pr.width - 16) - cw;
    const top0 = 100, bottom0 = pr.height - 100 - ch;
    let x, y;
    if (!target || docked) { x = maxX; y = top0 + 24; }
    else {
      const right = target.right - pr.left + 18;
      const left = target.left - pr.left - cw - 18;
      x = right <= maxX ? right : left >= minX ? left : maxX;
      y = target.top - pr.top + target.height / 2 - ch / 2;
    }
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(top0, Math.min(bottom0, y));
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
    keyBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.key === key)));
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
    fillCard(key);
    card.hidden = false;
    placeCard(key);
    if (!reduced.matches) { card.classList.remove("is-in"); void card.offsetWidth; card.classList.add("is-in"); }
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
  keyBtns.forEach((b) => b.addEventListener("click", () => { stop(); go(DAY.indexOf(b.dataset.key), true); }));
  const legend = $("#hero-search");
  const legendToggle = $(".legend-toggle");
  legendToggle.addEventListener("click", () => {
    const open = !legend.classList.contains("is-open");
    legend.classList.toggle("is-open", open);
    legendToggle.setAttribute("aria-expanded", String(open));
    legendToggle.textContent = open ? "Fewer filters" : "More filters";
  });
  function closeCard() {
    card.hidden = true;
    hours.forEach((h) => h.setAttribute("aria-selected", "false"));
    plan.classList.remove("has-active");
    Object.values(plots).forEach((g) => g.classList.remove("is-on", "is-linked"));
    Object.values(labels).forEach((l) => l.classList.remove("is-on", "is-dim"));
    keyBtns.forEach((b) => b.setAttribute("aria-pressed", "false"));
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
    document.getElementById("find").scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth" });
    if (submit) form.requestSubmit();
  }
  $$(".try-chip").forEach((b) => b.addEventListener("click", () => {
    const o = JSON.parse(b.dataset.try);
    setMode(o.mode); form.elements.community.value = o.community; form.elements.type.value = o.type;
    form.requestSubmit();
  }));
  $$("[data-prefill]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); prefill(JSON.parse(a.dataset.prefill), true); }));
  $("#hero-search").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.currentTarget.elements;
    prefill({ mode: f.hmode.value, community: f.community.value, type: f.type.value }, true);
  });

  /* ------------------------------------------------------------ communities */
  const pins = $$(".pin");
  const panel = $("#comm-panel");
  let cIndex = 0;
  pins.forEach((p, i) => { p.querySelector(".pin-head").textContent = String(i + 1); });
  function showCommunity(i, focus) {
    cIndex = (i + COMMUNITIES.length) % COMMUNITIES.length;
    const c = COMMUNITIES[cIndex];
    pins.forEach((p, j) => { p.setAttribute("aria-selected", String(j === cIndex)); p.tabIndex = j === cIndex ? 0 : -1; });
    $$(".comm-legend button").forEach((b, j) => b.setAttribute("aria-current", String(j === cIndex)));
    $("#comm-img").src = c.img; $("#comm-img").alt = c.alt;
    $("#comm-name").textContent = c.name;
    $("#comm-where").textContent = c.where;
    $("#comm-line").textContent = c.line;
    $("#comm-devs").textContent = c.devs;
    $("#comm-index").textContent = cIndex + 1;
    panel.setAttribute("aria-label", c.name);
    panel.classList.remove("is-swap"); void panel.offsetWidth; panel.classList.add("is-swap");
    if (focus) pins[cIndex].focus();
  }
  pins.forEach((p, i) => p.addEventListener("click", () => showCommunity(i)));
  $$(".comm-legend button").forEach((b, i) => b.addEventListener("click", () => showCommunity(i)));
  $(".pins").addEventListener("keydown", (e) => {
    const rtl = document.dir === "rtl";
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); showCommunity(cIndex + (rtl && e.key === "ArrowRight" ? -1 : 1), true); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); showCommunity(cIndex + (rtl && e.key === "ArrowLeft" ? 1 : -1), true); }
  });
  showCommunity(0);
  panel.classList.remove("is-swap");
  $("#comm-prev").addEventListener("click", () => showCommunity(cIndex - 1));
  $("#comm-next").addEventListener("click", () => showCommunity(cIndex + 1));
  $("#comm-find").addEventListener("click", () => prefill({ community: COMMUNITIES[cIndex].key }, true));
  $("#comm-explore").addEventListener("click", (e) => { e.preventDefault(); toast(`The ${COMMUNITIES[cIndex].name} community page is not part of this prototype.`); });
  let sx = null;
  panel.addEventListener("pointerdown", (e) => { sx = e.clientX; });
  panel.addEventListener("pointerup", (e) => {
    if (sx === null) return;
    const d = e.clientX - sx; sx = null;
    if (Math.abs(d) > 50) showCommunity(cIndex + (d < 0 ? 1 : -1) * (document.dir === "rtl" ? -1 : 1));
  });
  // pins drop onto the map the first time it is seen
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    if (reduced.matches) return;
    pins.forEach((p, i) => { p.style.setProperty("animation-delay", "0s"); p.querySelector(".pin-head").style.animationDelay = i * 110 + "ms"; p.classList.add("is-drop"); });
  }, { threshold: 0.4 }).observe($("#coast"));
  const coastSvg = $(".coast-svg");
  new IntersectionObserver(([en]) => { if (still || reduced.matches || !en.isIntersecting) coastSvg.pauseAnimations(); else coastSvg.unpauseAnimations(); }).observe(coastSvg);

  /* ------------------------------------------------------------ life strips */
  const strips = $$(".strip");
  strips.forEach((s) => {
    const b = $(".strip-btn", s);
    const open = () => strips.forEach((o) => { const on = o === s; o.classList.toggle("is-open", on); $(".strip-btn", o).setAttribute("aria-expanded", String(on)); });
    b.addEventListener("click", open);
    b.addEventListener("focus", open);
    s.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !mobile.matches) open(); });
  });

  /* ------------------------------------------------------------ services */
  const whoBtns = $$(".who-btn");
  const appPanel = $("#svc-panel");
  function showApp(i) {
    const a = APPS[i];
    whoBtns.forEach((b, j) => { b.setAttribute("aria-selected", String(j === i)); b.tabIndex = j === i ? 0 : -1; });
    $("#app-img").src = a.img; $("#app-img").alt = a.alt;
    $("#app-name").textContent = a.name;
    $("#app-feats").replaceChildren(...a.feats.map((t) => Object.assign(document.createElement("li"), { textContent: t })));
    appPanel.setAttribute("aria-label", a.name);
    appPanel.classList.remove("is-swap"); void appPanel.offsetWidth; appPanel.classList.add("is-swap");
  }
  whoBtns.forEach((b, i) => b.addEventListener("click", () => showApp(i)));
  $(".who").addEventListener("keydown", (e) => {
    const i = whoBtns.indexOf(document.activeElement);
    if (i < 0 || !["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    const n = (i + ((e.key === "ArrowRight") !== (document.dir === "rtl") ? 1 : -1) + 3) % 3;
    showApp(n); whoBtns[n].focus();
  });
  $$("[data-app-link]").forEach((a) => a.addEventListener("click", () => showApp(Number(a.dataset.appLink))));
  $$(".store").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); toast("Store links are not connected in this prototype."); }));
  $$("[data-construction]").forEach((a) => a.addEventListener("click", () => { showApp(1); toast("Construction updates live in the Bloom Super App, for the homes you own."); }));
  showApp(0);

  /* ------------------------------------------------------------ awards: stamps press in */
  const stampList = $("#stamps");
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    if (reduced.matches) return;
    $$(".stamp", stampList).forEach((s, i) => {
      const rot = getComputedStyle(s).getPropertyValue("--rot").trim() || "0deg";
      s.animate([
        { transform: `rotate(${rot}) scale(1.6)`, opacity: 0 },
        { transform: `rotate(${rot}) scale(0.96)`, opacity: 1, offset: 0.7 },
        { transform: `rotate(${rot}) scale(1)`, opacity: 1 },
      ], { duration: 520, delay: i * 140, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" });
    });
  }, { threshold: 0.35 }).observe(stampList);

  /* ------------------------------------------------------------ story: the plan grows */
  const range = $("#story-range");
  const grows = $$(".grow");
  const years = $$(".scrub-years li");
  const storyText = $(".story-text");
  const scrub = $(".scrub");
  const storyPlay = $("#story-play");
  let storyTimer;
  function showYear(i) {
    const s = STORY[i];
    range.value = i;
    range.style.setProperty("--p", (i / (STORY.length - 1)) * 100 + "%");
    range.setAttribute("aria-valuetext", `${s.y}, ${s.t}`);
    $("#story-year").textContent = s.y;
    $("#story-t").textContent = s.t;
    $("#story-d").textContent = s.d;
    $("#story-img").src = s.img; $("#story-img").alt = s.alt;
    grows.forEach((g) => { const y = Number(g.dataset.year); g.classList.toggle("is-built", y <= s.y); g.classList.toggle("is-new", y === s.y); });
    years.forEach((li, j) => li.classList.toggle("is-on", j === i));
    storyText.classList.remove("is-swap"); void storyText.offsetWidth; storyText.classList.add("is-swap");
  }
  range.addEventListener("input", () => { stopStory(); showYear(Number(range.value)); });
  function stopStory() { clearInterval(storyTimer); storyTimer = null; scrub.classList.remove("is-playing"); storyPlay.setAttribute("aria-label", "Play the story"); }
  storyPlay.addEventListener("click", () => {
    if (storyTimer) { stopStory(); return; }
    let i = Number(range.value);
    if (i >= STORY.length - 1) { i = 0; showYear(0); }
    scrub.classList.add("is-playing");
    storyPlay.setAttribute("aria-label", "Pause the story");
    storyTimer = setInterval(() => { i += 1; showYear(i); if (i >= STORY.length - 1) stopStory(); }, 2200);
  });
  showYear(0);

  /* ------------------------------------------------------------ about: area schedule counts up */
  const nums = $$(".num[data-count]");
  const fmt = new Intl.NumberFormat("en");
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    if (reduced.matches) return;
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
  }, { threshold: 0.4 }).observe($(".schedule"));

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
    if (want) { const r = enq.querySelector(`input[name="interest"][value="${want}"]`); if (r) r.checked = true; }
    dlg.showModal();
  }));
  dlg.addEventListener("close", () => { if (opener) opener.focus(); });
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
    enq.hidden = true; done.hidden = false;
    done.classList.remove("is-in"); void done.offsetWidth; done.classList.add("is-in");
    done.focus();
  });
  $("#enq-back").addEventListener("click", () => { dlg.close(); window.scrollTo({ top: 0, behavior: reduced.matches ? "auto" : "smooth" }); });

  /* ------------------------------------------------------------ language: EN / AR preview */
  const AR = {
    "nav.find": "ابحث عن منزل", "nav.communities": "المجتمعات", "nav.services": "خدمة العملاء", "nav.story": "قصتنا", "nav.about": "عن بلوم",
    "cta.enquire": "استفسر", "cta.enquiry": "أرسل استفساراً", "cta.search": "ابحث عن المنازل",
    "hero.title1": "مرحباً بكم في", "hero.title2": "عالم بلوم", "hero.lede": "سبعة أعمال. مجتمع واحد متصل. اضغط على أي قطعة لترى كيف تتصل.",
    "hero.search": "ابحث عن قطعتك", "mode.buy": "شراء", "mode.rent": "إيجار",
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
    if (!card.hidden) placeCard(DAY[step]);
    if (ar) toast("معاينة عربية: العناوين والتنقل فقط. Arabic preview covers headings and navigation only.");
  }
  $$(".lang-btn").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
})();
