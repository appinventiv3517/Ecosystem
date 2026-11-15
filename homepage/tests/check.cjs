// Browser check for the homepage prototype: loads the page at desktop, laptop, tablet and phone
// sizes, exercises every interaction in the brief and reports what passed.
//
//   node tests/check.cjs              all suites
//   node tests/check.cjs desktop      one suite: desktop, opening, laptop, phone, tablet, reducedMotion, clipping
//   SHOTS=1 node tests/check.cjs      also writes screenshots to tests/output/
//   PAGE_URL=... node tests/check.cjs runs against another build (see tools/build_artifact.py)
//
// Needs Playwright with Chromium available to Node.

const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const PAGE = process.env.PAGE_URL || `${BASE}/`;
const SHOTS = Boolean(process.env.SHOTS);
const OUT = path.join(__dirname, 'output');
const results = [];
let server = null;

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? '  ok  ' : ' FAIL '} ${name}${!pass && detail !== '' ? ` -> ${JSON.stringify(detail)}` : ''}`);
}

async function ensureServer() {
  try {
    if ((await fetch(BASE)).ok) return;
  } catch {}
  server = spawn(process.execPath, [path.join(__dirname, '..', 'serve.mjs')], { stdio: 'ignore', env: { ...process.env, PORT: new URL(BASE).port || '4173' } });
  for (let i = 0; i < 40; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {}
  }
  throw new Error(`server did not start at ${BASE}`);
}

async function open(browser, { width, height, touch = false, query = '', reducedMotion = 'no-preference', ready = true }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('response', (response) => response.status() >= 400 && problems.push(`${response.status()} ${response.url()}`));
  await page.goto(PAGE + query, { waitUntil: ready ? 'load' : 'domcontentloaded' });
  if (ready) await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'), null, { timeout: 15000 });
  return { context, page, problems };
}

const wait = (page, ms) => page.waitForTimeout(ms);
const shot = async (page, name) => SHOTS && page.screenshot({ path: path.join(OUT, `${name}.png`) });
const goTo = async (page, selector, offset = 120) => {
  await page.evaluate(([sel, off]) => {
    const element = document.querySelector(sel);
    window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - off, behavior: 'instant' });
  }, [selector, offset]);
  await wait(page, 1300);
};
/** Scroll to a fraction of a sticky track's travel: 0 is the moment its stage locks, 1 the moment it lets go. */
const toTrack = async (page, selector, fraction, settle = 1600) => {
  await page.evaluate(([sel, f]) => {
    const track = document.querySelector(sel);
    const top = track.getBoundingClientRect().top + scrollY;
    window.scrollTo({ top: top + Math.max(0, track.offsetHeight - innerHeight) * f, behavior: 'instant' });
  }, [selector, fraction]);
  await wait(page, settle);
};
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const activeCommunity = (page) => page.evaluate(() => document.querySelector('[data-gcard].is-active')?.dataset.community);
const activeVertical = (page) => page.evaluate(() => document.querySelector('[data-eco-row].is-active')?.dataset.verticalItem);
const toastText = (page) => page.evaluate(() => {
  const toast = document.querySelector('[data-toast]');
  return toast.classList.contains('is-visible') ? toast.textContent.trim() : '';
});
/** How far down the screen the visible content of a sticky stage reaches. */
const stageFits = (page, stage, inner) => page.evaluate(([s, i]) => {
  const box = document.querySelector(s).getBoundingClientRect();
  const deepest = Math.max(...[...document.querySelectorAll(i)].filter((el) => el.offsetParent && getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0.05).map((el) => el.getBoundingClientRect().bottom));
  return { top: Math.round(box.top), deepest: Math.round(deepest), limit: innerHeight };
}, [stage, inner]);

async function desktop(browser) {
  console.log('\nDesktop 1440 x 900');
  const { context, page, problems } = await open(browser, { width: 1440, height: 900 });
  await wait(page, 2400);
  await shot(page, 'desktop-hero');

  // Hero
  check('hero is a full-screen photograph with the proposition on it', await page.evaluate(() => {
    const hero = document.querySelector('.hero').getBoundingClientRect();
    const bg = document.querySelector('[data-hero-bg]');
    return hero.height >= innerHeight - 1 && bg.complete && bg.naturalWidth > 1000 && getComputedStyle(document.querySelector('.hero__title')).color === 'rgb(248, 246, 234)';
  }));
  check('headline, lede and both actions are on the first screen', await page.evaluate(() => [...document.querySelectorAll('.hero__title, .hero__lede, .hero__actions .btn')].every((element) => {
    const box = element.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= innerHeight && Number(getComputedStyle(element.closest('[data-hero-fade]') || element).opacity) > 0.95;
  })));
  check('the hero words have risen into place', await page.evaluate(() => [...document.querySelectorAll('.hero__word')].every((word) => Math.abs(word.getBoundingClientRect().top - word.parentElement.getBoundingClientRect().top - parseFloat(getComputedStyle(word.parentElement).paddingTop)) < 4)));
  check('the arch window has opened', await page.evaluate(() => /inset\(0(%|px)? /.test(getComputedStyle(document.querySelector('[data-hero-window]')).clipPath)));
  check('header is dark glass over the hero', await page.evaluate(() => !document.querySelector('[data-header]').classList.contains('is-solid')));
  const before = await page.evaluate(() => document.querySelector('[data-hero-window]').getBoundingClientRect().top);
  await page.evaluate(() => window.scrollTo({ top: innerHeight * 0.5, behavior: 'instant' }));
  await wait(page, 600);
  check('scrolling away parts the layers at different speeds', await page.evaluate((b) => {
    const frame = document.querySelector('[data-hero-window]').getBoundingClientRect().top;
    const title = document.querySelector('.hero__inner').getBoundingClientRect().top;
    return b - frame > innerHeight * 0.5 + 20 && Number(getComputedStyle(document.querySelector('.hero__inner')).opacity) < 0.8 && title < innerHeight;
  }, before));

  // Navigation
  await page.click('.primary-nav a[href="#services"]');
  await wait(page, 2400);
  check('nav link scrolls to its section', await page.evaluate(() => Math.abs(document.querySelector('#services').getBoundingClientRect().top) < 80));
  check('header turns light past the hero and marks the active section', await page.evaluate(() => document.querySelector('[data-header]').classList.contains('is-solid') && document.querySelector('[data-nav-item="services"]').classList.contains('is-current')));
  check('the nav is a full-width bar with a reading-progress hairline', await page.evaluate(() => {
    const bar = document.querySelector('.site-header').getBoundingClientRect();
    const p = parseFloat(getComputedStyle(document.querySelector('[data-header-progress]')).getPropertyValue('--p'));
    return bar.left === 0 && Math.abs(bar.width - document.documentElement.clientWidth) < 1 && p > 0.3 && p < 1;
  }));
  check('a red rule sits under the destination in view', await page.evaluate(() => {
    const rule = document.querySelector('[data-nav-indicator]').getBoundingClientRect();
    const item = document.querySelector('[data-nav-item="services"]').getBoundingClientRect();
    return Math.abs(rule.left - item.left) < 2 && Math.abs(rule.width - item.width) < 2 && getComputedStyle(document.querySelector('[data-nav-indicator]')).backgroundColor === 'rgb(150, 43, 35)';
  }));
  check('past the hero the nav floats as a capsule held off the edges', await page.evaluate(() => {
    const surface = getComputedStyle(document.querySelector('.site-header__bar'), '::before');
    return Number(surface.opacity) > 0.99 && parseFloat(surface.borderTopLeftRadius) > 20 && parseFloat(surface.top) > 4;
  }));
  check('the bar keeps exactly the same size and place when scrolled', await page.evaluate(async () => {
    const box = () => JSON.stringify(document.querySelector('.site-header__bar').getBoundingClientRect());
    const scrolled = box();
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 700));
    return box() === scrolled && !document.querySelector('[data-header]').classList.contains('is-solid');
  }));
  check('nothing in the nav is marked while the hero is on screen', await page.evaluate(() => !document.querySelector('.nav-item.is-current') && Number(document.querySelector('[data-nav-indicator]').style.getPropertyValue('--o') || 0) === 0 && Number(getComputedStyle(document.querySelector('.site-header__bar'), '::before').opacity) < 0.01));

  check('there is no floating section dock', await page.evaluate(() => !document.querySelector('[data-dock], .dock')));

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(page, 900);
  check('buttons carry a rolling label', await page.evaluate(() => document.querySelectorAll('.btn .roll__inner').length > 5));
  check('pointer follower is active for mouse users', await page.evaluate(() => document.documentElement.classList.contains('has-cursor')));
  await page.click('.hero__actions a[href="#find"]');
  await wait(page, 2400);
  check('hero "Find a Home" scrolls to the search', await page.evaluate(() => document.querySelector('#find').getBoundingClientRect().top < 120));

  check('no horizontal overflow', (await overflow(page)) === 0, await overflow(page));
  const broken = await page.evaluate(() => [...document.images].filter((image) => image.complete && !image.naturalWidth && image.getAttribute('src')).map((image) => image.getAttribute('src')));
  check('no broken images', broken.length === 0, broken);
  check('no console errors or failed requests', problems.length === 0, problems);
  await context.close();
}

async function opening(browser) {
  console.log('\nOpening (no loader)');
  const { context, page } = await open(browser, { width: 1440, height: 900, ready: false });
  check('there is no loading screen', await page.evaluate(() => !document.querySelector('[data-intro]') && !document.documentElement.classList.contains('is-locked')));
  const textAtOnce = await page.evaluate(() => document.querySelector('.hero__title').textContent.replace(/\s+/g, ' ').trim());
  check('the headline is in the page from the first paint', textAtOnce === 'Curated Community Living', textAtOnce);
  await wait(page, 1600);
  check('the headline has risen within a second and a half', await page.evaluate(() => [...document.querySelectorAll('.hero__word')].every((word) => {
    const offset = word.getBoundingClientRect().top - word.parentElement.getBoundingClientRect().top - parseFloat(getComputedStyle(word.parentElement).paddingTop);
    return offset < word.offsetHeight * 0.1;
  })));
  check('the proposition and actions are visible by then', await page.evaluate(() => [...document.querySelectorAll('[data-hero-fade]')].every((el) => Number(getComputedStyle(el).opacity) > 0.9)));
  await shot(page, 'opening');
  await context.close();
}

async function laptop(browser) {
  for (const [width, height] of [[1440, 900], [1536, 730], [1366, 768], [1280, 800]]) {
    console.log(`\nScreen ${width} x ${height}`);
    const { context, page, problems } = await open(browser, { width, height });
    await wait(page, 1500);
    check(`${width}: hero headline and actions fit the first screen`, await page.evaluate(() => [...document.querySelectorAll('.hero__title, .hero__actions .btn')].every((el) => el.getBoundingClientRect().bottom <= innerHeight - 40)));
    await goTo(page, '#find', 0);
    const findFold = await page.evaluate(() => {
      const section = document.querySelector('#find').getBoundingClientRect();
      const deepest = Math.max(...[...document.querySelectorAll('.find__intro, .qrow, .search__submit, .search__quick > *')].map((el) => el.getBoundingClientRect().bottom));
      return { top: Math.round(section.top), height: Math.round(section.height), deepest: Math.round(deepest), limit: innerHeight };
    });
    check(`${width}: Find a Home sits on one screen, quick starts included`, Math.abs(findFold.top) < 2 && findFold.height <= findFold.limit + 1 && findFold.deepest <= findFold.limit, findFold);
    await shot(page, `laptop-${width}-find`);
    await toTrack(page, '[data-story]', 0.3);
    const story = await stageFits(page, '[data-story-stage]', '[data-tenet].is-active *');
    check(`${width}: philosophy chapter fits one screen`, story.deepest <= story.limit, story);
    for (const fraction of [0.2, 0.5, 0.8]) {
      await toTrack(page, '[data-gallery-track]', fraction);
      const fit = await stageFits(page, '[data-gallery-stage]', '[data-gcard] .gcard__actions > *, [data-gcard] .gcard__media');
      check(`${width}: gallery cards fit the screen at ${fraction}`, fit.deepest <= fit.limit - 8, fit);
    }
    await shot(page, `laptop-${width}-gallery`);
    await toTrack(page, '[data-eco-track]', 0.3);
    const eco = await stageFits(page, '[data-eco-stage]', '[data-eco-stage] .eco__left *, [data-eco-frame]');
    check(`${width}: ecosystem fits one screen`, eco.deepest <= eco.limit, eco);
    await shot(page, `laptop-${width}-ecosystem`);
    check(`${width}: no horizontal overflow`, (await overflow(page)) === 0, await overflow(page));
    check(`${width}: no console errors`, problems.length === 0, problems);
    await context.close();
  }
}

async function phone(browser) {
  console.log('\nPhone 390 x 844 (touch)');
  const { context, page, problems } = await open(browser, { width: 390, height: 844, touch: true });
  await wait(page, 2200);
  await shot(page, 'phone-hero');
  check('phone: headline and both buttons fit on the first screen', await page.evaluate(() => [...document.querySelectorAll('.hero__title, .hero__actions .btn')].every((element) => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight; })));
  check('phone: the eyebrow sits clear of the arch window', await page.evaluate(() => document.querySelector('.hero__eyebrow').getBoundingClientRect().right <= document.querySelector('[data-hero-window]').getBoundingClientRect().left + 1 || document.querySelector('.hero__eyebrow').getBoundingClientRect().top > document.querySelector('[data-hero-window]').getBoundingClientRect().bottom));
  check('desktop navigation is replaced by the menu button', await page.evaluate(() => getComputedStyle(document.querySelector('.primary-nav')).display === 'none' && getComputedStyle(document.querySelector('[data-menu-toggle]')).display !== 'none'));
  await page.tap('[data-menu-toggle]');
  await wait(page, 1500);
  check('full-screen menu opens and locks the page', await page.evaluate(() => !document.querySelector('[data-mobile-menu]').hidden && document.documentElement.classList.contains('is-locked') && document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded') === 'true'));
  await shot(page, 'phone-menu');
  await page.tap('.mobile-menu__link[href="#communities"]');
  await wait(page, 2400);
  check('menu link closes the menu and scrolls', await page.evaluate(() => document.querySelector('[data-mobile-menu]').hidden && Math.abs(document.querySelector('#communities').getBoundingClientRect().top) < 90 && !document.documentElement.classList.contains('is-locked')));

  await toTrack(page, '[data-story]', 0.5);
  await shot(page, 'phone-story');
  check('philosophy pins on a phone, word clear of its photograph', await page.evaluate(() => { const t = document.querySelector('[data-tenet].is-active'); const w = t.querySelector('.tenet__word, .whole__line').getBoundingClientRect(); const ph = t.querySelector('.tenet__photo').getBoundingClientRect(); return Math.abs(document.querySelector('[data-story-stage]').getBoundingClientRect().top) < 2 && w.right <= innerWidth && (ph.height === 0 || ph.bottom <= w.top + 1); }));

  await goTo(page, '#communities', 0);
  await shot(page, 'phone-communities');
  check('communities are a native swipe rail on a phone, not pinned', await page.evaluate(() => {
    const viewport = document.querySelector('[data-gallery-viewport]');
    const style = getComputedStyle(viewport);
    return style.overflowX === 'auto' && style.scrollSnapType.startsWith('x') && viewport.scrollWidth > viewport.clientWidth * 3 && document.querySelector('[data-gallery-track]').offsetHeight < innerHeight * 1.3;
  }));
  await page.evaluate(() => { const v = document.querySelector('[data-gallery-viewport]'); const card = document.querySelector('#place-al-bateen-marina'); v.scrollTo({ left: card.offsetLeft - (v.clientWidth - card.offsetWidth) / 2, behavior: 'instant' }); });
  await wait(page, 900);
  check('swiping the rail moves the counter and progress', (await activeCommunity(page)) === 'al-bateen-marina' && (await page.textContent('[data-gallery-now]')) === '03');
  await page.tap('[data-gallery-next]');
  await wait(page, 1400);
  check('next button scrolls the rail on a phone', (await activeCommunity(page)) === 'jumeirah-village-circle', await activeCommunity(page));

  await goTo(page, '[data-search]', 90);
  await page.tap('.mode__option:has(input[value="rent"])');
  await page.tap('#button-community');
  await wait(page, 500);
  await page.tap('#community-jumeirah-village-circle');
  await page.tap('.beds__chip:has(input[value="1"])');
  await shot(page, 'phone-search');
  await page.tap('[data-search-submit]');
  await wait(page, 1900);
  check('search works by touch', (await page.textContent('[data-result-summary]')) === 'Homes to rent in Jumeirah Village Circle, 1 bedroom', await page.textContent('[data-result-summary]'));
  const devs = await page.textContent('.search-result__devs');
  check('result names that community\'s developments', devs === 'Bloom developments in Jumeirah Village Circle: Bloom Towers, Bloom Heights', devs);

  await goTo(page, '#ecosystem', 0);
  await shot(page, 'phone-ecosystem');
  check('on a phone every business shows its photograph and words', await page.evaluate(() => [...document.querySelectorAll('[data-eco-row]')].every((row) => row.querySelector('.eco-row__media').getBoundingClientRect().height > 150 && getComputedStyle(row.querySelector('.eco-row__detail')).visibility === 'visible')));

  await toTrack(page, '[data-life-track]', 0.4);
  await shot(page, 'phone-life');
  check('life stage pins on a phone', await page.evaluate(() => Math.abs(document.querySelector('[data-life-stage]').getBoundingClientRect().top) < 2));

  await goTo(page, '#services', 0);
  await wait(page, 1600);
  await shot(page, 'phone-services');
  check('pathways stack as full-width rows on a phone', await page.evaluate(() => [...document.querySelectorAll('.path__row')].every((row) => { const b = row.getBoundingClientRect(); return b.width >= innerWidth - 60 && b.right <= innerWidth; })));
  check('header stays on screen while scrolling on a phone', await page.evaluate(() => document.querySelector('.site-header__bar').getBoundingClientRect().top >= 0));
  await page.tap('.site-header__enquire');
  await wait(page, 1000);
  check('enquiry opens as a bottom sheet', await page.evaluate(() => {
    const box = document.querySelector('[data-enquiry]').getBoundingClientRect();
    return document.querySelector('[data-enquiry]').open && Math.abs(box.bottom - window.innerHeight) < 2 && box.width === window.innerWidth;
  }));
  await page.tap('.enquiry__close');
  await wait(page, 900);

  await goTo(page, '[data-figures]', 200);
  await wait(page, 2600);
  await shot(page, 'phone-figures');
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await wait(page, 1500);
  await shot(page, 'phone-footer');

  const small = await page.evaluate(() => [...document.querySelectorAll('a, button, label.beds__chip, label.mode__option')].filter((element) => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && (box.height < 40 || box.width < 40) && getComputedStyle(element).visibility === 'visible' && !element.closest('[hidden]');
  }).map((element) => `${element.className || element.tagName} ${Math.round(element.getBoundingClientRect().width)}x${Math.round(element.getBoundingClientRect().height)}`));
  check('touch targets are at least 40px', small.length === 0, small.slice(0, 12));
  check('no horizontal overflow', (await overflow(page)) === 0, await overflow(page));
  check('no console errors or failed requests', problems.length === 0, problems);
  await context.close();
}

async function tablet(browser) {
  console.log('\nTablet 834 x 1112 (touch)');
  const { context, page, problems } = await open(browser, { width: 834, height: 1112, touch: true });
  await shot(page, 'tablet-hero');
  for (const id of ['story', 'find', 'communities', 'ecosystem', 'life', 'about', 'services', 'footer']) {
    await goTo(page, `#${id}`, 0);
    await shot(page, `tablet-${id}`);
  }
  await toTrack(page, '[data-story]', 0.5);
  check('philosophy word fits the tablet screen', await page.evaluate(() => { const w = document.querySelector('[data-tenet].is-active .tenet__word, [data-tenet].is-active .whole__line').getBoundingClientRect(); return w.width > innerWidth * 0.35 && w.right <= innerWidth; }));
  check('communities swipe natively on a tablet', await page.evaluate(() => getComputedStyle(document.querySelector('[data-gallery-viewport]')).overflowX === 'auto'));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(page, 800);
  await page.tap('[data-menu-toggle]');
  await wait(page, 1300);
  check('menu opens on a tablet', await page.evaluate(() => !document.querySelector('[data-mobile-menu]').hidden));
  await page.keyboard.press('Escape');
  await wait(page, 900);
  check('no horizontal overflow', (await overflow(page)) === 0, await overflow(page));
  check('no console errors or failed requests', problems.length === 0, problems);
  await context.close();
}

async function reducedMotion(browser) {
  console.log('\nReduced motion');
  const { context, page, problems } = await open(browser, { width: 1280, height: 800, reducedMotion: 'reduce' });
  check('animated mode is off', await page.evaluate(() => !document.documentElement.classList.contains('motion')));
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal], [data-split], .hero__word, [data-hero-fade], .tenet__word, .whole__word, [data-tenet-line], [data-tenet-photo], .gcard, .eco-row, .lshot, .life__open-copy > *, .figure__value, .path, .closing__title')].filter((element) => {
    const style = getComputedStyle(element);
    return style.visibility === 'hidden' || Number(style.opacity) < 0.99;
  }).map((el) => el.className));
  check('all content is visible without animation', hidden.length === 0, hidden.slice(0, 8));
  check('no section is pinned or scroll-jacked', await page.evaluate(() => ['[data-story-stage]', '[data-gallery-stage]', '[data-eco-stage]', '[data-life-stage]', '.closing__stage'].every((sel) => getComputedStyle(document.querySelector(sel)).position !== 'sticky')));
  await goTo(page, '[data-search]', 200);
  await page.click('[data-search-submit]');
  await wait(page, 400);
  check('search still works', (await page.textContent('[data-result-summary]')) === 'Homes to buy across all Bloom communities');
  await goTo(page, '#ecosystem', 0);
  await page.click('#panel-landscaping .eco-row__head');
  await wait(page, 300);
  check('ecosystem still selects by click', (await activeVertical(page)) === 'landscaping' && await page.evaluate(() => document.querySelector('[data-eco-img="landscaping"]').classList.contains('is-active')));
  await goTo(page, '#communities', 0);
  await page.click('[data-gallery-next]');
  await wait(page, 500);
  check('gallery still moves with its buttons', (await activeCommunity(page)) !== 'zayed-city', await activeCommunity(page));
  check('no console errors or failed requests', problems.length === 0, problems);
  await context.close();
}

/**
 * No text is cut off: for every visible line of text, its glyph box (which for Playfair includes
 * the descenders of g and y) must sit inside every clipping ancestor it overlaps. Sideways cuts
 * in the communities rail are its intended edges; Life at Bloom captions drift through the stage
 * edge on purpose.
 */
const scanClipping = () => {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent.trim()) continue;
    const el = node.parentElement;
    if (!el || el.closest('[aria-hidden="true"], script, style, [hidden], dialog:not([open]), .sr-only, .cursor, .lshot')) continue;
    let hidden = false;
    for (let a = el; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) { hidden = true; break; }
    }
    if (hidden) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      // Up to and including <body>, which clips anything pushed past the right edge of the page.
      for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        const b = a.getBoundingClientRect();
        if (!(r.right > b.left && r.left < b.right && r.bottom > b.top && r.top < b.bottom)) break;
        const sideways = a.closest('[data-gallery-viewport]') ? 0 : Math.max(r.right - b.right, b.left - r.left);
        const cut = Math.max(r.bottom - b.bottom, b.top - r.top, sideways);
        if (cut > 1.5) out.push(`${node.textContent.trim().slice(0, 24)} (${Math.round(cut)}px, ${String(a.className).slice(0, 24)})`);
        break;
      }
    }
  }
  return out;
};

async function clipping(browser) {
  for (const [width, height, touch] of [[1440, 900], [1536, 730], [1366, 768], [1280, 800], [834, 1112, true], [390, 844, true]]) {
    console.log(`\nClipping ${width} x ${height}`);
    const { context, page } = await open(browser, { width, height, touch });
    await wait(page, 2200);
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const cut = new Set();
    for (let y = 0; y < total; y += Math.round(height * 0.45)) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await wait(page, 1300);
      (await page.evaluate(scanClipping)).forEach((item) => cut.add(item));
    }
    check(`${width}: no text or button is cut off anywhere on the page`, cut.size === 0, [...cut].slice(0, 8));
    await context.close();
  }
}

(async () => {
  await ensureServer();
  if (SHOTS) fs.mkdirSync(OUT, { recursive: true });
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: 'localhost,127.0.0.1' } } : {});
  try {
    const only = process.argv[2];
    const suites = { desktop, opening, laptop, phone, tablet, reducedMotion, clipping };
    for (const [name, suite] of Object.entries(suites)) {
      if (!only || only === name) await suite(browser);
    }
  } finally {
    await browser.close();
    server?.kill();
  }
  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length} of ${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  server?.kill();
  process.exit(1);
});
