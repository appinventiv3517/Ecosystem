// Hero: the headline's three pictures change on their own and wobble when pointed at; the
// photograph window rises and grows to fill the screen as you scroll; inside it, the three
// Bloom photographs rotate through an arch-shaped reveal.

import { $, $$, finePointer } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const SLIDE_SECONDS = 7;
const CHIP_SECONDS = 2.6;

/** Wrap every letter of the element's text in its own span, keeping inner tags such as <em>. */
function splitLetters(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    Array.from(node.textContent).forEach((letter) => {
      if (letter.trim() === '') {
        fragment.append(letter);
        return;
      }
      const span = document.createElement('span');
      span.className = 'hero__char';
      span.textContent = letter;
      fragment.append(span);
    });
    node.replaceWith(fragment);
  });
}

export function initHero() {
  const hero = $('[data-hero]');
  if (!hero) return { start() {} };
  if (motionOK) {
    $('[data-hero-title]', hero).setAttribute('aria-label', 'Curated Community Living');
    $$('.hero__word', hero).forEach((word) => {
      splitLetters(word);
      word.setAttribute('aria-hidden', 'true');
    });
  }

  const slides = $$('[data-hero-slide]', hero);
  const dots = $$('[data-hero-dot]', hero);
  const caption = $('[data-hero-caption]', hero);
  const pauseButton = $('[data-hero-pause]', hero);
  let current = 0;
  let timer = null;
  let userPaused = false;
  let inView = true;

  /* ---------- Slideshow inside the window ---------- */

  function setDots(index) {
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      dot.setAttribute('aria-current', i === index ? 'true' : 'false');
      $('i', dot).style.setProperty('--fill', i === index && !motionOK ? 1 : 0);
    });
  }

  /** The ring on the active thumbnail doubles as the autoplay clock. */
  function runTimer() {
    timer?.kill();
    if (!motionOK) return;
    const ring = $('i', dots[current]);
    timer = gsap.fromTo(ring, { '--fill': 0 }, {
      '--fill': 1,
      duration: SLIDE_SECONDS,
      ease: 'none',
      paused: userPaused || !inView || document.hidden,
      onComplete: () => go((current + 1) % slides.length),
    });
  }

  function go(index) {
    if (index === current) return;
    const previous = slides[current];
    const next = slides[index];
    const image = $('img', next);
    current = index;
    setDots(index);

    if (motionOK) {
      gsap.killTweensOf([next, image]);
      next.classList.add('is-active');
      gsap.set(slides, { zIndex: 0 });
      gsap.set(previous, { zIndex: 1 });
      gsap.set(next, { zIndex: 2 });
      // The next photograph opens out of an arch rising from the foot of the frame.
      gsap.fromTo(next, { clipPath: 'inset(58% 40% 0% 40% round 999px 999px 0px 0px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)',
        duration: 1.5,
        ease: EASE.inOut,
        onComplete: () => previous.classList.remove('is-active'),
      });
      gsap.fromTo(image, { scale: 1.25 }, { scale: 1.02, duration: SLIDE_SECONDS + 2.5, ease: 'power2.out' });
      gsap.timeline()
        .to(caption, { autoAlpha: 0, y: -8, duration: 0.3, ease: 'power2.in' })
        .add(() => (caption.textContent = next.dataset.caption))
        .to(caption, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' });
    } else {
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
      caption.textContent = next.dataset.caption;
    }
    runTimer();
  }

  function syncPlayback() {
    if (!timer) return;
    if (userPaused || !inView || document.hidden) timer.pause();
    else timer.resume();
  }

  dots.forEach((dot, index) => dot.addEventListener('click', () => go(index)));

  pauseButton?.addEventListener('click', () => {
    userPaused = !userPaused;
    pauseButton.setAttribute('aria-pressed', String(userPaused));
    pauseButton.setAttribute('aria-label', userPaused ? 'Resume image rotation' : 'Pause image rotation');
    $('[data-icon-pause]', pauseButton).hidden = userPaused;
    $('[data-icon-play]', pauseButton).hidden = !userPaused;
    syncPlayback();
  });

  document.addEventListener('visibilitychange', syncPlayback);
  setDots(0);

  /* ---------- Pictures in the headline ---------- */

  const chips = $$('[data-chip]', hero).map((chip) => ({
    chip,
    images: $$('img', chip),
    tag: $('[data-chip-tag]', chip),
    index: 0,
    hover: false,
    call: null,
  }));

  function turnChip(entry, to) {
    const previous = entry.images[entry.index];
    const next = entry.images[to];
    entry.index = to;
    if (!motionOK) {
      entry.images.forEach((image) => image.classList.toggle('is-active', image === next));
      if (entry.tag) entry.tag.textContent = next.dataset.label;
      return;
    }
    gsap.killTweensOf([previous, next]);
    gsap.set(entry.images, { zIndex: 0 });
    gsap.set(previous, { zIndex: 1 });
    gsap.set(next, { zIndex: 2 });
    next.classList.add('is-active');
    gsap.fromTo(next, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.35 }, {
      clipPath: 'inset(0% 0% 0% 0%)',
      scale: 1,
      duration: 1.05,
      ease: 'power3.inOut',
      onComplete: () => {
        previous.classList.remove('is-active');
        gsap.set(entry.images, { clearProps: 'zIndex,clipPath,scale' });
      },
    });
    gsap.to(previous, { scale: 1.15, duration: 1.05, ease: 'power3.inOut' });
    if (entry.tag) {
      gsap.timeline()
        .to(entry.tag, { y: -6, autoAlpha: 0, duration: 0.25, ease: 'power2.in' })
        .add(() => (entry.tag.textContent = next.dataset.label))
        .fromTo(entry.tag, { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'back.out(2)' });
    }
  }

  function cycleChip(entry, delay) {
    entry.call = gsap.delayedCall(delay, () => {
      if (inView && !entry.hover && !document.hidden) turnChip(entry, (entry.index + 1) % entry.images.length);
      cycleChip(entry, CHIP_SECONDS);
    });
  }

  if (!motionOK) {
    pauseButton?.setAttribute('hidden', '');
    return { start() {} };
  }

  // Pointing at a picture tips it playfully and brings up the next one.
  if (finePointer()) {
    chips.forEach((entry) => {
      entry.chip.addEventListener('pointerenter', () => {
        entry.hover = true;
        const tilt = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 5);
        gsap.to(entry.chip, { rotate: tilt, scale: 1.1, duration: 0.6, ease: 'back.out(2.4)', overwrite: 'auto' });
        turnChip(entry, (entry.index + 1) % entry.images.length);
      });
      entry.chip.addEventListener('pointerleave', () => {
        entry.hover = false;
        gsap.to(entry.chip, { rotate: 0, scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
      });
    });

    // Headline letters ripple when the pointer crosses a word.
    $$('.hero__word', hero).forEach((word) => {
      const letters = $$('.hero__char', word);
      if (!letters.length) return;
      word.addEventListener('pointerenter', () => {
        if (gsap.isTweening(letters[0])) return;
        gsap.to(letters, { keyframes: { yPercent: [0, -12, 0], ease: 'sine.inOut' }, duration: 0.7, stagger: 0.035 });
      });
    });
  }

  // Rotating badge: turns slowly, faster on hover and while the page is scrolling.
  const badgeRing = $('[data-badge-ring]', hero);
  if (badgeRing) {
    const spin = gsap.to(badgeRing, { rotation: 360, duration: 20, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
    const badge = $('[data-scroll-badge]', hero);
    badge.addEventListener('pointerenter', () => gsap.to(spin, { timeScale: 5, duration: 0.6 }));
    badge.addEventListener('pointerleave', () => gsap.to(spin, { timeScale: 1, duration: 0.8 }));
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: () => `+=${window.innerHeight}`,
      onUpdate: (self) => {
        gsap.to(spin, { timeScale: 1 + Math.min(Math.abs(self.getVelocity()) / 250, 8), duration: 0.2, overwrite: true });
        gsap.to(spin, { timeScale: 1, duration: 1.2, delay: 0.25 });
      },
    });
  }

  // Rotation and picture changes rest once the hero is covered.
  ScrollTrigger.create({
    trigger: '.opening',
    start: 'top top',
    end: () => `top+=${window.innerHeight * 1.9} top`,
    onToggle: (self) => {
      inView = self.isActive || window.scrollY < 10;
      syncPlayback();
    },
  });

  /**
   * As you scroll, the window rises and opens out to fill the screen while the headline
   * lifts away. Scrubbed with a little lag so it glides rather than tracking every wheel tick.
   * Built after the intro so it starts from the settled layout.
   */
  function buildRunway() {
    const win = $('[data-hero-window]', hero);
    const frame = $('[data-hero-frame]', hero);
    const media = $('[data-hero-media]', hero);
    const copy = $('[data-hero-content]', hero);
    const badge = $('[data-scroll-badge]', hero);
    const gutter = () => Math.max(parseFloat(getComputedStyle(copy).paddingLeft) || 16, 16);
    const radius = () => (window.innerWidth < 761 ? 28 : 40);

    gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: () => `+=${window.innerHeight}`, scrub: 1, invalidateOnRefresh: true },
    })
      .fromTo(win, { y: 0 }, { y: () => -win.offsetTop, ease: 'none' }, 0)
      .fromTo(frame,
        { clipPath: () => `inset(0px ${gutter()}px 0px ${gutter()}px round ${radius()}px ${radius()}px 0px 0px)` },
        { clipPath: 'inset(0px 0px 0px 0px round 0px 0px 0px 0px)', ease: 'none' }, 0)
      .fromTo(media, { scale: 1.12 }, { scale: 1, ease: 'none' }, 0)
      .fromTo(copy, { y: 0, autoAlpha: 1, scale: 1 }, { y: () => -window.innerHeight * 0.16, autoAlpha: 0, scale: 0.94, ease: 'none' }, 0)
      .to(badge, { autoAlpha: 0, scale: 0.5, duration: 0.25, ease: 'none' }, 0);
  }

  return {
    /** Called when the intro has finished. */
    start() {
      buildRunway();
      gsap.to($('img', slides[0]), { scale: 1.02, duration: SLIDE_SECONDS + 2, ease: 'power1.out' });
      runTimer();
      chips.forEach((entry, i) => cycleChip(entry, 1.4 + i * 0.85));
    },
  };
}
