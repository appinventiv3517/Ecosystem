// Hero: image rotation with a rising wipe and slow zoom, pointer parallax on the
// floating arches, and a gentle hand-over as the next section slides across.

import { $, $$, finePointer } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const SLIDE_SECONDS = 7;

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

  function setDots(index) {
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      dot.setAttribute('aria-current', i === index ? 'true' : 'false');
      $('i', dot).style.setProperty('--fill', i === index && !motionOK ? 1 : 0);
    });
  }

  /** The progress bar on the active dot doubles as the autoplay clock. */
  function runTimer() {
    timer?.kill();
    if (!motionOK) return;
    const bar = $('i', dots[current]);
    timer = gsap.fromTo(bar, { '--fill': 0 }, {
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
      // The next image opens out of an arch rising from the foot of the frame.
      gsap.fromTo(next, { clipPath: 'inset(58% 40% 0% 40% round 999px 999px 0px 0px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)',
        duration: 1.5,
        ease: EASE.inOut,
        onComplete: () => previous.classList.remove('is-active'),
      });
      gsap.fromTo(image, { scale: 1.28 }, { scale: 1.02, duration: SLIDE_SECONDS + 2.5, ease: 'power2.out' });
      gsap.fromTo(caption, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.7, delay: 0.5 });
      setTimeout(() => {
        caption.textContent = next.dataset.caption;
      }, 450);
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

  if (!motionOK) {
    pauseButton?.setAttribute('hidden', '');
    return { start() {} };
  }

  // Pause the rotation once the hero is covered.
  ScrollTrigger.create({
    trigger: '.opening',
    start: 'top top',
    end: () => `top+=${window.innerHeight * 0.9} top`,
    onToggle: (self) => {
      inView = self.isActive || window.scrollY < 10;
      syncPlayback();
    },
  });

  // Hand-over: copy lifts and the image settles as the cream sheet slides across.
  // Built once the intro has finished so it records the settled state as its start.
  function buildHandOver() {
    gsap.timeline({
      scrollTrigger: { trigger: '.opening', start: 'top top', end: () => `+=${window.innerHeight}`, scrub: 0.6 },
    })
      .to('[data-hero-content]', { yPercent: -14, autoAlpha: 0.15, ease: 'none' }, 0)
      .to('[data-hero-vignettes]', { yPercent: -22, ease: 'none' }, 0)
      .to('[data-hero-media]', { scale: 1.06, ease: 'none' }, 0)
      .to('[data-hero-foot]', { autoAlpha: 0, ease: 'none', duration: 0.25 }, 0);
  }

  // Pointer parallax: nearer arches travel further.
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
      end: 'bottom top',
      onUpdate: (self) => {
        gsap.to(spin, { timeScale: 1 + Math.min(Math.abs(self.getVelocity()) / 250, 8), duration: 0.2, overwrite: true });
        gsap.to(spin, { timeScale: 1, duration: 1.2, delay: 0.25 });
      },
    });
  }

  // Headline letters ripple when the pointer crosses a word.
  if (finePointer()) {
    $$('.hero__word', hero).forEach((word) => {
      const chars = $$('.hero__char', word);
      if (!chars.length) return;
      word.addEventListener('pointerenter', () => {
        if (gsap.isTweening(chars[0])) return;
        gsap.to(chars, { keyframes: { yPercent: [0, -14, 0], ease: 'sine.inOut' }, duration: 0.7, stagger: 0.035 });
        gsap.fromTo(chars, { color: '#E0796C' }, { color: '#F8F6EA', duration: 0.9, stagger: 0.035, ease: 'power1.in', clearProps: 'color' });
      });
    });
  }

  if (finePointer()) {
    const layers = $$('.vignette', hero).map((element) => ({
      depth: parseFloat(element.dataset.depth) || 1,
      x: gsap.quickTo(element, 'x', { duration: 1.1, ease: 'power3.out' }),
      y: gsap.quickTo(element, 'y', { duration: 1.1, ease: 'power3.out' }),
    }));
    const lines = $('[data-hero-lines]', hero);
    const linesX = gsap.quickTo(lines, 'x', { duration: 1.4, ease: 'power3.out' });
    const linesY = gsap.quickTo(lines, 'y', { duration: 1.4, ease: 'power3.out' });
    hero.addEventListener('pointermove', (event) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      layers.forEach((layer) => {
        layer.x(x * -26 * layer.depth);
        layer.y(y * -18 * layer.depth);
      });
      linesX(x * 14);
      linesY(y * 8);
    });
  }

  return {
    /** Called when the intro has finished: begin the slow zoom and the rotation. */
    start() {
      const image = $('img', slides[0]);
      gsap.to(image, { scale: 1.02, duration: SLIDE_SECONDS + 2, ease: 'power1.out' });
      buildHandOver();
      runTimer();
    },
  };
}
