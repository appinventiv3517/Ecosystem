// Page-load sequence: the Bloom wordmark, an arch that rises and opens into the hero image,
// the wordmark settling into the header, then navigation and headline arriving in a stagger.

import { $, $$, imageReady } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';

const root = document.documentElement;

/** Entrance for the header and hero copy. Also used on its own when the intro is skipped. */
function contentTimeline() {
  const timeline = gsap.timeline();
  const headerItems = [...$$('.primary-nav .nav-item'), ...$$('.site-header__tools > *')];
  const lines = $$('[data-hero-lines] path');

  timeline
    .fromTo(headerItems, { autoAlpha: 0, y: -18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.06, ease: EASE.soft }, 0)
    .fromTo('[data-hero-eyebrow]', { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.9, ease: EASE.soft }, 0.1)
    .fromTo('.hero__word', { yPercent: 118, rotate: 2.5 }, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.12, ease: EASE.out }, 0.15)
    .fromTo('[data-hero-lede]', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 1, ease: EASE.soft }, 0.6)
    .fromTo('[data-hero-actions] .btn', { autoAlpha: 0, y: 22, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, stagger: 0.1, ease: EASE.out, clearProps: 'transform' }, 0.75)
    .fromTo(lines, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2, stagger: 0.2, ease: EASE.smooth }, 0.3)
    .fromTo('.vignette', { autoAlpha: 0, y: 80 }, { autoAlpha: 1, y: 0, duration: 1.4, stagger: 0.14, ease: EASE.out }, 0.55)
    .fromTo('[data-hero-foot]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9 }, 1);
  return timeline;
}

export async function playIntro() {
  const overlay = $('[data-intro]');
  if (!motionOK) {
    overlay?.remove();
    return;
  }

  const withIntro = root.classList.contains('is-intro');
  const media = $('[data-hero-media]');
  const firstImage = $('[data-hero-slide] img');
  const brand = $('[data-brand]');
  const mark = $('[data-intro-mark]');

  if (!withIntro) {
    overlay?.remove();
    gsap.set(brand, { autoAlpha: 1 });
    contentTimeline().progress(1);
    return;
  }

  // Let the wordmark finish its CSS entrance and the first image arrive (within reason).
  await Promise.all([
    imageReady(firstImage, 2500),
    Promise.all(mark.getAnimations().map((animation) => animation.finished.catch(() => {}))),
  ]);
  mark.style.animation = 'none';

  const portrait = window.innerWidth < 760;
  const arch = portrait ? { top: 56, side: 26, radius: 24 } : { top: 50, side: 39.5, radius: 10.5 };
  const corners = `round ${arch.radius}vw ${arch.radius}vw 0vw 0vw`;
  const shut = `inset(100% ${arch.side}% 0% ${arch.side}% ${corners})`;
  const door = `inset(${arch.top}% ${arch.side}% 0% ${arch.side}% ${corners})`;
  const open = 'inset(0% 0% 0% 0% round 0vw 0vw 0vw 0vw)';

  // Where the wordmark has to travel to sit exactly on the header logo.
  const from = mark.getBoundingClientRect();
  const to = brand.getBoundingClientRect();

  const content = contentTimeline().pause();
  gsap.set(brand, { autoAlpha: 0 });
  gsap.set(media, { clipPath: shut });
  gsap.set(firstImage, { scale: 1.5 });

  // The hero now holds every hidden state itself, so the cream cover can go.
  overlay.style.display = 'grid';
  overlay.style.background = 'transparent';
  root.classList.remove('is-intro');

  await new Promise((resolve) => {
    gsap
      .timeline({ onComplete: resolve })
      .to(media, { clipPath: door, duration: 1, ease: EASE.out }, 0.1)
      .to(firstImage, { scale: 1.34, duration: 1, ease: EASE.out }, 0.1)
      .to(media, { clipPath: open, duration: 1.4, ease: EASE.inOut }, 1)
      .to(firstImage, { scale: 1.1, duration: 1.6, ease: EASE.inOut }, 1)
      .to(mark, { x: to.left - from.left, y: to.top - from.top, scale: to.width / from.width, duration: 1.3, ease: EASE.inOut }, 1)
      .to(mark, { autoAlpha: 0, duration: 0.35, ease: 'none' }, 2.15)
      .to(brand, { autoAlpha: 1, duration: 0.35, ease: 'none' }, 2.15)
      .add(() => root.classList.remove('is-locked'), 1.9)
      .add(content.play(), 1.75);
  });

  gsap.set(media, { clearProps: 'clipPath' });
  overlay.remove();
}
