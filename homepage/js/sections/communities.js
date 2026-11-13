// Explore Communities: one community fills the stage at a time. The next one waits in an
// arch in the corner, and choosing it opens that arch out until it fills the stage.
//
// On screens wider than a phone, scrolling drives it: the stage holds still while you scroll
// and each stretch of scroll brings up the next community, with the index bars filling as
// you go; past the fifth, the page carries on. Arrows, the index, arrow keys and drag still
// work, and scroll the page to match. On phones the stage advances by itself on a timer, and
// swipe and the arrows move between the five.

import { $, $$, clamp, listen, pad2, scrollToTarget } from '../lib/dom.js';
import { gsap, ScrollTrigger, SplitText, motionOK, EASE } from '../lib/motion.js';

const AUTO_SECONDS = 7;

export function initCommunities() {
  const stage = $('[data-stage]');
  if (!stage) return;

  const media = $('[data-stage-media]', stage);
  const slides = $$('.stage__slide', stage);
  const copies = $$('.community', stage);
  const tabs = $$('.stage__tab', stage);
  const peek = $('[data-stage-peek]', stage);
  const peekFrame = $('.stage__next-frame', stage);
  const peekImg = $('[data-peek-img]', stage);
  const peekName = $('[data-peek-name]', stage);
  const now = $('[data-stage-now]');
  const progress = $('[data-stage-progress]');
  const count = slides.length;
  const state = { active: 0, busy: false, want: null, interacted: false, inView: false, hovering: false };
  let auto = null;
  let drift = null;
  const track = $('[data-stage-track]');
  const scrollDriven = motionOK && Boolean(track) && window.matchMedia('(min-width: 761px)').matches;
  let driver = null; // the ScrollTrigger that maps scroll to a community
  let lock = null; // while a click scrolls the page, the community it is heading for
  let lockTimer = null;

  // Names are split into letters once, so each change can raise them one by one.
  const names = copies.map((copy) => $('[data-community-name]', copy));
  const letters = names.map((name) => (motionOK && SplitText ? SplitText.create(name, { type: 'words,chars', mask: 'chars', charsClass: 'name-char' }).chars : [name]));

  const imageOf = (index) => $('img', slides[index]);
  const peekVisible = () => peekFrame && peekFrame.offsetParent !== null;

  function setPeek(index) {
    const next = copies[(index + 1) % count];
    peekImg.src = next.dataset.thumb;
    peekName.textContent = next.dataset.name;
    peek.setAttribute('aria-label', `Next community: ${next.dataset.name}`);
  }

  function setIndex(index) {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (motionOK && !scrollDriven) gsap.set($('b', tab), { '--fill': on && state.interacted ? 1 : 0 });
    });
    if (motionOK) {
      gsap.timeline()
        .to(now, { yPercent: -110, autoAlpha: 0, duration: 0.25, ease: 'power2.in' })
        .add(() => (now.textContent = pad2(index + 1)))
        .fromTo(now, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.55, ease: EASE.out });
      gsap.to(progress, { '--fill': (index + 1) / count, duration: 0.9, ease: EASE.inOut });
    } else {
      now.textContent = pad2(index + 1);
      progress.style.setProperty('--fill', (index + 1) / count);
    }
  }

  /** A slow push-in while a community is on stage. */
  function startDrift(index) {
    drift?.kill();
    if (!motionOK) return;
    drift = gsap.fromTo(imageOf(index), { scale: 1.06 }, { scale: 1.16, duration: 14, ease: 'none' });
  }

  function go(index, { dir = 1, from = null, user = false } = {}) {
    index = (index + count) % count;
    if (user) stopAuto();
    // Mid-change, remember where to go next; it follows as soon as this change finishes.
    if (state.busy) {
      state.want = index;
      return;
    }
    if (index === state.active) return;
    const previous = state.active;
    state.active = index;
    setIndex(index);

    const inSlide = slides[index];
    const outSlide = slides[previous];
    const inCopy = copies[index];
    const outCopy = copies[previous];

    if (!motionOK) {
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
      copies.forEach((copy, i) => {
        copy.hidden = i !== index;
        copy.classList.toggle('is-active', i === index);
      });
      setPeek(index);
      return;
    }

    state.busy = true;
    drift?.kill();
    const box = media.getBoundingClientRect();
    const square = 'round 0px 0px 0px 0px';
    let start;
    if (from) {
      // Open out of the arch the visitor chose.
      const r = from.getBoundingClientRect();
      const radius = r.width / 2;
      start = `inset(${r.top - box.top}px ${box.right - r.right}px ${box.bottom - r.bottom}px ${r.left - box.left}px round ${radius}px ${radius}px 0px 0px)`;
    } else {
      start = dir > 0 ? `inset(0px 0px 0px ${box.width}px ${square})` : `inset(0px ${box.width}px 0px 0px ${square})`;
    }

    gsap.set(slides, { zIndex: 0 });
    gsap.set(outSlide, { zIndex: 1 });
    inSlide.classList.add('is-active');
    gsap.set(inSlide, { zIndex: 2, clipPath: start });

    const timeline = gsap.timeline({
      onComplete: () => {
        outSlide.classList.remove('is-active');
        gsap.set(inSlide, { clearProps: 'clipPath,zIndex' });
        gsap.set(imageOf(previous), { clearProps: 'x,xPercent' });
        state.busy = false;
        startDrift(index);
        scheduleAuto();
        const want = state.want;
        state.want = null;
        if (want !== null && want !== state.active) go(want, { dir: want > state.active ? 1 : -1 });
      },
    });

    timeline
      .to(inSlide, { clipPath: `inset(0px 0px 0px 0px ${square})`, duration: 1.3, ease: EASE.inOut }, 0)
      .fromTo(imageOf(index), { scale: 1.4, xPercent: dir * 6 }, { scale: 1.06, xPercent: 0, duration: 1.7, ease: EASE.out }, 0)
      .to(imageOf(previous), { scale: '+=0.1', xPercent: -dir * 8, duration: 1.3, ease: EASE.inOut }, 0)
      // Copy: the old community steps out, the new name rises letter by letter.
      .to([...outCopy.children], { autoAlpha: 0, y: -18, duration: 0.32, stagger: 0.03, ease: 'power2.in' }, 0)
      .add(() => {
        outCopy.hidden = true;
        outCopy.classList.remove('is-active');
        gsap.set([...outCopy.children], { clearProps: 'opacity,visibility,transform' });
        inCopy.hidden = false;
        inCopy.classList.add('is-active');
      }, 0.4)
      .fromTo(letters[index], { yPercent: 118 }, { yPercent: 0, duration: 1.05, stagger: 0.022, ease: EASE.out }, 0.42)
      .fromTo([...inCopy.children].slice(1), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.07, ease: EASE.soft }, 0.6)
      // The arch in the corner closes and reopens on the following community.
      .to(peek, { autoAlpha: 0, y: 18, duration: 0.3, ease: 'power2.in' }, 0)
      .add(() => setPeek(index), 0.35)
      .fromTo(peekFrame, { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 0px 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 0px 0px)', duration: 0.9, ease: EASE.inOut, immediateRender: false }, 1)
      .to(peek, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE.out }, 1);
  }

  /** Choose a community. When scroll drives the stage, the page scrolls to its stretch too. */
  function choose(index, options = {}) {
    index = (index + count) % count;
    if (scrollDriven && driver) {
      lock = index;
      clearTimeout(lockTimer);
      lockTimer = setTimeout(() => { lock = null; }, 1800);
      window.scrollTo({ top: driver.start + (driver.end - driver.start) * ((index + 0.3) / count), behavior: 'smooth' });
    }
    go(index, options);
  }

  const step = (dir, user = true) => choose(state.active + dir, { dir, user, from: dir > 0 && peekVisible() ? peekFrame : null });

  $('[data-stage-prev]')?.addEventListener('click', () => step(-1));
  $('[data-stage-next]')?.addEventListener('click', () => step(1));
  peek.addEventListener('click', () => step(1));
  tabs.forEach((tab, i) => tab.addEventListener('click', () => choose(i, { dir: i > state.active ? 1 : -1, user: true })));

  stage.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const dir = event.key === 'ArrowRight' ? 1 : -1;
      step(dir);
      if (event.target.matches('.stage__tab')) setTimeout(() => tabs[state.active].focus({ preventScroll: true }), 0);
    }
  });

  /* ---------- Drag and swipe ---------- */

  let drag = null;
  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('a, button')) return;
    drag = { x: event.clientX, y: event.clientY, dx: 0, horizontal: null };
  });

  window.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (drag.horizontal === null && Math.hypot(dx, dy) > 8) drag.horizontal = Math.abs(dx) > Math.abs(dy);
    if (!drag.horizontal) return;
    drag.dx = dx;
    stage.classList.add('is-dragging');
    if (motionOK && !state.busy) gsap.to(imageOf(state.active), { x: clamp(dx * 0.3, -140, 140), duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
  });

  function release() {
    if (!drag) return;
    const { dx, horizontal } = drag;
    drag = null;
    stage.classList.remove('is-dragging');
    if (motionOK) gsap.to(imageOf(state.active), { x: 0, duration: 0.7, ease: EASE.out, overwrite: 'auto' });
    if (horizontal && Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  stage.addEventListener('dragstart', (event) => event.preventDefault());

  /* ---------- Autoplay, with its timer on the index ---------- */

  function stopAuto() {
    state.interacted = true;
    auto?.kill();
    auto = null;
  }

  function scheduleAuto() {
    auto?.kill();
    if (!motionOK || state.interacted || scrollDriven) return;
    const bar = $('b', tabs[state.active]);
    auto = gsap.fromTo(bar, { '--fill': 0 }, {
      '--fill': 1,
      duration: AUTO_SECONDS,
      ease: 'none',
      paused: !state.inView || state.hovering,
      onComplete: () => go(state.active + 1, { from: peekVisible() ? peekFrame : null }),
    });
  }

  function syncAuto() {
    if (!auto) return;
    if (state.inView && !state.hovering && !document.hidden) auto.resume();
    else auto.pause();
  }

  stage.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    state.hovering = true;
    syncAuto();
  });
  stage.addEventListener('pointerleave', () => {
    state.hovering = false;
    syncAuto();
  });
  stage.addEventListener('focusin', stopAuto);
  document.addEventListener('visibilitychange', syncAuto);

  /* ---------- Jump here from the menu, the intents or a search result ---------- */

  listen('bloom:community', ({ id }) => {
    const index = copies.findIndex((copy) => copy.dataset.community === id);
    if (index < 0) return;
    if (scrollDriven && driver) {
      choose(index, { dir: index > state.active ? 1 : -1, user: true });
      return;
    }
    scrollToTarget(stage, { offset: Math.max(96, window.innerHeight * 0.1) });
    setTimeout(() => go(index, { dir: index > state.active ? 1 : -1, user: true }), motionOK ? 450 : 0);
  });

  setPeek(0);
  if (!motionOK) {
    progress.style.setProperty('--fill', 1 / count);
    return;
  }

  /* ---------- Entrance: the stage opens out of an arch as it scrolls up ---------- */

  gsap.set(progress, { '--fill': 1 / count });
  gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 95%', end: 'top 30%', scrub: 0.8 } })
    .fromTo(media, { clipPath: 'inset(16% 30% 0% 30% round 999px 999px 0px 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 32px 32px 32px 32px)', ease: 'none' }, 0)
    .fromTo(imageOf(0), { scale: 1.45 }, { scale: 1.06, ease: 'none' }, 0);

  const firstCopy = [...copies[0].children].slice(1);
  gsap.set(letters[0], { yPercent: 118 });
  gsap.set([...firstCopy, ...$$('.stage__tab', stage), peek], { autoAlpha: 0 });
  ScrollTrigger.create({
    trigger: stage,
    start: 'top 45%',
    once: true,
    onEnter: () => {
      gsap.timeline({ onComplete: () => startDrift(0) })
        .to(letters[0], { yPercent: 0, duration: 1.1, stagger: 0.025, ease: EASE.out }, 0)
        .fromTo(firstCopy, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: EASE.soft }, 0.3)
        .fromTo($$('.stage__tab', stage), { autoAlpha: 0, x: 24 }, { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.06, ease: EASE.soft }, 0.2)
        .fromTo(peek, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE.out }, 0.5);
    },
  });

  /* ---------- Scroll drives the stage ---------- */

  if (scrollDriven) {
    track.style.setProperty('--stage-count', count);
    const stickyTop = () => parseFloat(getComputedStyle(stage).top) || 0;
    let last = 0;
    driver = ScrollTrigger.create({
      trigger: track,
      start: () => `top top+=${stickyTop()}`,
      end: () => `bottom top+=${stickyTop() + stage.offsetHeight}`,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const raw = self.progress * count;
        const index = Math.min(count - 1, Math.floor(raw));
        // Bars: the ones passed are full, the current one fills as you scroll through it.
        tabs.forEach((tab, i) => $('b', tab).style.setProperty('--fill', i < index ? 1 : i === index ? clamp(raw - index, 0, 1).toFixed(3) : 0));
        if (index === last) return;
        last = index;
        if (lock !== null) {
          if (index === lock) lock = null;
          return;
        }
        go(index, { dir: index > state.active ? 1 : -1, from: index === state.active + 1 && peekVisible() ? peekFrame : null });
      },
    });
  }

  ScrollTrigger.create({
    trigger: stage,
    start: 'top 70%',
    end: 'bottom 30%',
    onToggle: (self) => {
      state.inView = self.isActive;
      if (self.isActive && !auto && !state.interacted && !state.busy) scheduleAuto();
      syncAuto();
    },
  });
}
