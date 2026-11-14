// Customer Services: the three Bloom apps, and a way to get them, as a grid of tiles.
// Tiles rise in one after another as the section arrives; a soft light follows the pointer
// across each tile and the tile leans towards it; a glint sweeps across them in turn (CSS).
// Links from the menu, the intents or the footer bring the right app's tile forward.

import { $, $$, emit, finePointer, listen, scrollToTarget } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

// The menu's "Construction updates" lives in the Super App.
const TILE_FOR = { 'construction-updates': 'super-app' };

export function initServices() {
  const grid = $('[data-apps]');
  if (!grid) return;
  const section = grid.closest('section');
  const tiles = $$('[data-app-tile]', grid);

  // From elsewhere on the page: bring that app's tile forward, or open the enquiry.
  listen('bloom:service', ({ id }) => {
    if (id === 'enquiry') {
      emit('bloom:enquire', { interest: 'support' });
      return;
    }
    const tile = $(`#service-${TILE_FOR[id] || id}`);
    if (!tile) return;
    scrollToTarget(section);
    tiles.forEach((item) => item.classList.remove('is-called'));
    setTimeout(() => {
      tile.classList.add('is-called');
      $('.app-tile__go', tile)?.focus({ preventScroll: true });
    }, motionOK ? 700 : 0);
    setTimeout(() => tile.classList.remove('is-called'), 4500);
  });

  // The whole tile is its button: a click anywhere on it presses the arrow.
  tiles.forEach((tile) => {
    const go = $('.app-tile__go', tile);
    if (!go) return;
    tile.addEventListener('click', (event) => {
      if (!event.target.closest('button, a')) go.click();
    });
  });

  if (!motionOK) return;

  /* ---------- Pointer: a light that follows it, and a gentle lean ---------- */

  if (finePointer()) {
    tiles.forEach((tile) => {
      gsap.set(tile, { transformPerspective: 1100 });
      const leanX = gsap.quickTo(tile, 'rotationX', { duration: 0.8, ease: 'power3.out' });
      const leanY = gsap.quickTo(tile, 'rotationY', { duration: 0.8, ease: 'power3.out' });
      tile.addEventListener('pointermove', (event) => {
        const box = tile.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width;
        const y = (event.clientY - box.top) / box.height;
        tile.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        tile.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        tile.style.setProperty('--spot', '1');
        leanX((0.5 - y) * 4);
        leanY((x - 0.5) * 4);
      });
      tile.addEventListener('pointerleave', () => {
        tile.style.setProperty('--spot', '0');
        leanX(0);
        leanY(0);
      });
    });
  }

  /* ---------- The arch outlines drift, and slide past as you scroll ---------- */

  $$('[data-services-deco] i', section).forEach((item, i) => {
    gsap.to(item, { y: i % 2 ? 26 : -22, rotation: i % 2 ? -2 : 2, duration: 7 + i * 1.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });
  gsap.fromTo($('[data-services-deco]', section), { yPercent: 8 }, {
    yPercent: -8,
    ease: 'none',
    scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1 },
  });

  /* ---------- Entrance: the tiles rise one after another ---------- */

  const media = tiles.map((tile) => $('.app-tile__media img', tile)).filter(Boolean);
  const words = tiles.flatMap((tile) => $$('.app-tile__body > *, .app-tile--get > *', tile));
  gsap.set(tiles, { autoAlpha: 0, y: 70, clipPath: 'inset(18% 0% 0% 0% round 32px)' });
  gsap.set(media, { scale: 1.2 });
  gsap.set(words, { autoAlpha: 0, y: 16 });
  ScrollTrigger.create({
    trigger: grid,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.timeline()
        .to(tiles, { autoAlpha: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 32px)', duration: 1.2, stagger: 0.12, ease: EASE.out, clearProps: 'clipPath,transform' }, 0)
        .to(media, { scale: 1, duration: 1.6, stagger: 0.12, ease: EASE.out, clearProps: 'transform' }, 0)
        .to(words, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.04, ease: EASE.out, clearProps: 'transform' }, 0.35);
    },
  });
}
