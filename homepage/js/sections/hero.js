// Hero, "Bloom World": Bloom's seven businesses as seven arches travelling round a tilted
// orbit, with the name Bloom World at its centre. The arch at the front of the orbit is in focus;
// the world turns to the next business every few seconds, follows a drag (with momentum),
// tilts towards the pointer, and swings outwards as you scroll on into the glimpses below.
//
// Every arch is placed by one render function from a few numbers (rotation, lean, tilt,
// spread), so all of those motions combine smoothly instead of fighting over one transform.
// Only transform and opacity change per frame.

import { $, $$, clamp, emit, finePointer } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK } from '../lib/motion.js';

const STEP_SECONDS = 3; // how long each business stays at the front before the world turns
const TURN_SECONDS = 1.5;
const BACK = 0.6; // scale of an arch at the far side of the orbit

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

const wrap180 = (angle) => ((((angle + 180) % 360) + 360) % 360) - 180;
const ellipsePath = (cx, cy, rx, ry) => `M${(cx - rx).toFixed(1)} ${cy.toFixed(1)}a${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(rx * 2).toFixed(1)} 0a${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(-rx * 2).toFixed(1)} 0`;

export function initHero() {
  const hero = $('[data-hero]');
  const world = $('[data-world]', hero || document);
  if (!hero || !world) return { start() {} };

  if (motionOK) {
    $('[data-hero-title]', hero).setAttribute('aria-label', 'Bloom World');
    $$('.hero__word', hero).forEach((word) => {
      splitLetters(word);
      word.setAttribute('aria-hidden', 'true');
    });
  }

  const orbs = $$('[data-orb]', world);
  const buttons = orbs.map((orb) => $('button', orb));
  const orbits = $('[data-world-orbits]', world);
  const copy = $('[data-hero-content]', hero);
  const caption = $('[data-world-caption]', hero);
  const count = orbs.length;
  const STEP = 360 / count;

  // rot: the world's turn. lean: a small extra turn towards the pointer. tilt: how far the
  // orbit leans back (1 = as measured). spread: how far it has swung open on scroll.
  const state = { rot: 0, lean: 0, tilt: 1, spread: 0, turn: 0, rings: 1, sat: 0 };
  // Per arch: b is how far it has fanned out from the front (0 = tucked behind the front arch),
  // o its opacity, lift how far it rises on hover.
  const arch = orbs.map(() => ({ b: 1, o: 1, lift: 0 }));
  const geo = { cx: 0, cy: 0, rx: 0, ry: 0, pw: 0, ph: 0, phone: false };
  let ring = null;
  let sats = [];
  let focused = -1;
  let inView = true;
  let hovering = false;
  let dragging = false;
  let opened = false;
  let autoCall = null;

  /* ---------- Geometry ---------- */

  function measure() {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    const phone = width < 761;
    const tall = !phone && height > width * 1.15;
    const bar = $('.site-header__bar');
    const headerBottom = bar ? bar.getBoundingClientRect().bottom : 80;
    const label = phone ? 0 : 64; // room for the name (and brand) under the front arch

    let ph;
    let cx = width / 2;
    let cy;
    let rx;
    let ry;
    let titleSize;
    let copyTop;
    let copyBottom;

    if (phone) {
      // On phones the world sits above the proposition, like a planet over the horizon.
      ph = clamp(Math.min(width * 0.27, height * 0.135), 92, 124);
      const pw = ph * 0.76;
      rx = width / 2 - pw * 0.5 - 10;
      const top = headerBottom + 12 + (ph * BACK) / 2;
      const bottom = top + Math.min(height * 0.2, 170);
      cy = (top + bottom) / 2;
      ry = (bottom - top) / 2;
      titleSize = Math.min(width * 0.155, 64);
      copyTop = bottom + ph / 2 + 64;
      copyBottom = 20;
    } else {
      ph = clamp(Math.min(height * (tall ? 0.15 : 0.21), width * (tall ? 0.2 : 0.14)), 116, 240);
      const pw = ph * 0.76;
      const topRoom = headerBottom + 14 + (ph * BACK) / 2;
      const bottomRoom = height - 10 - label - ph * 0.55;
      cy = (topRoom + bottomRoom) / 2;
      ry = (bottomRoom - topRoom) / 2;
      rx = Math.min(width / 2 - pw * 0.62 - 12, width * (tall ? 0.4 : 0.42));
      // Two words on one line, so the name can be set large.
      titleSize = clamp(Math.min(width * (tall ? 0.11 : 0.085), height * 0.13, rx * 0.24), 52, 168);
      // The proposition fills the hollow of the orbit: below the far arches, above the near one.
      copyTop = cy - ry + (ph * BACK) / 2 + 22;
      copyBottom = height - (cy + ry - ph * 0.55) + 16;
    }
    const pw = ph * 0.76;
    Object.assign(geo, { cx, cy, rx, ry, pw, ph, phone });

    const vars = {
      '--cx': `${cx}px`, '--cy': `${cy}px`, '--rx': `${rx}px`, '--ry': `${ry}px`,
      '--pw': `${pw}px`, '--ph': `${ph}px`, '--title-fs': `${titleSize}px`,
      '--copy-top': `${copyTop}px`, '--copy-bottom': `${copyBottom}px`,
    };
    Object.entries(vars).forEach(([name, value]) => hero.style.setProperty(name, value));
    buildOrbits();
    render();
  }

  /** The orbit lines: the path the arches travel, a wider faint ring, and two red satellites. */
  function buildOrbits() {
    const { cx, cy, rx, ry } = geo;
    orbits.innerHTML = `
      <g data-ring>
        <path class="world__ring world__ring--outer" d="${ellipsePath(cx, cy, rx * 1.16, ry * 1.2)}"/>
        <path class="world__ring" d="${ellipsePath(cx, cy, rx, ry)}"/>
        <path class="world__ring world__ring--inner" d="${ellipsePath(cx, cy, rx * 0.78, ry * 0.7)}"/>
      </g>
      <circle class="world__sat" r="3.5" data-sat/>
      <circle class="world__sat world__sat--small" r="2.5" data-sat/>`;
    ring = $('[data-ring]', orbits);
    sats = $$('[data-sat]', orbits);
  }

  /* ---------- Rendering ---------- */

  function render() {
    const { cx, cy, pw, ph } = geo;
    const open = 1 + state.spread * 0.7;
    const rx = geo.rx * open;
    const ry = geo.ry * open * state.tilt;
    let nearest = 0;
    let nearestAngle = 999;

    orbs.forEach((orb, i) => {
      const a = arch[i];
      const angle = wrap180(i * STEP + state.rot + state.turn + state.lean) * a.b;
      const away = Math.abs(angle);
      if (away < nearestAngle) {
        nearestAngle = away;
        nearest = i;
      }
      const rad = (angle * Math.PI) / 180;
      const depth = (Math.cos(rad) + 1) / 2; // 1 at the front, 0 at the far side
      const focus = Math.max(0, 1 - away / STEP);
      const scale = (BACK + (1 - BACK) * depth) * (1 + 0.1 * focus) * (0.8 + 0.2 * a.b);
      const x = cx + rx * Math.sin(rad) - pw / 2;
      const y = cy + ry * Math.cos(rad) - ph / 2 - a.lift;

      orb.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      orb.style.opacity = (a.o * (1 - state.spread * 0.9)).toFixed(3);
      orb.style.visibility = a.o > 0.01 ? '' : 'hidden';
      orb.style.zIndex = String(10 + Math.round(depth * 100));
      orb.style.setProperty('--d', depth.toFixed(3));
      orb.style.setProperty('--f', (focus * focus * (3 - 2 * focus)).toFixed(3));
      // Names stay readable at the far side: they shrink a little with distance, not as much as the arch.
      orb.style.setProperty('--ls', ((0.86 + 0.14 * depth) / scale).toFixed(4));
    });

    if (ring) {
      ring.setAttribute('transform', `translate(${cx} ${cy}) scale(${open.toFixed(4)} ${(open * state.tilt).toFixed(4)}) translate(${-cx} ${-cy})`);
      orbits.style.opacity = String(state.rings * (1 - state.spread));
      sats.forEach((sat, k) => {
        const t = ((state.sat + k * 180) * Math.PI) / 180;
        const sx = 1.16 - k * 0.38;
        const sy = 1.2 - k * 0.5;
        sat.setAttribute('cx', (cx + rx * sx * Math.sin(t)).toFixed(1));
        sat.setAttribute('cy', (cy + ry * sy * Math.cos(t)).toFixed(1));
      });
    }

    if (nearest !== focused) {
      focused = nearest;
      orbs.forEach((orb, i) => orb.classList.toggle('is-focus', i === nearest));
      updateCaption();
    }
  }

  function updateCaption() {
    if (!caption) return;
    const orb = orbs[focused];
    $('[data-caption-num]', caption).textContent = String(focused + 1).padStart(2, '0');
    $('[data-caption-name]', caption).textContent = orb.dataset.name;
    $('[data-caption-brand]', caption).textContent = orb.dataset.brand;
    const go = $('[data-caption-go]', caption);
    go.dataset.worldJump = orb.dataset.id;
    $('span', go).textContent = `See ${orb.dataset.name} in Bloom World`;
  }

  /* ---------- Turning ---------- */

  /** The unwrapped step the world is on: rot = -position * STEP. */
  const position = () => -state.rot / STEP;

  function schedule() {
    autoCall?.kill();
    autoCall = null;
    if (!motionOK || !opened || !inView || hovering || dragging || document.hidden) return;
    autoCall = gsap.delayedCall(STEP_SECONDS, () => turnTo(Math.round(position()) + 1));
  }

  function turnTo(step, duration = TURN_SECONDS, ease = 'power3.inOut') {
    if (!motionOK) {
      state.rot = -step * STEP;
      render();
      return;
    }
    gsap.to(state, { rot: -step * STEP, duration, ease, overwrite: 'auto', onComplete: schedule });
    autoCall?.kill();
  }

  /** Turn the shortest way round so arch i comes to the front. */
  function bring(i, duration = 1.2) {
    const now = position();
    const delta = wrap180((i - now) * STEP) / STEP;
    turnTo(Math.round(now + delta), duration, 'power3.inOut');
  }

  function activate(i) {
    emit('bloom:navigate');
    emit('bloom:world', { id: orbs[i].dataset.id });
  }

  /* ---------- Interaction ---------- */

  let suppressClick = false;
  // With a mouse every arch is labelled, so a click goes straight there. On touch the
  // first tap brings an arch to the front and names it; a tap on the front arch goes there.
  const directClick = finePointer();

  buttons.forEach((button, i) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (suppressClick) return;
      if (directClick || i === focused) activate(i);
      else bring(i);
    });
    button.addEventListener('focus', () => {
      if (i !== focused) bring(i, 0.9);
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const next = (i + (event.key === 'ArrowRight' ? 1 : -1) + count) % count;
      buttons[next].focus({ preventScroll: true });
    });

    if (motionOK && directClick) {
      // The world keeps turning on its own; it waits only while the pointer rests on an arch.
      button.addEventListener('pointerenter', () => {
        hovering = true;
        autoCall?.kill();
        if (dragging) return;
        orbs[i].classList.add('is-hover');
        world.classList.add('has-hover');
        gsap.to(arch[i], { lift: geo.ph * 0.08, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
        gsap.to($('img', button), { scale: 1.08, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
      });
      button.addEventListener('pointerleave', () => {
        hovering = false;
        schedule();
        orbs[i].classList.remove('is-hover');
        world.classList.remove('has-hover');
        gsap.to(arch[i], { lift: 0, duration: 0.9, ease: 'power3.out', overwrite: 'auto' });
        gsap.to($('img', button), { scale: 1, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
      });
    }
  });

  if (motionOK) {
    // Drag (or swipe) the world round; let go and it glides on and settles on a business.
    let startX = 0;
    let startRot = 0;
    let samples = [];
    const degPerPixel = () => STEP / (geo.pw * 1.4);

    world.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !opened) return;
      startX = event.clientX;
      startRot = state.rot;
      samples = [{ x: event.clientX, t: performance.now() }];
      const move = (e) => {
        const dx = e.clientX - startX;
        if (!dragging && Math.abs(dx) > 6) {
          dragging = true;
          world.classList.add('is-dragging');
          gsap.killTweensOf(state, 'rot');
          autoCall?.kill();
          orbs.forEach((_, i) => gsap.to(arch[i], { lift: 0, duration: 0.4, overwrite: 'auto' }));
        }
        if (!dragging) return;
        state.rot = startRot + dx * degPerPixel();
        samples.push({ x: e.clientX, t: performance.now() });
        if (samples.length > 6) samples.shift();
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (!dragging) return;
        dragging = false;
        world.classList.remove('is-dragging');
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
        const first = samples[0];
        const last = samples[samples.length - 1];
        const seconds = Math.max((last.t - first.t) / 1000, 0.016);
        const velocity = ((last.x - first.x) / seconds) * degPerPixel(); // degrees per second
        const projected = state.rot + clamp(velocity, -700, 700) * 0.3;
        turnTo(Math.round(-projected / STEP), clamp(0.9 + Math.abs(velocity) / 1500, 0.9, 1.8), 'power3.out');
      };
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });

    // The world leans towards the pointer and tilts as it moves up and down; the headline
    // drifts gently the other way, so the scene has depth.
    if (finePointer()) {
      const lean = gsap.quickTo(state, 'lean', { duration: 1.4, ease: 'power3.out' });
      const tilt = gsap.quickTo(state, 'tilt', { duration: 1.6, ease: 'power3.out' });
      const copyX = gsap.quickTo(copy, 'x', { duration: 1.4, ease: 'power3.out' });
      hero.addEventListener('pointermove', (event) => {
        if (dragging) return;
        const nx = event.clientX / window.innerWidth - 0.5;
        const ny = event.clientY / window.innerHeight - 0.5;
        lean(nx * 6);
        tilt(1 + ny * 0.07);
        copyX(nx * -12);
      });
      hero.addEventListener('pointerleave', () => {
        lean(0);
        tilt(1);
        copyX(0);
      });
    }

    // Headline letters ripple when the pointer crosses a word.
    $$('.hero__word', hero).forEach((word) => {
      const letters = $$('.hero__char', word);
      if (!letters.length) return;
      word.addEventListener('pointerenter', () => {
        if (gsap.isTweening(letters[0])) return;
        gsap.to(letters, { keyframes: { yPercent: [0, -12, 0], ease: 'sine.inOut' }, duration: 0.7, stagger: 0.035 });
      });
    });

    // Draw every frame only while the hero is on screen.
    const tick = () => {
      state.sat += gsap.ticker.deltaRatio() * 0.08;
      render();
    };
    ScrollTrigger.create({
      trigger: '.opening',
      start: 'top bottom',
      end: () => `top+=${window.innerHeight * 1.7} top`,
      onToggle: (self) => {
        inView = self.isActive;
        if (inView) gsap.ticker.add(tick);
        else gsap.ticker.remove(tick);
        schedule();
      },
    });
    gsap.ticker.add(tick);
    document.addEventListener('visibilitychange', schedule);
  }

  window.addEventListener('resize', measure);
  measure();

  /**
   * As you scroll on, the proposition lifts away and the world swings open past the edges of
   * the screen, still turning while the glimpses of Bloom World rise over it in their arch.
   */
  function buildRunway() {
    gsap.timeline({
      // Measured on the wrapper: the hero itself is sticky, so its own position moves with the scroll.
      scrollTrigger: { trigger: hero.parentElement, start: 'top top', end: () => `+=${window.innerHeight * 1.5}`, scrub: 1, invalidateOnRefresh: true },
    })
      .fromTo(state, { spread: 0, turn: 0 }, { spread: 1, turn: -STEP * 2, ease: 'power1.inOut', duration: 1 }, 0)
      .fromTo(copy, { y: 0, autoAlpha: 1, scale: 1 }, { y: () => -window.innerHeight * 0.12, autoAlpha: 0, scale: 0.95, ease: 'none', duration: 0.45 }, 0);
  }

  /* ---------- Opening ---------- */

  /** The three arches the loader flies in: the front one and its two neighbours. */
  const flown = [count - 1, 0, 1];

  /** Fold the world shut before the loader hands over: everything tucked behind the front arch. */
  function fold() {
    arch.forEach((a, i) => {
      a.b = flown.includes(i) ? 1 : 0;
      a.o = 0;
    });
    state.rings = 0;
    render();
  }

  /** Where arch i will sit once open, for the loader's arches to fly to. */
  function landing(i) {
    const { cx, cy, rx, ry, pw, ph } = geo;
    const angle = wrap180(i * STEP);
    const rad = (angle * Math.PI) / 180;
    const depth = (Math.cos(rad) + 1) / 2;
    const scale = (BACK + (1 - BACK) * depth) * (1 + 0.1 * Math.max(0, 1 - Math.abs(angle) / STEP));
    const width = pw * scale;
    const height = ph * scale;
    return {
      left: cx + rx * Math.sin(rad) - width / 2,
      top: cy + ry * Math.cos(rad) - height / 2,
      width,
      height,
      rotation: 0,
    };
  }

  /** Open the world: the tucked arches travel out round the orbit, nearest first. */
  function open() {
    const timeline = gsap.timeline({
      onComplete: () => {
        opened = true;
        schedule();
      },
    });
    if (!motionOK) {
      arch.forEach((a) => Object.assign(a, { b: 1, o: 1 }));
      state.rings = 1;
      render();
      opened = true;
      return timeline;
    }
    const order = orbs.map((_, i) => i).filter((i) => !flown.includes(i))
      .sort((p, q) => Math.abs(wrap180(p * STEP)) - Math.abs(wrap180(q * STEP)));
    order.forEach((i, n) => {
      const delay = Math.floor(n / 2) * 0.12;
      timeline.to(arch[i], { o: 1, duration: 0.4, ease: 'power1.out' }, delay);
      timeline.to(arch[i], { b: 1, duration: 2, ease: 'expo.out' }, delay);
    });
    timeline.fromTo(state, { rings: 0 }, { rings: 1, duration: 1.4, ease: 'power2.out' }, 0.2);
    timeline.add(() => world.classList.add('is-open'), 0.6);
    return timeline;
  }

  return {
    fold,
    landing,
    flown,
    /** Show the arches the loader carried in, once they have landed. */
    reveal() {
      flown.forEach((i) => { arch[i].o = 1; });
      render();
    },
    open,
    /** Called when the intro has finished. */
    start({ bloomed = false } = {}) {
      if (motionOK) buildRunway();
      if (bloomed) {
        opened = true;
        world.classList.add('is-open');
        schedule();
        return;
      }
      if (!motionOK) {
        world.classList.add('is-open');
        open();
        return;
      }
      fold();
      flown.forEach((i) => { if (i !== 0) arch[i].b = 0; });
      gsap.to(flown.map((i) => arch[i]), { o: 1, duration: 0.5, ease: 'power1.out' });
      gsap.to(flown.filter((i) => i !== 0).map((i) => arch[i]), { b: 1, duration: 1.9, ease: 'expo.out' });
      open();
    },
  };
}
