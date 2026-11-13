// Page-load sequence. Three arches rise from the floor while a counter runs to 100 and the
// proposition is spelled out word by word. The centre arch is the hero photograph itself:
// when loading is done the side arches drop away, the centre arch opens out to fill the
// screen, the wordmark flies into the header and the headline letters rise into place.

import { $, $$, imageReady } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';

const root = document.documentElement;

/** Entrance for the header and hero copy. Also used on its own when the intro is skipped. */
function contentTimeline() {
  const timeline = gsap.timeline();
  const headerItems = [...$$('.primary-nav'), ...$$('.site-header__tools > *')];
  const lines = $$('[data-hero-lines] path');
  const letters = $$('.hero__char');

  timeline
    .fromTo(headerItems, { autoAlpha: 0, y: -24 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, ease: EASE.out }, 0)
    .fromTo('[data-hero-eyebrow]', { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.9, ease: EASE.soft }, 0.1)
    .fromTo(letters.length ? letters : '.hero__word', { yPercent: 125, rotate: 10 }, { yPercent: 0, rotate: 0, duration: 1.2, stagger: 0.032, ease: EASE.out }, 0.12)
    .fromTo('[data-hero-lede]', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 1, ease: EASE.soft }, 0.6)
    .fromTo('[data-hero-actions] .btn', { autoAlpha: 0, y: 22, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, stagger: 0.1, ease: 'back.out(1.7)', clearProps: 'transform' }, 0.75)
    .fromTo(lines, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2, stagger: 0.2, ease: EASE.smooth }, 0.3)
    .fromTo('.vignette', { autoAlpha: 0, y: 90, rotate: (i) => [-8, 4, 10][i] || 0 }, { autoAlpha: 1, y: 0, rotate: 0, duration: 1.4, stagger: 0.14, ease: 'back.out(1.4)' }, 0.5)
    .fromTo('[data-scroll-badge]', { autoAlpha: 0, scale: 0.4, rotate: -90 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.1, ease: 'back.out(1.6)' }, 0.9)
    .fromTo('[data-hero-controls]', { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: 0.9, ease: EASE.out }, 1);
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

  const sides = $$('[data-intro-arch]', overlay);
  const centre = $('[data-intro-centre]', overlay);
  const words = $$('[data-intro-words] span, [data-intro-words] i', overlay);
  const count = $('[data-intro-count]', overlay);
  const bar = $('[data-intro-bar]', overlay);
  const furniture = [$('[data-intro-words]', overlay), count.parentElement, bar.parentElement];

  // The hero photograph is clipped to the centre arch, starting flat on the floor.
  const box = centre.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const radius = box.width / 2;
  const arch = (top) => `inset(${top}px ${vw - box.right}px ${vh - box.bottom}px ${box.left}px round ${radius}px ${radius}px 0px 0px)`;
  const full = 'inset(0px 0px 0px 0px round 0px 0px 0px 0px)';

  const content = contentTimeline().pause();
  gsap.set(brand, { autoAlpha: 0 });
  gsap.set(media, { clipPath: arch(box.bottom) });
  gsap.set(firstImage, { scale: 1.6 });
  gsap.set(sides, { scaleY: 0 });
  gsap.set($$('img', overlay).filter((image) => image !== mark), { yPercent: 30, scale: 1.3 });
  gsap.set(words, { autoAlpha: 0, y: 12 });

  // From here the hero shows through: the overlay keeps only its own pieces.
  overlay.style.display = 'block';
  overlay.style.background = 'transparent';
  root.classList.remove('is-intro');

  // Rise, and count. The counter waits for the photographs before it reaches 100.
  const counter = { value: 0 };
  const show = () => {
    count.textContent = Math.round(counter.value);
    bar.style.setProperty('--p', counter.value / 100);
  };
  const rise = gsap.timeline()
    .to(media, { clipPath: arch(box.top), duration: 1.3, ease: EASE.out }, 0.15)
    .to(firstImage, { scale: 1.35, duration: 1.6, ease: EASE.out }, 0.15)
    .to(sides, { scaleY: 1, duration: 1.1, stagger: 0.12, ease: EASE.out }, 0.3)
    .to($$('img', overlay).filter((image) => image !== mark), { yPercent: 0, scale: 1, duration: 1.3, ease: EASE.out }, 0.4)
    .to(words, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.14, ease: EASE.soft }, 0.4)
    .to(counter, { value: 86, duration: 1.6, ease: 'power2.out', onUpdate: show }, 0);

  await Promise.all([
    rise.then(),
    imageReady(firstImage, 3000),
    ...sides.map((side) => imageReady($('img', side), 3000)),
  ]);
  await gsap.to(counter, { value: 100, duration: 0.45, ease: 'power1.inOut', onUpdate: show }).then();
  mark.style.animation = 'none';

  // Where the wordmark has to travel to sit exactly on the header logo.
  const from = mark.getBoundingClientRect();
  const to = brand.getBoundingClientRect();

  await new Promise((resolve) => {
    gsap
      .timeline({ onComplete: resolve })
      .to(sides, { yPercent: 115, duration: 0.8, stagger: 0.08, ease: 'power3.in' }, 0)
      .to(furniture, { autoAlpha: 0, y: 16, duration: 0.5, stagger: 0.05, ease: 'power2.in' }, 0)
      .to(media, { clipPath: full, duration: 1.45, ease: EASE.inOut }, 0.35)
      .to(firstImage, { scale: 1.1, duration: 1.7, ease: EASE.inOut }, 0.35)
      .to(mark, { x: to.left - from.left, y: to.top - from.top, scale: to.width / from.width, duration: 1.3, ease: EASE.inOut }, 0.35)
      .to(mark, { autoAlpha: 0, duration: 0.3, ease: 'none' }, 1.5)
      .to(brand, { autoAlpha: 1, duration: 0.3, ease: 'none' }, 1.5)
      .add(() => root.classList.remove('is-locked'), 1.3)
      .add(content.play(), 1.05);
  });

  gsap.set(media, { clearProps: 'clipPath' });
  overlay.remove();
}
