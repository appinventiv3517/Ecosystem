// Browser check for the homepage prototype: loads the page at desktop, tablet and phone
// sizes, exercises every interaction in the brief and reports what passed.
//
//   node tests/check.cjs            (starts the local server itself if it is not running)
//   SHOTS=1 node tests/check.cjs    (also writes screenshots to tests/output/)
//
// Needs Playwright with Chromium available to Node (npx playwright install chromium).

const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
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

async function open(browser, { width, height, touch = false, query = '?intro=off', reducedMotion = 'no-preference' }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('response', (response) => response.status() >= 400 && problems.push(`${response.status()} ${response.url()}`));
  await page.goto(`${BASE}/${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'), null, { timeout: 15000 });
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
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const activeCommunity = (page) => page.evaluate(() => document.querySelector('.community.is-active')?.dataset.community);
const activeVertical = (page) => page.evaluate(() => document.querySelector('.orbit__node[aria-selected="true"]')?.dataset.vertical);
const toastText = (page) => page.evaluate(() => {
  const toast = document.querySelector('[data-toast]');
  return toast.classList.contains('is-visible') ? toast.textContent.trim() : '';
});

async function desktop(browser) {
  console.log('\nDesktop 1440 x 900');
  const { context, page, problems } = await open(browser, { width: 1440, height: 900 });
  await shot(page, 'desktop-hero');

  // Header and scrolling
  check('header is transparent over the hero', await page.evaluate(() => !document.querySelector('[data-header]').classList.contains('is-solid')));
  await page.click('.primary-nav a[href="#services"]');
  await wait(page, 1600);
  check('nav link scrolls to its section', await page.evaluate(() => Math.abs(document.querySelector('#services').getBoundingClientRect().top) < 80));
  check('header turns solid and marks the active section', await page.evaluate(() => document.querySelector('[data-header]').classList.contains('is-solid') && document.querySelector('[data-nav-item="services"]').classList.contains('is-current')));
  check('scroll progress advances', await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('[data-scroll-progress]')).getPropertyValue('--progress')) > 0.3));

  // Mega menu: hover, keyboard, and a link that drives another section
  await page.hover('[data-nav-item="communities"] .nav-item__link');
  await wait(page, 900);
  check('mega menu opens on hover', await page.evaluate(() => document.querySelector('[data-mega]').classList.contains('is-open') && !document.querySelector('#mega-communities').hidden));
  await shot(page, 'desktop-mega');
  await page.click('#mega-communities a[data-community-jump="saadiyat-island"]');
  await wait(page, 2200);
  check('mega link jumps to that community', (await activeCommunity(page)) === 'saadiyat-island', await activeCommunity(page));
  check('mega menu closes after navigating', await page.evaluate(() => !document.querySelector('[data-mega]').classList.contains('is-open')));
  await page.mouse.move(700, 600);
  await page.focus('[data-nav-item="about"] .nav-item__toggle');
  await page.keyboard.press('Enter');
  await wait(page, 700);
  check('mega menu opens from the keyboard and moves focus inside', await page.evaluate(() => !document.querySelector('#mega-about').hidden && document.querySelector('#mega-about').contains(document.activeElement)));
  await page.keyboard.press('Escape');
  await wait(page, 700);
  check('Escape closes the mega menu and returns focus', await page.evaluate(() => !document.querySelector('[data-mega]').classList.contains('is-open') && document.activeElement.classList.contains('nav-item__toggle')));

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
  check('community dropdown selects with the mouse', await page.evaluate(() => document.querySelector('#value-community').textContent === 'Al Bateen Marina' && document.querySelector('#list-community').hidden === false || document.querySelector('#value-community').textContent === 'Al Bateen Marina'));
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
  await wait(page, 2400);
  check('result links through to the community', (await activeCommunity(page)) === 'al-bateen-marina', await activeCommunity(page));
  await goTo(page, '[data-search]', 260);
  await page.click('.search__quick .chip >> nth=0');
  await wait(page, 2000);
  check('quick start fills and runs the search', (await page.textContent('[data-result-summary]')) === 'Villas to buy in Zayed City');

  // Communities carousel
  await goTo(page, '[data-carousel]', 140);
  await page.evaluate(() => document.querySelector('[data-carousel-track]').scrollTo({ left: 0, behavior: 'instant' }));
  await wait(page, 500);
  await page.click('[data-carousel-next]');
  await wait(page, 1200);
  check('carousel arrow moves to the next community', (await activeCommunity(page)) === 'saadiyat-island' && (await page.textContent('[data-carousel-now]')) === '02');
  const before = await page.evaluate(() => document.querySelector('[data-carousel-track]').scrollLeft);
  const box = await page.locator('.community.is-active .community__media').boundingBox();
  await page.mouse.move(box.x + box.width / 2 + 200, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 250, box.y + 200, { steps: 12 });
  await page.mouse.up();
  await wait(page, 1600);
  const after = await page.evaluate(() => document.querySelector('[data-carousel-track]').scrollLeft);
  check('carousel drags with the mouse and settles on a card', after > before + 100 && (await activeCommunity(page)) !== 'saadiyat-island', { before, after });
  await page.focus('[data-carousel-track]');
  await page.keyboard.press('ArrowLeft');
  await wait(page, 1200);
  check('carousel responds to arrow keys', (await page.evaluate(() => document.querySelector('[data-carousel-track]').scrollLeft)) < after);
  await shot(page, 'desktop-communities');
  await page.click('.community.is-active [data-find]');
  await wait(page, 1800);
  check('"Find a home here" carries the community into the search', await page.evaluate(() => document.querySelector('[data-select="community"] input').value === document.querySelector('.community.is-active').dataset.community));

  // Ecosystem
  await goTo(page, '[data-orbit]', 140);
  await page.click('.orbit__node[data-vertical="hospitality"]');
  await wait(page, 1900);
  check('ecosystem selects a business on click', (await activeVertical(page)) === 'hospitality' && await page.evaluate(() => !document.querySelector('#panel-hospitality').hidden && document.querySelector('[data-vertical-image="hospitality"]').classList.contains('is-active')));
  await page.keyboard.press('ArrowRight');
  await wait(page, 1900);
  check('ecosystem moves with arrow keys', (await activeVertical(page)) === 'retail' && await page.evaluate(() => document.activeElement.dataset.vertical === 'retail'));
  check('active business sits beside its description', await page.evaluate(() => {
    const node = document.querySelector('.orbit__node.is-active').getBoundingClientRect();
    const stage = document.querySelector('[data-orbit-stage]').getBoundingClientRect();
    return Math.abs(node.top + node.height / 2 - (stage.top + stage.height / 2)) < 6 && node.left < stage.left + stage.width * 0.25;
  }));
  check('centre arch is centred in the ring', await page.evaluate(() => {
    const core = document.querySelector('[data-orbit-core]').getBoundingClientRect();
    const stage = document.querySelector('[data-orbit-stage]').getBoundingClientRect();
    return Math.abs(core.top + core.height / 2 - (stage.top + stage.height / 2)) < 4 && Math.abs(core.left + core.width / 2 - (stage.left + stage.width / 2)) < 4;
  }));
  await shot(page, 'desktop-ecosystem');

  // Life at Bloom: pinned chapters
  await goTo(page, '#life', 0);
  await page.mouse.wheel(0, 900);
  await wait(page, 1800);
  const chapter = await page.evaluate(() => [...document.querySelectorAll('[data-life-chapter]')].findIndex((item) => item.classList.contains('is-active')));
  check('life section pins and advances chapters on scroll', chapter >= 1 && await page.evaluate(() => Math.abs(document.querySelector('[data-life-stage]').getBoundingClientRect().top) < 2), chapter);
  await page.click('[data-life-go="3"]');
  await wait(page, 2400);
  check('chapter title jumps to that chapter', await page.evaluate(() => document.querySelectorAll('[data-life-chapter]')[3].classList.contains('is-active')));
  await shot(page, 'desktop-life');

  // Customer Services
  await goTo(page, '#services', 0);
  await page.click('.task:has-text("Pay an instalment")');
  await wait(page, 700);
  check('task finder highlights the right pathway', await page.evaluate(() => document.querySelector('#service-super-app').classList.contains('is-match') && !document.querySelector('#service-community-app').classList.contains('is-match') && document.querySelector('[data-tasks-status]').textContent === 'Start with Bloom Super App.'));
  await shot(page, 'desktop-services');
  await page.click('#service-community-app .service__link');
  await wait(page, 500);
  check('service outside the prototype explains itself', (await toastText(page)).includes('Bloom Community App'));
  await page.click('#service-enquiry .service__link');
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

  // About and footer
  await goTo(page, '.stats', 300);
  await wait(page, 2800);
  const numbers = await page.evaluate(() => [...document.querySelectorAll('.stat__value')].map((item) => item.textContent.trim()));
  check('figures count up to the RFP values', numbers.join(' ') === '6,500+ 25,000+ 1,000+ 15 851 8,500+', numbers);
  await shot(page, 'desktop-about');
  await page.click('.about__actions .btn');
  await wait(page, 400);
  check('About Bloom call to action gives demo feedback', (await toastText(page)).includes('About Bloom'));
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await wait(page, 1500);
  await shot(page, 'desktop-footer');
  await page.click('.lang--footer [data-lang-option="ar"]');
  await wait(page, 400);
  check('language switch explains Arabic is out of scope', (await toastText(page)).includes('Arabic'));
  await page.click('.footer__link[data-vertical-jump="landscaping"]');
  await wait(page, 2600);
  check('footer business link selects it in the ecosystem', (await activeVertical(page)) === 'landscaping');
  await page.click('.footer__top');
  await wait(page, 2500);
  check('back to top returns to the hero', (await page.evaluate(() => window.scrollY)) < 5);
  await page.click('.vignette[data-vertical-jump="education"]');
  await wait(page, 2600);
  check('hero arch jumps to its business', (await activeVertical(page)) === 'education');

  // Hero controls
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(page, 600);
  await page.click('[data-hero-dot="1"]');
  await wait(page, 1900);
  check('hero image changes on demand', await page.evaluate(() => document.querySelectorAll('[data-hero-slide]')[1].classList.contains('is-active') && document.querySelector('[data-hero-caption]').textContent === 'Al Bateen Marina, Abu Dhabi'));
  await page.click('[data-hero-pause]');
  check('hero rotation can be paused', await page.evaluate(() => document.querySelector('[data-hero-pause]').getAttribute('aria-pressed') === 'true'));
  await page.click('.hero__actions a[href="#find"]');
  await wait(page, 1600);
  check('hero "Find a Home" scrolls to the search', await page.evaluate(() => document.querySelector('#find').getBoundingClientRect().top < 120));

  check('no horizontal overflow', (await overflow(page)) === 0, await overflow(page));
  const broken = await page.evaluate(() => [...document.images].filter((image) => image.complete && !image.naturalWidth && image.getAttribute('src')).map((image) => image.getAttribute('src')));
  check('no broken images', broken.length === 0, broken);
  check('no console errors or failed requests', problems.length === 0, problems);
  await context.close();
}

async function intro(browser) {
  console.log('\nIntro sequence');
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  for (const [index, pause] of [900, 900, 800, 900].entries()) {
    await wait(page, pause);
    await shot(page, `intro-${index + 1}`);
  }
  await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'), null, { timeout: 15000 });
  check('intro finishes, unlocks scrolling and removes its overlay', await page.evaluate(() => !document.querySelector('[data-intro]') && !document.documentElement.classList.contains('is-locked') && getComputedStyle(document.querySelector('[data-brand]')).visibility === 'visible'));
  check('hero copy is visible after the intro', await page.evaluate(() => [...document.querySelectorAll('.hero__word, [data-hero-lede], [data-hero-actions] .btn')].every((element) => {
    const style = getComputedStyle(element);
    return style.visibility === 'visible' && Number(style.opacity) > 0.99;
  })));
  await shot(page, 'intro-5');
  await context.close();
}

async function phone(browser) {
  console.log('\nPhone 390 x 844 (touch)');
  const { context, page, problems } = await open(browser, { width: 390, height: 844, touch: true });
  await shot(page, 'phone-hero');
  check('desktop navigation is replaced by the menu button', await page.evaluate(() => getComputedStyle(document.querySelector('.primary-nav')).display === 'none' && getComputedStyle(document.querySelector('[data-menu-toggle]')).display !== 'none'));
  await page.tap('[data-menu-toggle]');
  await wait(page, 1500);
  check('full-screen menu opens and locks the page', await page.evaluate(() => !document.querySelector('[data-mobile-menu]').hidden && document.documentElement.classList.contains('is-locked') && document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded') === 'true'));
  await shot(page, 'phone-menu');
  await page.tap('.mobile-menu__link[href="#communities"]');
  await wait(page, 2200);
  check('menu link closes the menu and scrolls', await page.evaluate(() => document.querySelector('[data-mobile-menu]').hidden && Math.abs(document.querySelector('#communities').getBoundingClientRect().top) < 90 && !document.documentElement.classList.contains('is-locked')));
  await shot(page, 'phone-communities');

  await page.evaluate(() => document.querySelector('[data-carousel-track]').scrollTo({ left: 400, behavior: 'instant' }));
  await wait(page, 900);
  check('carousel swipes natively and updates the active card', (await activeCommunity(page)) === 'saadiyat-island', await activeCommunity(page));

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
  await shot(page, 'phone-search-result');

  await goTo(page, '[data-orbit]', 90);
  await page.tap('.orbit__node[data-vertical="education"]');
  await wait(page, 1700);
  check('ecosystem becomes tabs that select by tap', (await activeVertical(page)) === 'education' && await page.evaluate(() => getComputedStyle(document.querySelector('.orbit__node')).position === 'static'));
  await shot(page, 'phone-ecosystem');

  await goTo(page, '#life', 0);
  await page.evaluate(() => window.scrollBy({ top: 700, behavior: 'instant' }));
  await wait(page, 1800);
  check('life section pins on a phone', await page.evaluate(() => Math.abs(document.querySelector('[data-life-stage]').getBoundingClientRect().top) < 2 && !document.querySelectorAll('[data-life-chapter]')[0].classList.contains('is-active')));
  await shot(page, 'phone-life');

  await goTo(page, '#services', 0);
  await shot(page, 'phone-services');
  await page.tap('.task:has-text("Register as a broker")');
  await wait(page, 1600);
  check('task finder brings the matching pathway into view', await page.evaluate(() => {
    const box = document.querySelector('#service-partners-app').getBoundingClientRect();
    return document.querySelector('#service-partners-app').classList.contains('is-match') && box.top < window.innerHeight && box.bottom > 0;
  }));
  await page.tap('.site-header__enquire');
  await wait(page, 1000);
  check('enquiry opens as a bottom sheet', await page.evaluate(() => {
    const box = document.querySelector('[data-enquiry]').getBoundingClientRect();
    return document.querySelector('[data-enquiry]').open && Math.abs(box.bottom - window.innerHeight) < 2 && box.width === window.innerWidth;
  }));
  await shot(page, 'phone-enquiry');
  await page.tap('.enquiry__close');
  await wait(page, 900);

  await goTo(page, '.stats', 200);
  await wait(page, 2600);
  await shot(page, 'phone-about');
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
  for (const id of ['begin', 'find', 'communities', 'ecosystem', 'life', 'services', 'about']) {
    await goTo(page, `#${id}`, 0);
    await shot(page, `tablet-${id}`);
  }
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
  const { context, page, problems } = await open(browser, { width: 1280, height: 800, reducedMotion: 'reduce', query: '' });
  check('animated mode is off', await page.evaluate(() => !document.documentElement.classList.contains('motion') && !document.querySelector('[data-intro]')));
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal], [data-split], .hero__word, .community, .service, .stat__value, .orbit__node, .chapter__text')].filter((element) => {
    const style = getComputedStyle(element);
    return style.visibility === 'hidden' || Number(style.opacity) < 0.99;
  }).length);
  check('all content is visible without animation', hidden === 0, hidden);
  await goTo(page, '[data-search]', 200);
  await page.click('[data-search-submit]');
  await wait(page, 400);
  check('search still works', (await page.textContent('[data-result-summary]')) === 'Homes to buy across all Bloom communities');
  await goTo(page, '[data-orbit]', 120);
  await page.click('.orbit__node[data-vertical="landscaping"]');
  await wait(page, 300);
  check('ecosystem still works', await page.evaluate(() => !document.querySelector('#panel-landscaping').hidden));
  check('life section is not pinned', await page.evaluate(() => !document.querySelector('.pin-spacer')));
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
    const suites = { desktop, intro, phone, tablet, reducedMotion };
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
