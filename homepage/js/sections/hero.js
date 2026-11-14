// Hero: the cinematic opening. It starts at once (no loader): the photograph settles from a
// slow push-in, the headline words rise out of their masks, the arch window wipes open and its
// outline draws in. Scrolling away, the layers part at different speeds, and with a mouse the
// floating frames lean a little towards the pointer.

import { $, $$, finePointer } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';

export function initHero() {
  const hero = $('[data-hero]');
  if (!hero || !motionOK) return;

  const media = $('[data-hero-media]', hero);
  const bg = $('[data-hero-bg]', hero);
  const words = $$('.hero__word', hero);
  const fades = $$('[data-hero-fade]', hero);
  const windowFrame = $('[data-hero-window]', hero);
  const windowImage = $('img', windowFrame);
  const chip = $('[data-hero-chip]', hero);
  const arc = $('[data-hero-arc] path', hero);
  const inner = $('.hero__inner', hero);

  /* ---------- Opening ---------- */

  gsap.timeline({ defaults: { ease: EASE.out } })
    .fromTo(bg, { scale: 1.2 }, { scale: 1.04, duration: 3.2, ease: 'expo.out' }, 0)
    .fromTo(words, { y: 0, yPercent: 110 }, { yPercent: 0, duration: 1.5, stagger: 0.12, ease: 'expo.out' }, 0.1)
    .fromTo(fades, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.1 }, 0.55)
    .fromTo(windowFrame, { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 0px 0px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 999px 999px 0px 0px)',
      duration: 1.6,
      ease: 'expo.inOut',
    }, 0.25)
    .fromTo(windowImage, { scale: 1.35 }, { scale: 1, duration: 2.2, ease: 'expo.out' }, 0.45)
    .fromTo(chip, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 1.4, ease: 'expo.out' }, 0.9)
    .fromTo(arc, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut' }, 0.7);

  /* ---------- Scrolling away: the layers part ---------- */

  const away = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
  gsap.to(media, { yPercent: 22, scale: 1.08, ease: 'none', scrollTrigger: away });
  gsap.to(inner, { yPercent: -18, autoAlpha: 0.15, ease: 'none', scrollTrigger: away });
  gsap.to(windowFrame, { yPercent: -45, ease: 'none', scrollTrigger: away });
  gsap.to(chip, { yPercent: -110, ease: 'none', scrollTrigger: away });
  gsap.to('[data-hero-arc]', { yPercent: -28, ease: 'none', scrollTrigger: away });

  /* ---------- Pointer depth (mouse only) ---------- */

  if (!finePointer()) return;
  const layers = [
    [windowFrame, 18],
    [chip, 34],
    [$('[data-hero-arc]', hero), 10],
    [bg, -10],
  ].map(([element, amount]) => ({
    amount,
    x: gsap.quickTo(element, 'x', { duration: 1.2, ease: 'power3.out' }),
    y: gsap.quickTo(element, 'y', { duration: 1.2, ease: 'power3.out' }),
  }));
  hero.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    layers.forEach((layer, index) => {
      layer.x(x * layer.amount);
      // The chip's vertical position belongs to its entrance; only the others move up and down.
      if (index !== 1) layer.y(y * layer.amount * 0.6);
    });
  });
  hero.addEventListener('pointerleave', () => layers.forEach((layer, index) => {
    layer.x(0);
    if (index !== 1) layer.y(0);
  }));
}
