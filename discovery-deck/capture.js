// Captures the live Bloom Holding homepage (genuine screenshots, nothing fabricated).
// Usage: node capture.js   -> assets/home-*.png + qa/home-info.json
// Note: third-party hosts (e.g. player.vimeo.com for the hero video) may be blocked in the
// capture environment; the hero background video then does not render.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy } } : {});
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const failed = new Set();
  page.on('requestfailed', r => { try { failed.add(new URL(r.url()).host); } catch {} });
  await page.goto('https://bloomholding.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(12000);
  await page.screenshot({ path: 'assets/home-hero.png' });
  await page.mouse.move(720, 450);

  // wheel down (as a visitor would) until the element containing `needle` sits at `targetTop`
  const topOf = needle => page.evaluate(n => {
    const all = [...document.querySelectorAll('h1,h2,h3,p,div,span,a,footer')];
    const el = n === '__footer__' ? document.querySelector('footer')
      : all.filter(e => e.children.length === 0 && e.textContent.trim().startsWith(n) && e.getBoundingClientRect().height > 0)[0];
    return el ? el.getBoundingClientRect().top : null;
  }, needle);
  const shoot = async (needle, targetTop, name) => {
    for (let i = 0; i < 400; i++) {
      const t = await topOf(needle);
      if (t === null) { console.log('not found:', needle); break; }
      if (t <= targetTop) break;
      await page.mouse.wheel(0, Math.min(200, Math.max(20, t - targetTop))); await page.waitForTimeout(250);
    }
    await page.waitForTimeout(2000);
    console.log(name, 'top =', await topOf(needle));
    await page.screenshot({ path: `assets/${name}.png` });
  };
  await shoot('Curated Community Living', 110, 'home-ccl');
  await shoot('Invest in Bloom Living', 430, 'home-banner');
  await shoot('We are a master developer', 120, 'home-statement');
  await shoot('02.', 60, 'home-verticals');
  await shoot('Follow us on Social Media', 60, 'home-footer');

  const info = await page.evaluate(() => ({ title: document.title, text: document.body.innerText,
    links: [...document.querySelectorAll('header a, nav a')].map(a => [a.innerText.trim(), a.href]).filter(x => x[0]) }));
  fs.writeFileSync('qa/home-info.json', JSON.stringify(info, null, 1));
  console.log('failed hosts:', [...failed].join(', '));
  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
