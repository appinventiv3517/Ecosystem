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
const activeVertical = (page) => page.evaluate(() => document.querySelector('.eco-index__item[aria-current="true"]')?.dataset.vertical);
/** Scroll to a point in the Bloom book: step 0 is the closed cover (desktop) or first page (phone). */
const toBookStep = async (page, step) => {
  await page.evaluate((s) => {
    const track = document.querySelector('[data-eco-track]');
    const steps = Number(getComputedStyle(track).getPropertyValue('--steps'));
    const top = track.getBoundingClientRect().top + scrollY;
    window.scrollTo({ top: top + ((track.offsetHeight - innerHeight) * s) / steps, behavior: 'instant' });
  }, step);
  await wait(page, 1800);
};
const bookStage = (page) => page.evaluate(() => {
  const stage = document.querySelector('[data-eco-stage]').getBoundingClientRect();
  const deepest = Math.max(...[...document.querySelectorAll('[data-eco-stage] .eco-intro > *, [data-book-body]')].filter((el) => el.offsetParent).map((el) => el.getBoundingClientRect().bottom));
  return { top: stage.top, deepest };
});
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
  await wait(page, 2600); // the wheel blooms open on arrival
  await shot(page, 'desktop-hero');

  // Header and scrolling
  check('hero headline is dark on cream and readable', await page.evaluate(() => getComputedStyle(document.querySelector('.hero')).backgroundColor === 'rgb(248, 246, 234)' && getComputedStyle(document.querySelector('.hero__title')).color === 'rgb(29, 26, 23)'));
  check('the wheel shows at least five arches on screen', await page.evaluate(() => [...document.querySelectorAll('[data-petal]')].filter((petal) => { const box = petal.getBoundingClientRect(); return getComputedStyle(petal).opacity > 0.9 && box.width > 150 && box.right > 0 && box.left < innerWidth && box.top < innerHeight; }).length >= 5));
  check('the arch in focus sits at the top, centred and named', await page.evaluate(() => { const petal = document.querySelector('[data-petal].is-focus'); const box = petal.getBoundingClientRect(); return Math.abs(box.left + box.width / 2 - innerWidth / 2) < 4 && box.top < innerHeight * 0.2 && getComputedStyle(petal.querySelector('.petal__label')).opacity > 0.95; }));
  check('the headline sits clear of the arches', await page.evaluate(() => { const title = document.querySelector('.hero__title').getBoundingClientRect(); return [...document.querySelectorAll('[data-petal]')].every((petal) => { const box = petal.querySelector('img').getBoundingClientRect(); const inner = { left: box.left + box.width * 0.3, right: box.right - box.width * 0.3, top: box.top + box.height * 0.3, bottom: box.bottom - box.height * 0.3 }; return inner.right < title.left || inner.left > title.right || inner.bottom < title.top || inner.top > title.bottom; }); }));
  const firstFocus = await page.evaluate(() => document.querySelector('[data-petal].is-focus').dataset.id);
  await wait(page, 5600);
  check('the wheel turns to the next arch on its own', (await page.evaluate(() => document.querySelector('[data-petal].is-focus').dataset.id)) !== firstFocus);
  await page.evaluate(() => window.scrollTo({ top: innerHeight, behavior: 'instant' }));
  await wait(page, 2200);
  check('scrolling opens the wheel outwards and lifts the headline away', await page.evaluate(() => getComputedStyle(document.querySelector('[data-hero-content]')).opacity < 0.05 && [...document.querySelectorAll('[data-petal]')].every((petal) => { const box = petal.getBoundingClientRect(); return box.bottom < innerHeight * 0.55 || box.top > innerHeight || box.left > innerWidth * 0.6 || box.right < innerWidth * 0.4 || getComputedStyle(petal).opacity < 0.05; })));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(page, 1500);
  await page.click('.primary-nav a[href="#services"]');
  await wait(page, 1600);
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

  // Intent section
  await goTo(page, '[data-intents]', 120);
  await page.hover('.intent[data-intent="services"] .intent__row');
  await wait(page, 1400);
  check('pointing at an intent previews its destination', await page.evaluate(() => !document.querySelector('[data-intent-panel="services"]').hidden && document.querySelector('[data-intent-image="services"]').classList.contains('is-active') && document.querySelector('.intent[data-intent="services"]').classList.contains('is-active')));
  await shot(page, 'desktop-intents');
  await page.click('[data-intent-panel="services"] a[data-service-jump="super-app"]');
  await wait(page, 1800);
  check('intent quick link leads to that service', await page.evaluate(() => { const tile = document.querySelector('#service-super-app'); const box = tile.getBoundingClientRect(); return tile.classList.contains('is-called') && box.top >= 0 && box.bottom <= innerHeight; }));
  await goTo(page, '[data-intents]', 120);
  await page.click('.intent[data-intent="communities"] .intent__row');
  await wait(page, 1600);
  check('intent line goes to its section', await page.evaluate(() => Math.abs(document.querySelector('#communities').getBoundingClientRect().top) < 80));

  // Motion layer
  check('buttons carry a rolling label', await page.evaluate(() => document.querySelectorAll('.btn .roll__inner').length > 5 && document.querySelector('.site-header__enquire .roll').getBoundingClientRect().height < 30));
  check('pointer follower is active for mouse users', await page.evaluate(() => document.documentElement.classList.contains('has-cursor')));

  // Ecosystem: the Bloom book
  await goTo(page, '#ecosystem', 0);
  await toBookStep(page, 0);
  check('the book waits closed on its cover', await page.evaluate(() => getComputedStyle(document.querySelector('.book-cover')).visibility !== 'hidden' && document.querySelector('.book__leaf').style.transform.includes('rotateY(0') ));
  await toBookStep(page, 1);
  const stage = await bookStage(page);
  check('the book and its index fit one laptop screen while they hold still', Math.abs(stage.top) < 2 && stage.deepest <= 900 + 1, stage);
  check('scrolling opens the cover onto the first business', (await activeVertical(page)) === 'real-estate' && await page.evaluate(() => {
    const story = document.querySelector('#panel-real-estate').getBoundingClientRect();
    const photo = document.querySelector('[data-vertical-image="real-estate"]').getBoundingClientRect();
    const book = document.querySelector('[data-book-body]').getBoundingClientRect();
    return photo.right <= book.left + book.width / 2 + 2 && story.left >= book.left + book.width / 2 - 2;
  }));
  for (let i = 0; i < 3; i += 1) {
    await page.mouse.move(1000, 500);
    await page.mouse.wheel(0, 260);
    await wait(page, 450);
  }
  await wait(page, 1800);
  check('scrolling on turns the page to the next business', (await activeVertical(page)) !== 'real-estate' && await page.evaluate(() => document.querySelectorAll('.book__leaf')[1].style.transform.includes('rotateY(-180')), await activeVertical(page));
  check('the book always comes to rest on a whole spread', await page.evaluate(() => [...document.querySelectorAll('.book__leaf')].every((leaf) => /rotateY\((0|-0|-180)(\.00)?deg\)/.test(leaf.style.transform))));
  await page.click('.eco-index__item[data-vertical="hospitality"]');
  await wait(page, 3200);
  check('the index turns to a business', (await activeVertical(page)) === 'hospitality' && await page.evaluate(() => { const box = document.querySelector('#panel-hospitality').getBoundingClientRect(); return box.top > 0 && box.bottom < innerHeight; }));
  check('only the story in view can take focus', await page.evaluate(() => !document.querySelector('#panel-hospitality').inert && document.querySelector('#panel-real-estate').inert));
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
  await page.click('[data-dock-link="life"]');
  await wait(page, 2200);
  check('dock link jumps to its section', await page.evaluate(() => Math.abs(document.querySelector('#life').getBoundingClientRect().top) < 90 && document.querySelector('[data-dock-list]').hidden));

  // Hero controls
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(page, 600);
  // Pick the business two steps round to the right and click it: it turns to the top.
  const target = await page.evaluate(() => { const petals = [...document.querySelectorAll('[data-petal]')]; const now = petals.findIndex((petal) => petal.classList.contains('is-focus')); const next = petals.findIndex((petal, i) => i > now && petal.dataset.kind === 'business' && i - now <= 3); return next; });
  await page.click(`[data-petal] >> nth=${target}`, { force: true });
  await wait(page, 1700);
  check('clicking an arch turns it to the top', await page.evaluate((i) => document.querySelectorAll('[data-petal]')[i].classList.contains('is-focus'), target));
  const business = await page.evaluate((i) => document.querySelectorAll('[data-petal]')[i].dataset.id, target);
  await page.click(`[data-petal] >> nth=${target}`, { force: true });
  await wait(page, 2200);
  check('clicking the arch in focus opens that business in the ecosystem', (await activeVertical(page)) === business && await page.evaluate(() => { const box = document.querySelector('#ecosystem').getBoundingClientRect(); return box.top < innerHeight * 0.5 && box.bottom > innerHeight * 0.5; }));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(page, 900);
  const before = await page.evaluate(() => document.querySelector('[data-petal].is-focus').dataset.id);
  await page.mouse.move(1000, 260);
  await page.mouse.down();
  await page.mouse.move(820, 262, { steps: 6 });
  await page.mouse.move(600, 265, { steps: 6 });
  await page.mouse.up();
  await wait(page, 2000);
  check('dragging turns the wheel', (await page.evaluate(() => document.querySelector('[data-petal].is-focus').dataset.id)) !== before);
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
  check('phone: three arches show across the top', await page.evaluate(() => [...document.querySelectorAll('[data-petal]')].filter((petal) => { const box = petal.getBoundingClientRect(); return getComputedStyle(petal).opacity > 0.9 && box.right > 40 && box.left < innerWidth - 40 && box.top < innerHeight * 0.45; }).length >= 3));
  await goTo(page, '[data-intents]', 90);
  check('each intent shows its own picture on a phone', await page.evaluate(() => [...document.querySelectorAll('.intent__thumb')].every((thumb) => thumb.getBoundingClientRect().width > 40)));
  await page.tap('.intent[data-intent="services"] .intent__row');
  await wait(page, 1800);
  check('intent line takes you to its section on a phone', await page.evaluate(() => Math.abs(document.querySelector('#services').getBoundingClientRect().top) < 90));
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

  await goTo(page, '#ecosystem', 0);
  await toBookStep(page, 0);
  check('on a phone the businesses are a deck of pages', await page.evaluate(() => document.querySelectorAll('.deck-card').length === 7 && document.querySelector('[data-book-body]').classList.contains('is-deck')));
  await toBookStep(page, 2);
  const deck = await page.evaluate(() => [...document.querySelectorAll('.deck-card')].map((card) => card.style.opacity));
  check('scrolling flips the deck to the next pages on a phone', (await activeVertical(page)) === 'hospitality' && Number(deck[0]) < 0.05 && Number(deck[2]) > 0.95, { active: await activeVertical(page), deck });
  await shot(page, 'phone-ecosystem');

  await goTo(page, '#life', 0);
  await page.evaluate(() => window.scrollBy({ top: 700, behavior: 'instant' }));
  await wait(page, 1800);
  check('life section pins on a phone', await page.evaluate(() => Math.abs(document.querySelector('[data-life-stage]').getBoundingClientRect().top) < 2 && !document.querySelectorAll('[data-life-chapter]')[0].classList.contains('is-active')));
  await shot(page, 'phone-life');

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
  await goTo(page, '#ecosystem', 0);
  await toBookStep(page, 3);
  check('scrolling turns the book on a tablet', (await activeVertical(page)) === 'hospitality');
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
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal], [data-split], .hero__word, .community:not([hidden]), .intent__line, .app-tile, .stat__value, .eco-item, .chapter__text')].filter((element) => {
    const style = getComputedStyle(element);
    return style.visibility === 'hidden' || Number(style.opacity) < 0.99;
  }).length);
  check('all content is visible without animation', hidden === 0, hidden);
  await goTo(page, '[data-search]', 200);
  await page.click('[data-search-submit]');
  await wait(page, 400);
  check('search still works', (await page.textContent('[data-result-summary]')) === 'Homes to buy across all Bloom communities');
  await goTo(page, '#ecosystem', 120);
  await page.click('.eco-index__item[data-vertical="landscaping"]');
  await wait(page, 300);
  check('ecosystem still works', (await activeVertical(page)) === 'landscaping' && await page.evaluate(() => { const box = document.querySelector('#panel-landscaping').getBoundingClientRect(); return box.top < innerHeight && box.bottom > 0; }));
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
