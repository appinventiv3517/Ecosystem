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
// PAGE_URL points the checks at another build of the same page (see tools/build_artifact.py).
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

async function open(browser, { width, height, touch = false, query = '?intro=off', reducedMotion = 'no-preference' }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('response', (response) => response.status() >= 400 && problems.push(`${response.status()} ${response.url()}`));
  await page.goto(PAGE + query, { waitUntil: 'load' });
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
const activeMoment = (page) => page.evaluate(() => document.querySelector('.moment.is-active')?.dataset.moment);
const frontOrb = (page) => page.evaluate(() => document.querySelector('[data-orb].is-focus')?.dataset.id);
/** Bring the glimpses of Bloom World to the top of the screen. */
const toWorld = async (page) => {
  await page.evaluate(() => window.scrollTo({ top: document.querySelector('#world').getBoundingClientRect().top + scrollY, behavior: 'instant' }));
  await wait(page, 1400);
};
/** Scroll to a point in the Bloom book: step 0 is the closed cover (desktop) or first page (phone). */
/** True when the section's content sits wholly on one screen once the section is at the top. */
const fitsOneScreen = async (page, id) => {
  await page.evaluate((sel) => { const s = document.getElementById(sel); window.scrollTo({ top: s.getBoundingClientRect().top + scrollY, behavior: 'instant' }); }, id);
  await wait(page, 900);
  await page.evaluate((sel) => { const s = document.getElementById(sel); window.scrollTo({ top: s.getBoundingClientRect().top + scrollY, behavior: 'instant' }); }, id);
  await wait(page, 900);
  return page.evaluate((sel) => {
    const section = document.getElementById(sel);
    const box = section.getBoundingClientRect();
    const deepest = Math.max(...[...section.querySelectorAll('.wrap *')].filter((el) => el.offsetParent && !el.closest('[hidden], [aria-hidden="true"]')).map((el) => el.getBoundingClientRect().bottom));
    return Math.abs(box.top) < 2 && box.height <= innerHeight + 1 && deepest <= innerHeight + 1;
  }, id);
};
const toastText = (page) => page.evaluate(() => {
  const toast = document.querySelector('[data-toast]');
  return toast.classList.contains('is-visible') ? toast.textContent.trim() : '';
});

async function desktop(browser) {
  console.log('\nDesktop 1440 x 900');
  const { context, page, problems } = await open(browser, { width: 1440, height: 900 });
  await wait(page, 2600); // the world opens on arrival
  await shot(page, 'desktop-hero');

  // Hero: Welcome to Bloom World
  check('hero headline is dark on cream and readable', await page.evaluate(() => getComputedStyle(document.querySelector('.hero')).backgroundColor === 'rgb(248, 246, 234)' && getComputedStyle(document.querySelector('.hero__title')).color === 'rgb(29, 26, 23)'));
  check('the hero welcomes you to Bloom World', (await page.textContent('[data-hero-eyebrow]')).trim() === 'Welcome to' && await page.evaluate(() => document.querySelector('[data-hero-title]').getAttribute('aria-label') === 'Bloom World' && document.querySelector('.hero__title').textContent.replace(/\s+/g, ' ').trim() === 'Bloom World'));
  check('all seven businesses are on screen, each named', await page.evaluate(() => {
    const names = ['Real Estate', 'Education', 'Hospitality', 'Retail', 'Healthcare', 'Facilities Management', 'Landscaping'];
    const orbs = [...document.querySelectorAll('[data-orb]')];
    return orbs.length === 7 && names.every((name) => orbs.some((orb) => {
      const box = orb.getBoundingClientRect();
      const label = orb.querySelector('.orb__label');
      const tag = label.getBoundingClientRect();
      return orb.dataset.name === name && Number(getComputedStyle(orb).opacity) > 0.9 && box.left >= 0 && box.right <= innerWidth && box.top >= 0
        && Number(getComputedStyle(label).opacity) > 0.5 && tag.bottom <= innerHeight && tag.width > 40;
    }));
  }));
  check('the business at the front is centred, largest and shows its brand', await page.evaluate(() => {
    const orb = document.querySelector('[data-orb].is-focus');
    const box = orb.getBoundingClientRect();
    const widest = Math.max(...[...document.querySelectorAll('[data-orb]')].map((o) => o.getBoundingClientRect().width));
    return Math.abs(box.left + box.width / 2 - innerWidth / 2) < 4 && box.top > innerHeight * 0.5 && box.width === widest && Number(getComputedStyle(orb.querySelector('.orb__brand')).opacity) > 0.95;
  }));
  check('the headline and buttons sit clear of the arches', await page.evaluate(() => {
    const blocks = [...document.querySelectorAll('.hero__title, [data-hero-actions] .btn')].map((el) => el.getBoundingClientRect());
    return [...document.querySelectorAll('[data-orb] .orb__body')].every((body) => {
      const b = body.getBoundingClientRect();
      const inner = { left: b.left + b.width * 0.15, right: b.right - b.width * 0.15, top: b.top + b.height * 0.15, bottom: b.bottom - b.height * 0.15 };
      return blocks.every((t) => inner.right < t.left || inner.left > t.right || inner.bottom < t.top || inner.top > t.bottom);
    });
  }));
  // With the pointer over the hero (but not on an arch) the world keeps turning.
  await page.mouse.move(720, 300);
  const firstFocus = await frontOrb(page);
  await wait(page, 5000);
  check('the world turns on its own, even with the pointer over the hero', (await frontOrb(page)) !== firstFocus);
  await page.hover('[data-orb][data-id="retail"] .orb__btn', { force: true });
  await wait(page, 900);
  check('pointing at a business names its brand and steps the others back', await page.evaluate(() => document.querySelector('[data-world]').classList.contains('has-hover') && Number(getComputedStyle(document.querySelector('[data-orb][data-id="retail"] .orb__brand')).opacity) > 0.95));
  await page.mouse.move(700, 880);
  await page.evaluate(() => window.scrollTo({ top: innerHeight * 1.5, behavior: 'instant' }));
  await wait(page, 2200);
  check('scrolling swings the world open and lifts the headline away', await page.evaluate(() => getComputedStyle(document.querySelector('[data-hero-content]')).opacity < 0.05 && [...document.querySelectorAll('[data-orb]')].every((orb) => Number(getComputedStyle(orb).opacity) < 0.15)));

  // Glimpses of Bloom World
  await page.mouse.move(1300, 120);
  await toWorld(page);
  await shot(page, 'desktop-world');
  check('glimpses: the day opens at home with Real Estate', (await activeMoment(page)) === 'real-estate' && await page.evaluate(() => document.querySelector('[data-stop="0"]').classList.contains('is-active')));
  check('glimpses: the stage, story and dial fit one laptop screen', await page.evaluate(() => {
    const stage = document.querySelector('[data-glimpse-stage]').getBoundingClientRect();
    const bottom = (selector) => Math.max(...[...document.querySelectorAll(selector)].filter((el) => el.offsetParent).map((el) => el.getBoundingClientRect().bottom));
    // The story sits to the left of the section dock; the dial, centred, must clear it.
    return Math.abs(stage.top) < 2 && stage.height <= innerHeight + 1 && bottom('.glimpses__head, .moment.is-active') <= innerHeight && bottom('[data-dial], .dial__label') <= innerHeight - 64;
  }));
  check('glimpses: the links from home to the businesses it works with are drawn', await page.evaluate(() => document.querySelectorAll('.dial__link.is-live').length === 3));
  check('glimpses: each business has a button to its own website', await page.evaluate(() => {
    const site = document.querySelector('#moment-real-estate .moment__site');
    return site.href === 'https://bloomholding.com/what-we-do/properties' && site.target === '_blank' && site.rel.includes('noopener')
      && document.querySelectorAll('a.moment__site[target="_blank"]').length === 5 && document.querySelectorAll('button.moment__site[data-demo]').length === 2;
  }));
  await wait(page, 3300); // one business is shown for 2.8 seconds
  check('glimpses: the day moves on to the next business by itself', (await activeMoment(page)) === 'education', await activeMoment(page));
  await page.hover('.moment.is-active .moment__text');
  const held = await activeMoment(page);
  await wait(page, 5000);
  check('glimpses: the day waits while you read the story', (await activeMoment(page)) === held);
  await page.mouse.move(1300, 120);
  await page.click('[data-glimpse-pause]');
  await page.mouse.move(1300, 120);
  const pausedAt = await activeMoment(page);
  await wait(page, 5000);
  check('glimpses: the pause button stops the day', (await activeMoment(page)) === pausedAt && (await page.getAttribute('[data-glimpse-pause]', 'aria-pressed')) === 'true');
  await page.click('[data-glimpse-pause]');
  await page.mouse.move(1300, 120);
  await page.click('[data-stop="6"]');
  await page.mouse.move(1300, 120);
  await wait(page, 1500);
  check('glimpses: a stop on the dial jumps to that business', (await activeMoment(page)) === 'hospitality' && await page.evaluate(() => document.querySelector('.scene.is-active').dataset.scene === 'hospitality' && document.querySelector('[data-stop="6"]').getAttribute('aria-current') === 'step'));
  check('glimpses: earlier links stay drawn as the day goes on', await page.evaluate(() => document.querySelectorAll('.dial__link.is-known').length >= 8));
  await wait(page, 4000);
  await shot(page, 'desktop-world-all');
  check('glimpses: the day ends with all seven connected', (await activeMoment(page)) === 'all' && await page.evaluate(() => document.querySelector('#world').classList.contains('is-all')));
  await page.click('[data-stop="3"]');
  await page.mouse.move(1300, 120);
  await wait(page, 1500);
  check('glimpses: stand-in photography is labelled and the website button says it is to come', await page.evaluate(() => document.querySelector('.scene.is-active .scene__tag')?.textContent.includes('Stand-in') && document.querySelector('#moment-retail .moment__site').textContent.includes('to come')));
  await page.click('.moment.is-active .moment__link >> nth=0');
  await page.mouse.move(1300, 120);
  await wait(page, 1500);
  check('glimpses: "connects with" jumps to the linked business', (await activeMoment(page)) === 'real-estate', await activeMoment(page));
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('bloom:world', { detail: { id: 'all' } })));
  await wait(page, 1500);
  await page.click('#moment-all a[href="#find"]');
  await wait(page, 2400);
  check('glimpses: "Find your place" leads on to the property search', await page.evaluate(() => Math.abs(document.querySelector('#find').getBoundingClientRect().top) < 90));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(page, 1500);
  await page.click('.primary-nav a[href="#services"]');
  await wait(page, 2600); // a long way down: the glimpses add several screens of scroll
  check('nav link scrolls to its section', await page.evaluate(() => Math.abs(document.querySelector('#services').getBoundingClientRect().top) < 80));
  check('header turns solid and marks the active section', await page.evaluate(() => document.querySelector('[data-header]').classList.contains('is-solid') && document.querySelector('[data-nav-item="services"]').classList.contains('is-current')));
  check('section dock appears and its arch fills with progress', await page.evaluate(() => document.querySelector('[data-dock]').classList.contains('is-visible') && parseFloat(getComputedStyle(document.querySelector('[data-dock-progress]')).getPropertyValue('--progress')) > 0.3));
  check('dock names the current section', (await page.textContent('[data-dock-name]')).replace(/\u00a0/g, ' ') === 'Customer Services', await page.textContent('[data-dock-name]'));
  check('header floats as a capsule once scrolled', await page.evaluate(() => getComputedStyle(document.querySelector('.site-header__bar')).borderRadius === '999px'));

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

  // Find Your Property
  check('Find Your Property fits one laptop screen', await fitsOneScreen(page, 'find'));
  check('featured developments sit clear of the section dock', await page.evaluate(() => Math.max(...[...document.querySelectorAll('.dev')].map((d) => d.getBoundingClientRect().bottom)) <= innerHeight - 64));
  await shot(page, 'desktop-find');
  await page.click('.path[data-path="rent"]');
  await wait(page, 1300);
  check('Rent pathway switches the search to renting', await page.evaluate(() => document.querySelector('[data-search-label]').textContent === 'Search homes to rent' && !document.querySelector('[data-mode-copy="rent"]').hidden && document.querySelector('.path[data-path="rent"]').classList.contains('is-active') && !document.querySelector('.path[data-path="buy"]').classList.contains('is-active')));
  check('the budget changes to yearly rent ranges', await page.evaluate(() => !document.querySelector('[data-budget="rent"]').hidden && document.querySelector('[data-budget="buy"]').hidden));
  check('featured developments offer homes to rent', await page.evaluate(() => [...document.querySelectorAll('[data-dev-label]')].every((label) => label.textContent === 'Homes to rent here')));
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
  await page.click('#button-budget-rent');
  await wait(page, 400);
  await page.click('#budget-rent-2');
  await wait(page, 300);
  await page.click('[data-search-submit]');
  await wait(page, 1700);
  const summary = await page.textContent('[data-result-summary]');
  check('search shows a demo result that reflects the choices', summary === 'Apartments to rent in Al Bateen Marina, 2 bedrooms, yearly rent AED 80K to 150K', summary);
  check('result lists the verified developments', (await page.textContent('.search-result__devs')).includes('Bloom Marina'));
  await shot(page, 'desktop-search-result');
  await page.click('.search-result__next .btn >> nth=0');
  await wait(page, 2400);
  check('result links through to the community', (await activeCommunity(page)) === 'al-bateen-marina', await activeCommunity(page));
  await goTo(page, '[data-search]', 260);
  await page.click('.search__quick .chip >> nth=0');
  await wait(page, 2000);
  check('quick start fills and runs the search', (await page.textContent('[data-result-summary]')) === 'Villas to buy in Zayed City');
  check('featured: the chosen community\'s development comes forward', await page.evaluate(() => document.querySelector('.dev[data-dev="bloom-living"]').classList.contains('is-match') && document.querySelector('.dev[data-dev="soho-square"]').classList.contains('is-muted')));
  await page.click('.dev[data-dev="bloom-gardens"] [data-dev-search]');
  await wait(page, 2000);
  check('featured: "Homes to buy here" searches that community', (await page.textContent('[data-result-summary]')).startsWith('Homes to buy in Eastern Mangrove Corniche'), await page.textContent('[data-result-summary]'));
  await page.click('.dev[data-dev="bloom-gardens"] [data-dev-enquire]');
  await wait(page, 900);
  check('featured: "Enquire" opens the enquiry about that development', await page.evaluate(() => document.querySelector('[data-enquiry]').open && document.querySelector('[data-enquiry]').textContent.includes('About: Bloom Gardens') && document.querySelector('input[name="interest"][value="buy"]').checked));
  await page.click('.enquiry__close');
  await wait(page, 900);
  check('the launch slot says plainly that launches are to come', (await page.textContent('.dev--launch')).includes('Launch details to come from Bloom'));

  // Awards & announcements
  check('awards and announcements follow Find Your Property', await page.evaluate(() => document.querySelector('#find').nextElementSibling?.id === 'recognition'));
  check('awards and announcements fit one laptop screen', await fitsOneScreen(page, 'recognition'));
  await wait(page, 2400);
  await shot(page, 'desktop-recognition');
  check('awards: the figures count up to Bloom\'s published values', (await page.evaluate(() => [...document.querySelectorAll('#recognition .stat__value')].map((v) => v.textContent.trim()).join(' '))) === '4 11th');
  check('awards: five recent awards, each with its awarding body', await page.evaluate(() => [...document.querySelectorAll('.award')].length === 5 && [...document.querySelectorAll('.award')].every((a) => a.querySelector('.award__year').textContent.trim() && a.querySelector('.award__body').textContent.trim())));
  check('announcements link to Bloom\'s press releases in a new tab', await page.evaluate(() => {
    const links = [...document.querySelectorAll('a.news__link')];
    return links.length === 3 && links.every((a) => a.href.startsWith('https://bloomholding.com/press-releases/') && a.target === '_blank' && a.rel.includes('noopener'));
  }));
  check('announcements sit clear of the section dock', await page.evaluate(() => Math.max(...[...document.querySelectorAll('.news')].map((n) => n.getBoundingClientRect().bottom)) <= innerHeight - 64));
  await page.click('.news--next .news__more');
  await wait(page, 900);
  check('"Coming up" offers Bloom news through the enquiry panel', await page.evaluate(() => document.querySelector('[data-enquiry]').open && document.querySelector('[data-enquiry]').textContent.includes('About: Announcements from Bloom')));
  await page.click('.enquiry__close');
  await wait(page, 900);

  // Communities stage
  const order = ['zayed-city', 'saadiyat-island', 'al-bateen-marina', 'jumeirah-village-circle', 'eastern-mangrove-corniche'];
  const nextOf = (id, step = 1) => order[(order.indexOf(id) + step + order.length) % order.length];
  await goTo(page, '[data-stage]', 100);
  let from = await activeCommunity(page);
  await page.click('[data-stage-next]');
  await wait(page, 1900);
  check('next button moves to the next community', (await activeCommunity(page)) === nextOf(from) && (await page.textContent('[data-stage-now]')) === String(order.indexOf(nextOf(from)) + 1).padStart(2, '0'));
  from = await activeCommunity(page);
  await page.click('[data-stage-peek]');
  await wait(page, 1900);
  check('the arch in the corner opens the next community', (await activeCommunity(page)) === nextOf(from));
  check('only the active community is shown', await page.evaluate(() => [...document.querySelectorAll('.community')].filter((c) => !c.hidden).length === 1));
  from = await activeCommunity(page);
  const stageBox = await page.locator('[data-stage]').boundingBox();
  await page.mouse.move(stageBox.x + stageBox.width * 0.45, stageBox.y + stageBox.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + stageBox.width * 0.45 - 260, stageBox.y + stageBox.height * 0.4, { steps: 12 });
  await page.mouse.up();
  await wait(page, 1900);
  check('stage drags to the next community', (await activeCommunity(page)) === nextOf(from), await activeCommunity(page));
  from = await activeCommunity(page);
  await page.focus('[data-stage]');
  await page.keyboard.press('ArrowLeft');
  await wait(page, 1900);
  check('stage responds to arrow keys', (await activeCommunity(page)) === nextOf(from, -1));
  await page.click('.stage__tab[data-go="4"]');
  await wait(page, 1900);
  check('index selects a community directly', (await activeCommunity(page)) === 'eastern-mangrove-corniche' && await page.evaluate(() => document.querySelector('.stage__tab[data-go="4"]').getAttribute('aria-selected') === 'true'));
  await shot(page, 'desktop-communities');
  // Scrolling drives the stage: it holds still, and each stretch of scroll brings the next community.
  await page.evaluate(() => { const track = document.querySelector('[data-stage-track]'); window.scrollTo({ top: track.getBoundingClientRect().top + scrollY - 400, behavior: 'instant' }); });
  await wait(page, 2400);
  check('scrolling into the stage starts at the first community', (await activeCommunity(page)) === 'zayed-city', await activeCommunity(page));
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 300);
    await wait(page, 600);
  }
  await wait(page, 1800);
  const reached = await activeCommunity(page);
  check('scrolling on moves through the communities while the stage stays put', order.indexOf(reached) >= 2 && await page.evaluate(() => Math.abs(document.querySelector('[data-stage]').getBoundingClientRect().top - parseFloat(getComputedStyle(document.querySelector('[data-stage]')).top)) < 2), await activeCommunity(page));
  await page.click('.community.is-active [data-find]');
  await wait(page, 1800);
  check('"Find a home here" carries the community into the search', await page.evaluate((id) => document.querySelector('[data-select="community"] input').value === id, reached));

  // Motion layer
  check('buttons carry a rolling label', await page.evaluate(() => document.querySelectorAll('.btn .roll__inner').length > 5 && document.querySelector('.site-header__enquire .roll').getBoundingClientRect().height < 30));
  check('pointer follower is active for mouse users', await page.evaluate(() => document.documentElement.classList.contains('has-cursor')));

  // The ecosystem book and Life at Bloom are hidden for now
  check('the ecosystem book and Life at Bloom are hidden, and nothing links to them', await page.evaluate(() => document.querySelector('#ecosystem').hidden && document.querySelector('#life').hidden && !document.querySelector('a[href="#ecosystem"], a[href="#life"]')));

  // Customer Services
  check('customer services fits one laptop screen', await fitsOneScreen(page, 'services'));
  await goTo(page, '#services', 0);
await wait(page, 1600);
  check('three app tiles and a way to get them', await page.evaluate(() => ['community-app', 'super-app', 'partners-app'].every((id) => { const box = document.querySelector(`#service-${id}`).getBoundingClientRect(); return box.width > 200 && box.height > 180; }) && document.querySelectorAll('.app-store').length === 2));
  check('each app says who it is for in a line or two', await page.evaluate(() => [...document.querySelectorAll('.app-tile__line')].every((line) => line.getBoundingClientRect().height < 56 && line.scrollHeight <= line.clientHeight + 1)));
  check('the arrows sit clear of the words', await page.evaluate(() => [...document.querySelectorAll('[data-app-tile] .app-tile__go')].every((go) => { const g = go.getBoundingClientRect(); return [...go.closest('[data-app-tile]').querySelectorAll('.app-tile__body > *')].every((el) => { const b = el.getBoundingClientRect(); return g.bottom <= b.top || g.top >= b.bottom || g.right <= b.left || g.left >= b.right; }); })));
  await shot(page, 'desktop-services');
  await page.click('#service-community-app .app-tile__name');
  await wait(page, 500);
  check('clicking anywhere on a tile opens its app (explained in the prototype)', (await toastText(page)).includes('Bloom Community App'));
  await page.click('.app-talk__enquire');
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

  // Our Story: scrolling down moves through the years
  const storyYear = () => page.evaluate(() => document.querySelector('.moment-y.is-active .moment-y__year').textContent.trim());
  const toStory = async (f) => {
    await page.evaluate((x) => { const t = document.querySelector('[data-story-track]'); window.scrollTo({ top: t.getBoundingClientRect().top + scrollY + (t.offsetHeight - innerHeight) * x, behavior: 'instant' }); }, f);
    await wait(page, 1600);
  };
  check('Our Story sits just above About Bloom', await page.evaluate(() => document.querySelector('#about').previousElementSibling?.id === 'story'));
  await toStory(0);
  check('story: it starts in 2008 with the heading and rail on screen', (await storyYear()) === '2008' && await page.evaluate(() => {
    const inView = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight; };
    return inView('.story__title') && inView('.rail__stops') && Math.abs(document.querySelector('[data-story-stage]').getBoundingClientRect().top) < 2;
  }));
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 300);
    await wait(page, 350);
  }
  await wait(page, 1400);
  const scrolledTo = await storyYear();
  check('story: scrolling down moves on through the years while the stage holds still', !['2008', undefined].includes(scrolledTo) && await page.evaluate(() => Math.abs(document.querySelector('[data-story-stage]').getBoundingClientRect().top) < 2), scrolledTo);
  check('story: the year in focus sits in view, the faint year behind matches it', await page.evaluate(() => {
    const active = document.querySelector('.moment-y.is-active').getBoundingClientRect();
    return active.left >= 0 && active.left < innerWidth / 2 && document.querySelector('[data-story-ghost]').textContent.trim() === document.querySelector('.moment-y.is-active .moment-y__year').textContent.trim();
  }));
  await page.click('[data-story-go="6"]');
  await wait(page, 2600);
  check('story: a year on the rail jumps to it', (await storyYear()) === '2022' && await page.evaluate(() => document.querySelector('[data-story-go="6"]').getAttribute('aria-current') === 'step'), await storyYear());
  await toStory(1);
  await shot(page, 'desktop-story');
  check('story: the timeline ends in 2026', (await storyYear()) === '2026');

  // About and footer
  await goTo(page, '#about .stats', 300);
  await wait(page, 2800);
  const numbers = await page.evaluate(() => [...document.querySelectorAll('#about .stat__value')].map((item) => item.textContent.trim()));
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
  await page.click('.footer__link[data-world-jump="landscaping"]');
  await wait(page, 2600);
  check('footer business link opens it in the glimpses of Bloom World', (await activeMoment(page)) === 'landscaping' && await page.evaluate(() => Math.abs(document.querySelector('#world').getBoundingClientRect().top) < 4), await activeMoment(page));
  await page.click('.footer__top');
  await wait(page, 2500);
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
  check('label and arrow have space between them', await page.evaluate(() => { const item = document.querySelector('[data-nav-item="communities"]'); return item.querySelector('.nav-item__toggle').getBoundingClientRect().left - item.querySelector('.nav-item__link').getBoundingClientRect().right >= 5; }));

  // Section dock
  await page.click('[data-dock-toggle]');
  await wait(page, 600);
  check('dock opens a list of sections', await page.evaluate(() => !document.querySelector('[data-dock-list]').hidden && document.querySelector('[data-dock-toggle]').getAttribute('aria-expanded') === 'true'));
  await page.click('[data-dock-link="services"]');
  await wait(page, 2200);
  check('dock link jumps to its section', await page.evaluate(() => Math.abs(document.querySelector('#services').getBoundingClientRect().top) < 90 && document.querySelector('[data-dock-list]').hidden));

  // Hero controls
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(page, 900);
  await page.click('[data-orb][data-id="education"] .orb__btn', { force: true });
  await wait(page, 2800);
  check('clicking a business in the hero opens it in the glimpses of Bloom World', (await activeMoment(page)) === 'education' && await page.evaluate(() => Math.abs(document.querySelector('#world').getBoundingClientRect().top) < 4), await activeMoment(page));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(page, 900);
  const before = await frontOrb(page);
  await page.mouse.move(1100, 450);
  await page.mouse.down();
  await page.mouse.move(900, 452, { steps: 6 });
  await page.mouse.move(650, 455, { steps: 6 });
  await page.mouse.up();
  await wait(page, 2000);
  check('dragging turns the world', (await frontOrb(page)) !== before);
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
  await page.goto(PAGE, { waitUntil: 'load' });
  await wait(page, 1100);
  const counted = Number(await page.textContent('[data-intro-count]'));
  check('loader counts up while the arches rise', counted > 0 && counted <= 100, counted);
  await shot(page, 'intro-1');
  for (const [index, pause] of [800, 800, 900].entries()) {
    await wait(page, pause);
    await shot(page, `intro-${index + 2}`);
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
  await wait(page, 2600);
  await shot(page, 'phone-hero');
  check('phone: headline and both buttons fit on the first screen', await page.evaluate(() => [...document.querySelectorAll('.hero__title, [data-hero-actions] .btn')].every((element) => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight; })));
  check('phone: the seven businesses sit above the headline', await page.evaluate(() => {
    const title = document.querySelector('.hero__title').getBoundingClientRect();
    return [...document.querySelectorAll('[data-orb]')].filter((orb) => { const box = orb.getBoundingClientRect(); return Number(getComputedStyle(orb).opacity) > 0.9 && box.left >= 0 && box.right <= innerWidth && box.bottom < title.top; }).length === 7;
  }));
  check('phone: the caption names the business at the front', await page.evaluate(() => document.querySelector('[data-caption-name]').textContent === document.querySelector('[data-orb].is-focus').dataset.name));
  const phoneFront = await frontOrb(page);
  await page.tap('.world__caption-go');
  await wait(page, 2800);
  check('phone: the caption opens that business in the glimpses', (await activeMoment(page)) === phoneFront, { phoneFront, moment: await activeMoment(page) });
  await shot(page, 'phone-world');
  await wait(page, 3000);
  check('phone: the day moves on by itself', (await activeMoment(page)) !== phoneFront);
  check('phone: the story and dial fit the screen', await page.evaluate(() => Math.max(...[...document.querySelectorAll('.moment.is-active, [data-dial]')].map((el) => el.getBoundingClientRect().bottom)) <= innerHeight - 56));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(page, 600);
  check('desktop navigation is replaced by the menu button', await page.evaluate(() => getComputedStyle(document.querySelector('.primary-nav')).display === 'none' && getComputedStyle(document.querySelector('[data-menu-toggle]')).display !== 'none'));
  await page.tap('[data-menu-toggle]');
  await wait(page, 1500);
  check('full-screen menu opens and locks the page', await page.evaluate(() => !document.querySelector('[data-mobile-menu]').hidden && document.documentElement.classList.contains('is-locked') && document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded') === 'true'));
  await shot(page, 'phone-menu');
  await page.tap('.mobile-menu__link[href="#communities"]');
  await wait(page, 2200);
  check('menu link closes the menu and scrolls', await page.evaluate(() => document.querySelector('[data-mobile-menu]').hidden && Math.abs(document.querySelector('#communities').getBoundingClientRect().top) < 90 && !document.documentElement.classList.contains('is-locked')));
  await shot(page, 'phone-communities');

  await goTo(page, '[data-stage]', 90);
  const before = await activeCommunity(page);
  const media = await page.locator('[data-stage-media]').boundingBox();
  await page.mouse.move(media.x + media.width * 0.8, media.y + media.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(media.x + media.width * 0.15, media.y + media.height * 0.5, { steps: 10 });
  await page.mouse.up();
  await wait(page, 1900);
  const after = await activeCommunity(page);
  check('stage swipes to the next community', after !== before && after !== undefined, { before, after });

  await goTo(page, '[data-mode]', 90);
  await shot(page, 'phone-find');
  await page.tap('.path[data-path="rent"]');
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

  await goTo(page, '#services', 0);
  await shot(page, 'phone-services');
await wait(page, 1600);
  check('on a phone the app tiles stack, each with its picture', await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('[data-app-tile]')].map((tile) => tile.getBoundingClientRect());
    return tiles.every((box, i) => i === 0 || box.top >= tiles[i - 1].bottom - 1) && [...document.querySelectorAll('.app-tile__media')].every((m) => m.getBoundingClientRect().height > 120);
  }));
  check('header stays on screen while scrolling on a phone', await page.evaluate(() => document.querySelector('.site-header__bar').getBoundingClientRect().top >= 0));
  await page.tap('.site-header__enquire');
  await wait(page, 1000);
  check('enquiry opens as a bottom sheet', await page.evaluate(() => {
    const box = document.querySelector('[data-enquiry]').getBoundingClientRect();
    return document.querySelector('[data-enquiry]').open && Math.abs(box.bottom - window.innerHeight) < 2 && box.width === window.innerWidth;
  }));
  await shot(page, 'phone-enquiry');
  await page.tap('.enquiry__close');
  await wait(page, 900);

  await goTo(page, '#about .stats', 200);
  await wait(page, 2600);
  await shot(page, 'phone-about');
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await wait(page, 1500);
  await shot(page, 'phone-footer');

  const small = await page.evaluate(() => [...document.querySelectorAll('a, button, label.beds__chip, label.path')].filter((element) => {
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

  for (const id of ['world', 'find', 'recognition', 'communities', 'services', 'story', 'about']) {
    await goTo(page, `#${id}`, 0);
    await shot(page, `tablet-${id}`);
  }
  await toWorld(page);
  await page.tap('[data-stop="3"]');
  await wait(page, 1500);
  check('a stop on the dial opens that business on a tablet', (await activeMoment(page)) === 'retail', await activeMoment(page));
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
  const { context, page, problems } = await open(browser, { width: 1280, height: 800, reducedMotion: 'reduce', query: '' });
  check('animated mode is off', await page.evaluate(() => !document.documentElement.classList.contains('motion') && !document.querySelector('[data-intro]')));
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal], [data-split], .hero__word, [data-orb], .moment.is-active, [data-glimpse-ui], .community:not([hidden]), .app-tile, .stat__value, .moment-y, .story__head')].filter((element) => {
    const style = getComputedStyle(element);
    return style.visibility === 'hidden' || Number(style.opacity) < 0.99;
  }).length);
  check('all content is visible without animation', hidden === 0, hidden);
  await goTo(page, '#world', 0);
  await page.click('[data-stop="5"]');
  await wait(page, 400);
  check('glimpses work as tabs without motion', (await activeMoment(page)) === 'landscaping' && await page.evaluate(() => !document.querySelector('#moment-landscaping').hidden && document.querySelector('#moment-real-estate').hidden && document.querySelector('.scene.is-active').dataset.scene === 'landscaping'));
  await goTo(page, '[data-search]', 200);
  await page.click('[data-search-submit]');
  await wait(page, 400);
  check('search still works', (await page.textContent('[data-result-summary]')) === 'Homes to buy across all Bloom communities');
  check('Our Story is a plain list of every year without motion', await page.evaluate(() => [...document.querySelectorAll('.moment-y')].every((m) => getComputedStyle(m).opacity === '1') && getComputedStyle(document.querySelector('.story__rail')).display === 'none'));
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
