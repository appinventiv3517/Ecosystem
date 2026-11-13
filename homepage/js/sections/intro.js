// Page-load sequence. Three arches rise from the floor while a counter runs to 100 and the
// proposition is spelled out word by word. When loading is done each arch flies up into
// the headline and becomes one of its three pictures, the wordmark settles into the
// header, the headline letters rise, and the photograph window glides up from below.

import { $, $$, imageReady } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';

const root = document.documentElement;
const SMOOTH = 'power3.out';

/** Entrance for the header and hero. The chips are left out when the arches fly into them. */
function contentTimeline({ withChips = true, withBrand = true } = {}) {
  const timeline = gsap.timeline();
  const bar = $('.site-header__bar');
  const headerItems = [withBrand ? $('.brand') : null, ...$$('.primary-nav'), ...$$('.site-header__tools > *')];
  const letters = $$('.hero__char');
  const win = $('[data-hero-window]');

  timeline
    // While the wordmark flies into the logo, the capsule only fades in: moving it would move the landing spot.
    .fromTo(bar, withBrand ? { autoAlpha: 0, y: -14, scale: 0.97 } : { autoAlpha: 0 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: SMOOTH, clearProps: 'transform' }, 0)
    .fromTo(headerItems.filter(Boolean), { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.06, ease: SMOOTH }, 0.1)
    .fromTo('[data-hero-eyebrow]', { autoAlpha: 0, y: 14, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: SMOOTH }, 0.1)
    .fromTo(letters.length ? letters : '.hero__word', { yPercent: 120, rotate: 8 }, { yPercent: 0, rotate: 0, duration: 1.15, stagger: 0.03, ease: EASE.out }, 0.15)
    .fromTo('[data-hero-lede]', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: SMOOTH }, 0.55)
    .fromTo('[data-hero-actions] .btn', { autoAlpha: 0, y: 18, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.08, ease: SMOOTH, clearProps: 'transform' }, 0.65)
    .fromTo(win, { y: () => window.innerHeight * 0.7 }, { y: 0, duration: 1.5, ease: EASE.out }, 0.45)
    .fromTo('[data-hero-media]', { scale: 1.35 }, { scale: 1.12, duration: 1.9, ease: EASE.out }, 0.45)
    .fromTo('[data-scroll-badge]', { autoAlpha: 0, scale: 0.4, rotate: -90 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.1, ease: 'back.out(1.6)' }, 1.1);
  if (withChips) {
    timeline.fromTo('[data-chip]', { scale: 0, rotate: -18 }, { scale: 1, rotate: 0, duration: 0.9, stagger: 0.1, ease: 'back.out(1.7)' }, 0.35);
  }
  return timeline;
}

export async function playIntro() {
  const overlay = $('[data-intro]');
  if (!motionOK) {
    overlay?.remove();
    return;
  }

  const brand = $('[data-brand]');
  const mark = $('[data-intro-mark]');

  if (!root.classList.contains('is-intro')) {
    overlay?.remove();
    contentTimeline().progress(1);
    return;
  }

  const arches = $$('[data-intro-arch]', overlay);
  const archImages = arches.map((arch) => $('img', arch));
  const chips = $$('[data-chip]');
  const words = $$('[data-intro-words] span, [data-intro-words] i', overlay);
  const count = $('[data-intro-count]', overlay);
  const bar = $('[data-intro-bar]', overlay);
  const furniture = [$('[data-intro-words]', overlay), count.parentElement, bar.parentElement];

  const content = contentTimeline({ withChips: false, withBrand: false }).pause();
  gsap.set(brand, { autoAlpha: 0 });
  gsap.set(chips, { autoAlpha: 0 });
  gsap.set(arches, { scaleY: 0 });
  gsap.set(archImages, { yPercent: 30, scale: 1.3 });
  gsap.set(words, { autoAlpha: 0, y: 12 });

  // The hero is cream like the loader, so the overlay can let it show through from here on.
  overlay.style.display = 'block';
  overlay.style.background = 'transparent';
  root.classList.remove('is-intro');

  // Rise, and count. The counter waits for the pictures before it reaches 100.
  const counter = { value: 0 };
  const show = () => {
    count.textContent = Math.round(counter.value);
    bar.style.setProperty('--p', counter.value / 100);
  };
  const rise = gsap.timeline()
    .to(arches, { scaleY: 1, duration: 1.2, stagger: 0.12, ease: SMOOTH }, 0.15)
    .to(archImages, { yPercent: 0, scale: 1, duration: 1.4, stagger: 0.12, ease: SMOOTH }, 0.25)
    .to(words, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.14, ease: SMOOTH }, 0.4)
    .to(counter, { value: 86, duration: 1.6, ease: 'power2.out', onUpdate: show }, 0);

  await Promise.all([rise.then(), ...archImages.map((image) => imageReady(image, 3000))]);
  await gsap.to(counter, { value: 100, duration: 0.45, ease: 'power1.inOut', onUpdate: show }).then();
  mark.style.animation = 'none';

  // Lift each arch out of its row and send it to the headline picture it becomes.
  const flights = arches.map((arch, i) => {
    const from = arch.getBoundingClientRect();
    const to = chips[i].getBoundingClientRect();
    overlay.append(arch);
    gsap.set(arch, {
      position: 'fixed', left: from.left, top: from.top, width: from.width, height: from.height,
      margin: 0, scaleY: 1, borderRadius: `${from.width / 2}px ${from.width / 2}px 0px 0px`,
    });
    const r = getComputedStyle(chips[i]);
    const corner = (value) => (value.endsWith('%') ? (parseFloat(value) / 100) * to.width : Math.min(parseFloat(value), to.width / 2, to.height / 2));
    const radius = [r.borderTopLeftRadius, r.borderTopRightRadius, r.borderBottomRightRadius, r.borderBottomLeftRadius].map(corner).map((n) => `${n}px`).join(' ');
    return { arch, to, radius };
  });

  // Where the wordmark has to travel to sit exactly on the header logo.
  const fromMark = mark.getBoundingClientRect();
  const toMark = brand.getBoundingClientRect();

  await new Promise((resolve) => {
    const timeline = gsap.timeline({ onComplete: resolve })
      .to(furniture, { autoAlpha: 0, y: 12, duration: 0.45, stagger: 0.05, ease: 'power2.in' }, 0)
      .to(mark, { x: toMark.left - fromMark.left, y: toMark.top - fromMark.top, scale: toMark.width / fromMark.width, duration: 1.25, ease: 'power3.inOut' }, 0.1)
      .add(() => root.classList.remove('is-locked'), 0.9)
      .add(content.play(), 0.5)
      .add(() => {
        gsap.set(chips, { autoAlpha: 1 });
        overlay.remove();
      }, 1.55);
    flights.forEach(({ arch, to, radius }, i) => {
      timeline.to(arch, {
        left: to.left, top: to.top, width: to.width, height: to.height, borderRadius: radius,
        duration: 1.25, ease: 'power3.inOut',
      }, 0.15 + i * 0.08);
    });
    // Hand the wordmark over to the header logo once it has landed.
    timeline.to(mark, { autoAlpha: 0, duration: 0.25, ease: 'none' }, 1.3).to(brand, { autoAlpha: 1, duration: 0.25, ease: 'none' }, 1.3);
  });
}
