// Hero: image rotation with a rising wipe and slow zoom, pointer parallax on the
// floating arches, and a gentle hand-over as the next section slides across.

import { $, $$, finePointer } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const SLIDE_SECONDS = 7;

export function initHero() {
  const hero = $('[data-hero]');
  if (!hero) return { start() {} };

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
      gsap.fromTo(next, { clipPath: 'inset(100% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)',
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
