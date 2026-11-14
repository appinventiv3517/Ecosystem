// Browser check for the homepage prototype: loads the page at desktop, laptop, tablet and phone
// sizes, exercises every interaction in the brief and reports what passed.
//
//   node tests/check.cjs              all suites
//   node tests/check.cjs desktop      one suite: desktop, opening, laptop, phone, tablet, reducedMotion
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
/** Everything visible inside a sticky stage ends above the dock at the foot of the screen. */
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
  check('the hero words have risen into place', await page.evaluate(() => [...document.querySelectorAll('.hero__word')].every((word) => Math.abs(word.getBoundingClientRect().top - word.parentElement.getBoundingClientRect().top) < 4)));
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
  check('section dock appears and its arch fills with progress', await page.evaluate(() => document.querySelector('[data-dock]').classList.contains('is-visible') && parseFloat(getComputedStyle(document.querySelector('[data-dock-progress]')).getPropertyValue('--progress')) > 0.3));
  check('dock names the current section', (await page.textContent('[data-dock-name]')).replace(/ /g, ' ') === 'Customer Services', await page.textContent('[data-dock-name]'));
  check('header floats as a capsule', await page.evaluate(() => getComputedStyle(document.querySelector('.site-header__bar')).borderRadius === '999px'));

  // Mega menu
  await page.hover('[data-nav-item="communities"] .nav-item__link');
  await wait(page, 900);
  check('mega menu opens on hover', await page.evaluate(() => document.querySelector('[data-mega]').classList.contains('is-open') && !document.querySelector('#mega-communities').hidden));
  await shot(page, 'desktop-mega');
  await page.click('#mega-communities a[data-community-jump="al-bateen-marina"]');
  await wait(page, 3200);
  check('mega link brings that community to the centre of the gallery', (await activeCommunity(page)) === 'al-bateen-marina', await activeCommunity(page));
  check('mega menu closes after navigating', await page.evaluate(() => !document.querySelector('[data-mega]').classList.contains('is-open')));
  await page.mouse.move(700, 600);
  await page.focus('[data-nav-item="about"] .nav-item__toggle');
  await page.keyboard.press('Enter');
  await wait(page, 700);
  check('mega menu opens from the keyboard and moves focus inside', await page.evaluate(() => !document.querySelector('#mega-about').hidden && document.querySelector('#mega-about').contains(document.activeElement)));
  await page.keyboard.press('Escape');
  await wait(page, 700);
  check('Escape closes the mega menu and returns focus', await page.evaluate(() => !document.querySelector('[data-mega]').classList.contains('is-open') && document.activeElement.classList.contains('nav-item__toggle')));

  // Brand story
  await toTrack(page, '[data-story]', 0.02);
  await shot(page, 'desktop-story-1');
  check('story stage holds still on one screen', await page.evaluate(() => Math.abs(document.querySelector('[data-story-stage]').getBoundingClientRect().top) < 2));
  check('story opens on its first chapter and word', await page.evaluate(() => document.querySelectorAll('[data-story-text]')[0].classList.contains('is-active') && Number(getComputedStyle(document.querySelectorAll('[data-story-word]')[0]).opacity) > 0.95 && Number(getComputedStyle(document.querySelectorAll('[data-story-word]')[2]).opacity) < 0.5));
  await toTrack(page, '[data-story]', 0.55);
  await shot(page, 'desktop-story-2');
  check('scrolling wipes in the next photograph and changes the copy', await page.evaluate(() => {
    const index = [...document.querySelectorAll('[data-story-text]')].findIndex((text) => text.classList.contains('is-active'));
    return index >= 1 && getComputedStyle(document.querySelectorAll('[data-story-shot]')[index]).clipPath.startsWith('inset(0');
  }));
  check('the frame changes shape between chapters', await page.evaluate(() => getComputedStyle(document.querySelector('[data-story-frame]')).clipPath.includes('round')));
  await toTrack(page, '[data-story]', 0.99);
  check('the last chapter lights the whole proposition', await page.evaluate(() => document.querySelectorAll('[data-story-text]')[3].classList.contains('is-active') && [...document.querySelectorAll('[data-story-word]')].every((word) => Number(getComputedStyle(word).opacity) > 0.95)));
  check('only one line of story copy is visible at a time', await page.evaluate(() => [...document.querySelectorAll('[data-story-text]')].filter((text) => Number(getComputedStyle(text).opacity) > 0.05).length === 1));

  // Find a Home
  await goTo(page, '[data-search]', 260);
  await page.click('.mode__option:has(input[value="rent"])');
  await wait(page, 1300);
  check('Buy / Rent switch updates the search', await page.evaluate(() => document.querySelector('[data-search-label]').textContent === 'Search homes to rent' && !document.querySelector('[data-mode-copy="rent"]').hidden && document.querySelector('[data-mode-word]').textContent === 'Rent'));
  await page.click('#button-community');
  await wait(page, 500);
  await shot(page, 'desktop-search-dropdown');
  await page.click('#community-al-bateen-marina');
  await wait(page, 400);
  check('community dropdown selects with the mouse', await page.evaluate(() => document.querySelector('#value-community').textContent === 'Al Bateen Marina'));
  await page.focus('#button-type');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await wait(page, 400);
  check('property type dropdown selects with the keyboard', await page.evaluate(() => document.querySelector('#value-type').textContent === 'Apartment' && document.activeElement.id === 'button-type'));
  await page.click('.beds__chip:has(input[value="2"])');
  await page.click('[data-search-submit]');
  await wait(page, 1700);
  const summary = await page.textContent('[data-result-summary]');
  check('search shows a demo result that reflects the choices', summary === 'Apartments to rent in Al Bateen Marina, 2 bedrooms', summary);
  check('result lists the verified developments', (await page.textContent('.search-result__devs')).includes('Bloom Marina'));
  await shot(page, 'desktop-search-result');
  await page.click('.search-result__next .btn >> nth=0');
  await wait(page, 3000);
  check('result links through to the community', (await activeCommunity(page)) === 'al-bateen-marina', await activeCommunity(page));
  await goTo(page, '[data-search]', 260);
  await page.click('.search__quick .chip >> nth=0');
  await wait(page, 2000);
  check('quick start fills and runs the search', (await page.textContent('[data-result-summary]')) === 'Villas to buy in Zayed City');
  await page.click('[data-search-close]');
  await wait(page, 900);

  // Communities gallery
  await toTrack(page, '[data-gallery-track]', 0);
  await shot(page, 'desktop-gallery-start');
  check('gallery holds still and starts at the first community', await page.evaluate(() => Math.abs(document.querySelector('[data-gallery-stage]').getBoundingClientRect().top) < 2) && (await activeCommunity(page)) === 'zayed-city', await activeCommunity(page));
  await toTrack(page, '[data-gallery-track]', 0.55);
  await shot(page, 'desktop-gallery-mid');
  check('scrolling slides the rail sideways through the communities', await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('[data-gallery-rail]')).transform).m41 < -600) && ['al-bateen-marina', 'jumeirah-village-circle'].includes(await activeCommunity(page)), await activeCommunity(page));
  check('the card in focus is full size and the others are smaller', await page.evaluate(() => [...document.querySelectorAll('[data-gcard]')].every((card) => {
    const scale = new DOMMatrix(getComputedStyle(card.querySelector('.gcard__media')).transform).a;
    return card.classList.contains('is-active') ? scale > 0.99 : scale < 0.99;
  })));
  check('progress bar and counter follow the gallery', await page.evaluate(() => {
    const p = parseFloat(getComputedStyle(document.querySelector('[data-gallery-fill]')).getPropertyValue('--p'));
    return p > 0.3 && p < 0.8 && document.querySelector('[data-gallery-now]').textContent === String([...document.querySelectorAll('[data-gcard]')].findIndex((c) => c.classList.contains('is-active')) + 1).padStart(2, '0');
  }));
  check('the photograph shifts inside its frame as the card travels', await page.evaluate(() => new Set([...document.querySelectorAll('[data-gcard-img]')].map((img) => img.style.getPropertyValue('--shift'))).size >= 3));
  check('every card\'s text and buttons sit on screen, clear of the dock', await page.evaluate(() => [...document.querySelectorAll('[data-gcard].is-active .gcard__actions')].every((a) => a.getBoundingClientRect().bottom <= innerHeight - 70)));
  let from = await activeCommunity(page);
  const order = ['zayed-city', 'saadiyat-island', 'al-bateen-marina', 'jumeirah-village-circle', 'eastern-mangrove-corniche'];
  await page.click('[data-gallery-next]');
  await wait(page, 2400);
  check('next button moves to the next community', (await activeCommunity(page)) === order[order.indexOf(from) + 1], { from, now: await activeCommunity(page) });
  from = await activeCommunity(page);
  await page.focus('[data-gallery-viewport]');
  await page.keyboard.press('ArrowLeft');
  await wait(page, 2400);
  check('gallery responds to arrow keys', (await activeCommunity(page)) === order[order.indexOf(from) - 1], { from, now: await activeCommunity(page) });
  const scrollBefore = await page.evaluate(() => scrollY);
  await page.mouse.move(1100, 420);
  await page.mouse.down();
  await page.mouse.move(900, 422, { steps: 6 });
  await page.mouse.move(600, 425, { steps: 6 });
  await page.mouse.up();
  await wait(page, 1200);
  check('dragging the gallery moves it along', (await page.evaluate(() => scrollY)) - scrollBefore > 300);
  await page.click('[data-gcard].is-active [data-find]');
  await wait(page, 2200);
  check('"Find a home" carries the community into the search', await page.evaluate(() => document.querySelector('[data-select="community"] input').value !== '' && document.querySelector('#find').getBoundingClientRect().top < innerHeight * 0.5));
  await toTrack(page, '[data-gallery-track]', 1);
  check('the rail ends on its closing panel', await page.evaluate(() => { const box = document.querySelector('.gallery__end').getBoundingClientRect(); return box.right <= innerWidth + 1 && box.left > innerWidth * 0.4; }));

  // Ecosystem
  await toTrack(page, '[data-eco-track]', 0.02);
  await shot(page, 'desktop-ecosystem-1');
  check('ecosystem holds still and starts on Real Estate', await page.evaluate(() => Math.abs(document.querySelector('[data-eco-stage]').getBoundingClientRect().top) < 2) && (await activeVertical(page)) === 'real-estate');
  const ecoFit = await stageFits(page, '[data-eco-stage]', '[data-eco-stage] .eco__left *, [data-eco-frame]');
  check('the seven businesses and the photograph fit one laptop screen', ecoFit.deepest <= ecoFit.limit - 4, ecoFit);
  check('all seven businesses are listed and numbered', await page.evaluate(() => [...document.querySelectorAll('.eco-row__num')].map((n) => n.textContent).join(' ') === '01 02 03 04 05 06 07'));
  await toTrack(page, '[data-eco-track]', 0.5);
  await shot(page, 'desktop-ecosystem-2');
  check('scrolling moves the selection down the list', (await activeVertical(page)) === 'retail', await activeVertical(page));
  check('the photograph, details and counter follow the selection', await page.evaluate(() => {
    const image = document.querySelector('[data-eco-img="retail"]');
    const detail = document.querySelector('#eco-detail-retail');
    return image.classList.contains('is-active') && Number(getComputedStyle(image).opacity) > 0.95 && Number(getComputedStyle(detail).opacity) > 0.95 && document.querySelector('[data-eco-num]').textContent === '04';
  }));
  check('a wire joins the selected business to the photograph', await page.evaluate(() => {
    const d = document.querySelector('[data-eco-wire-path]').getAttribute('d');
    const head = document.querySelector('#panel-retail .eco-row__head').getBoundingClientRect();
    const stage = document.querySelector('[data-eco-stage]').getBoundingClientRect();
    const y = Number(d.split(' ')[1]);
    return d.startsWith('M') && Math.abs(stage.top + y - (head.top + head.height / 2)) < 3;
  }));
  check('the orbit turns to the business and the ground colour changes', await page.evaluate(() => {
    const dots = [...document.querySelectorAll('.eco__orbit-dot')];
    return dots[3].classList.contains('is-on') && dots.filter((d) => d.classList.contains('is-on')).length === 1 && getComputedStyle(document.querySelector('[data-eco]')).getPropertyValue('--eco-bg').trim() === '#22150F';
  }));
  await page.click('#panel-landscaping .eco-row__head');
  await wait(page, 2600);
  check('clicking a business scrolls to it and selects it', (await activeVertical(page)) === 'landscaping' && await page.evaluate(() => Math.abs(document.querySelector('[data-eco-stage]').getBoundingClientRect().top) < 2));

  // Life at Bloom
  await toTrack(page, '[data-life-track]', 0.15);
  await shot(page, 'desktop-life-1');
  check('life stage holds still with the headline in the middle', await page.evaluate(() => {
    const title = document.querySelector('.life__title').getBoundingClientRect();
    return Math.abs(document.querySelector('[data-life-stage]').getBoundingClientRect().top) < 2 && title.top > innerHeight * 0.2 && title.bottom < innerHeight * 0.8;
  }));
  check('six photographs from across Bloom drift past at different depths', await page.evaluate(() => {
    const shots = [...document.querySelectorAll('[data-lshot]')];
    return shots.length === 6 && new Set(shots.map((s) => Math.round(new DOMMatrix(getComputedStyle(s).transform).m42))).size === 6;
  }));
  await toTrack(page, '[data-life-track]', 1, 2000);
  await shot(page, 'desktop-life-2');
  check('the last frame opens to fill the screen with its closing line', await page.evaluate(() => {
    const clip = getComputedStyle(document.querySelector('[data-life-open]')).clipPath;
    return /^inset\(0(px|%)?( 0(px|%)?)*( round 0px)?\)$/.test(clip.replace(/\s+/g, ' ')) && Number(getComputedStyle(document.querySelector('.life__open-title')).opacity) > 0.95;
  }));

  // Figures
  await goTo(page, '[data-figures]', 300);
  await wait(page, 3200);
  const numbers = await page.evaluate(() => [...document.querySelectorAll('.figure__value')].map((item) => item.textContent.trim()));
  check('figures count up to the RFP values', numbers.join(' ') === '25,000+ 6,500+ 1,000+ 15 20,000+ 851 8,500+', numbers);
  await shot(page, 'desktop-figures');
  await page.click('.impact__aside .btn');
  await wait(page, 400);
  check('About Bloom call to action gives demo feedback', (await toastText(page)).includes('About Bloom'));

  // Customer services
  await goTo(page, '#services', 0);
  await wait(page, 1200);
  await shot(page, 'desktop-services');
  check('six numbered pathways', await page.evaluate(() => document.querySelectorAll('[data-path]').length === 6));
  await page.hover('#service-super-app .path__row');
  await page.mouse.move(700, await page.evaluate(() => { const b = document.querySelector('#service-super-app').getBoundingClientRect(); return b.top + b.height / 2 + 4; }), { steps: 4 });
  await wait(page, 800);
  check('pointing at an app shows its screenshot by the pointer', await page.evaluate(() => document.querySelector('[data-path-preview]').classList.contains('is-visible') && document.querySelector('[data-path-preview] img').getAttribute('src').includes('super-app')));
  await shot(page, 'desktop-services-hover');
  await page.click('#service-community-app .path__row');
  await wait(page, 500);
  check('an app pathway opens its app (explained in the prototype)', (await toastText(page)).includes('Bloom Community App'));
  await page.click('#service-enquiry .path__row');
  await wait(page, 900);
  check('"Make an enquiry" opens the enquiry panel', await page.evaluate(() => document.querySelector('[data-enquiry]').open && document.querySelector('input[name="interest"][value="support"]').checked));

  // Enquiry
  await page.click('.enquiry__submit');
  await wait(page, 300);
  check('enquiry form validates required fields', await page.evaluate(() => !document.querySelector('#enquiry-name-error').hidden && !document.querySelector('#enquiry-email-error').hidden && document.activeElement.id === 'enquiry-name'));
  await page.fill('#enquiry-name', 'Test Visitor');
  await page.fill('#enquiry-email', 'visitor@example.com');
  await shot(page, 'desktop-enquiry');
  await page.click('.enquiry__submit');
  await wait(page, 500);
  check('enquiry confirms without sending anything', await page.evaluate(() => !document.querySelector('[data-enquiry-done]').hidden && document.querySelector('[data-enquiry-done]').textContent.includes('Thank you, Test')));
  await page.keyboard.press('Escape');
  await wait(page, 900);
  check('Escape closes the enquiry panel', await page.evaluate(() => !document.querySelector('[data-enquiry]').open && !document.documentElement.classList.contains('is-locked')));
  await page.click('.site-header__enquire');
  await wait(page, 800);
  check('header Enquire button opens the panel', await page.evaluate(() => document.querySelector('[data-enquiry]').open));
  await page.click('.enquiry__close');
  await wait(page, 900);

  // Menu link into a service
  await page.hover('[data-nav-item="services"] .nav-item__link');
  await wait(page, 800);
  await page.click('#mega-services a[data-service-jump="construction-updates"]');
  await wait(page, 1500);
  check('menu link brings its pathway forward', await page.evaluate(() => { const path = document.querySelector('#service-construction-updates'); const box = path.getBoundingClientRect(); return path.classList.contains('is-called') && box.top > 0 && box.bottom < innerHeight; }));

  // Closing and footer
  await toTrack(page, '[data-closing]', 1, 1800);
  await shot(page, 'desktop-closing');
  check('the closing photograph opens to the whole screen behind the enquiry', await page.evaluate(() => {
    const box = document.querySelector('[data-closing-window]').getBoundingClientRect();
    return getComputedStyle(document.querySelector('[data-closing-window]')).clipPath.replace(/\s+/g, ' ').startsWith('inset(0') && box.width >= innerWidth - 1 && document.querySelector('.closing__title').getBoundingClientRect().bottom < innerHeight;
  }));
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await wait(page, 1800);
  await shot(page, 'desktop-footer');
  check('the footer ends on the Bloom wordmark at its own size', await page.evaluate(() => { const mark = document.querySelector('[data-footer-mark] img'); return mark.getBoundingClientRect().width <= 762 && mark.naturalWidth === 762; }));
  await page.click('.lang--footer [data-lang-option="ar"]');
  await wait(page, 400);
  check('language switch explains Arabic is out of scope', (await toastText(page)).includes('Arabic'));
  await page.click('.footer__link[data-vertical-jump="education"]');
  await wait(page, 3200);
  check('footer business link selects it in the ecosystem', (await activeVertical(page)) === 'education', await activeVertical(page));
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await wait(page, 900);
  await page.click('.footer__top');
  await wait(page, 4000);
  check('back to top returns to the hero', (await page.evaluate(() => window.scrollY)) < 5);

  // The nav stays on screen however you scroll
  await goTo(page, '#about', 0);
  await page.mouse.move(700, 600);
  await page.mouse.wheel(0, 500);
  await wait(page, 900);
  check('nav stays fully visible while scrolling down', await page.evaluate(() => {
    const bar = document.querySelector('.site-header__bar').getBoundingClientRect();
    return bar.top >= 0 && bar.bottom > 0 && getComputedStyle(document.querySelector('.primary-nav')).display !== 'none';
  }));
  check('capsule hugs its contents in the middle of the screen', await page.evaluate(() => { const b = document.querySelector('.site-header__bar').getBoundingClientRect(); return b.width < innerWidth * 0.85 && Math.abs(b.left + b.width / 2 - innerWidth / 2) < 3; }));

  // Section dock
  await page.click('[data-dock-toggle]');
  await wait(page, 600);
  check('dock opens a list of sections', await page.evaluate(() => !document.querySelector('[data-dock-list]').hidden && document.querySelector('[data-dock-toggle]').getAttribute('aria-expanded') === 'true'));
  await page.click('[data-dock-link="life"]');
  await wait(page, 2600);
  check('dock link jumps to its section', await page.evaluate(() => Math.abs(document.querySelector('#life').getBoundingClientRect().top) < 90 && document.querySelector('[data-dock-list]').hidden));

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
    const offset = word.getBoundingClientRect().top - word.parentElement.getBoundingClientRect().top;
    return offset < word.offsetHeight * 0.1;
  })));
  check('the proposition and actions are visible by then', await page.evaluate(() => [...document.querySelectorAll('[data-hero-fade]')].every((el) => Number(getComputedStyle(el).opacity) > 0.9)));
  await shot(page, 'opening');
  await context.close();
}

async function laptop(browser) {
  for (const [width, height] of [[1366, 768], [1280, 800]]) {
    console.log(`\nLaptop ${width} x ${height}`);
    const { context, page, problems } = await open(browser, { width, height });
    await wait(page, 1500);
    check(`${width}: hero headline and actions fit the first screen`, await page.evaluate(() => [...document.querySelectorAll('.hero__title, .hero__actions .btn')].every((el) => el.getBoundingClientRect().bottom <= innerHeight - 40)));
    await toTrack(page, '[data-story]', 0.3);
    const story = await stageFits(page, '[data-story-stage]', '.story__copy *, [data-story-frame]');
    check(`${width}: story fits one screen`, story.deepest <= story.limit, story);
    for (const fraction of [0.2, 0.5, 0.8]) {
      await toTrack(page, '[data-gallery-track]', fraction);
      const fit = await stageFits(page, '[data-gallery-stage]', '[data-gcard] .gcard__actions > *, [data-gcard] .gcard__media');
      check(`${width}: gallery cards clear the dock at ${fraction}`, fit.deepest <= fit.limit - 64, fit);
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
  check('story pins on a phone with the frame below the words', await page.evaluate(() => Math.abs(document.querySelector('[data-story-stage]').getBoundingClientRect().top) < 2 && document.querySelector('[data-story-frame]').getBoundingClientRect().top > document.querySelector('.story__title').getBoundingClientRect().bottom));

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
  check('story frame fills its half of the tablet screen', await page.evaluate(() => { const b = document.querySelector('[data-story-frame]').getBoundingClientRect(); return b.width > innerWidth * 0.8 && b.height > innerHeight * 0.35; }));
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
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal], [data-split], .hero__word, [data-hero-fade], .story__word, .story__text, .gcard, .eco-row, .lshot, .life__open-copy > *, .figure__value, .path, .closing__title')].filter((element) => {
    const style = getComputedStyle(element);
    return style.visibility === 'hidden' || Number(style.opacity) < 0.99;
  }).map((el) => el.className));
  check('all content is visible without animation', hidden.length === 0, hidden.slice(0, 8));
  check('no section is pinned or scroll-jacked', await page.evaluate(() => ['[data-story-stage]', '[data-gallery-stage]', '[data-eco-stage]', '[data-life-stage]', '.closing__stage'].every((sel) => getComputedStyle(document.querySelector(sel)).position !== 'sticky') && document.querySelector('[data-story]').offsetHeight < innerHeight * 1.6));
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

(async () => {
  await ensureServer();
  if (SHOTS) fs.mkdirSync(OUT, { recursive: true });
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: 'localhost,127.0.0.1' } } : {});
  try {
    const only = process.argv[2];
    const suites = { desktop, opening, laptop, phone, tablet, reducedMotion };
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
