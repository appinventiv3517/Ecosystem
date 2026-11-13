// Hero, "the bloom": Bloom's seven businesses and its communities as arches on a great wheel
// rising over the cream. The arch at twelve o'clock is in focus and shows its name. The wheel
// turns to the next arch every few seconds, follows a drag (with momentum), leans towards the
// pointer, and opens outwards as you scroll on. Clicking the arch in focus goes to that
// business or community further down the page; clicking any other arch turns it to the top.
//
// Every arch is placed by one render function from a few numbers (rotation, lean, spread),
// so all of those motions combine smoothly instead of fighting over the same transform.

import { $, $$, clamp, emit, finePointer, scrollToTarget } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK } from '../lib/motion.js';

const STEP_SECONDS = 3.6; // how long each arch stays in focus before the wheel turns
const TURN_SECONDS = 1.6;

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
const SVG = 'http://www.w3.org/2000/svg';

export function initHero() {
  const hero = $('[data-hero]');
  const bloom = $('[data-bloom]', hero || document);
  if (!hero || !bloom) return { start() {} };

  if (motionOK) {
    $('[data-hero-title]', hero).setAttribute('aria-label', 'Curated Community Living');
    $$('.hero__word', hero).forEach((word) => {
      splitLetters(word);
      word.setAttribute('aria-hidden', 'true');
    });
  }

  const petals = $$('[data-petal]', bloom);
  const dial = $('[data-bloom-dial]', bloom);
  const copy = $('[data-hero-content]', hero);
  const count = petals.length;
  const STEP = 360 / count;

  // rot: the wheel's turn. lean: a small extra turn towards the pointer. spread: how far the
  // wheel has opened outwards on scroll. turn: the extra rotation that comes with scrolling.
  const state = { rot: 0, lean: 0, spread: 0, turn: 0, dial: 1, sats: 0 };
  // Per arch: b is how far it has bloomed out from the top (0 = folded behind the top arch),
  // o its opacity, lift how far it rises out of the wheel on hover.
  const arch = petals.map(() => ({ b: 1, o: 1, lift: 0 }));
  const geo = { cx: 0, cy: 0, r: 0, ri: 0, pw: 0, ph: 0 };
  let dialSpin = null;
  let satellites = null;
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
    // Portrait tablets: more height than width to fill, so bigger arches and a larger headline.
    const tall = !phone && height > width * 1.15;
    const bar = $('.site-header__bar');
    const headerBottom = bar ? bar.getBoundingClientRect().bottom : 80;

    let ph = clamp(Math.min(height * 0.31, width * 0.21), 150, 340);
    if (phone) ph = clamp(Math.min(width * 0.46, height * 0.23), 140, 220);
    else if (tall) ph = clamp(Math.min(height * 0.24, width * 0.33), 180, 320);
    const pw = ph * 0.74;
    const top = headerBottom + (phone ? 24 : 36);
    // Wide enough to frame the headline, and never so tight that the arches crowd each other.
    const r = Math.max(phone ? width * 0.95 : width * (tall ? 0.62 : 0.44), pw * 2.6);
    Object.assign(geo, { cx: width / 2, cy: top + ph / 2 + r, r, ri: r - ph / 2 - (phone ? 14 : 22), pw, ph });

    let titleSize = clamp(Math.min(geo.ri * 0.17, height * 0.092), 44, 150);
    if (phone) titleSize = Math.min(width * 0.155, 68);
    else if (tall) titleSize = Math.min(width * 0.095, 96);
    const copyTop = top + ph * 1.1 + (phone ? 16 : 22);
    const vars = {
      '--cx': `${geo.cx}px`, '--cy': `${geo.cy}px`, '--r': `${geo.r}px`, '--ri': `${geo.ri}px`,
      '--pw': `${pw}px`, '--ph': `${ph}px`, '--title-fs': `${titleSize}px`,
      '--copy-top': `${copyTop}px`,
      '--gy': `${(copyTop + height) / 2}px`, '--gr': `${Math.min(geo.ri * 1.05, width * 0.5)}px`,
    };
    Object.entries(vars).forEach(([name, value]) => hero.style.setProperty(name, value));
    buildDial();
    render();
  }

  /**
   * The dial: a bezel of tick marks around the outside of the arches that turns with the
   * wheel, and beyond it a dashed orbit with two red satellites drifting round.
   */
  function buildDial() {
    const { cx, cy, r, ph } = geo;
    const bezel = r + ph / 2 + 16;
    const ticks = [];
    const perStep = 4;
    for (let i = 0; i < count * perStep; i += 1) {
      const major = i % perStep === 0;
      const angle = (i * STEP) / perStep;
      const rad = (angle * Math.PI) / 180;
      const outer = bezel + (major ? 14 : 7);
      ticks.push(`<line ${major ? 'class="is-major" ' : ''}x1="${(cx + bezel * Math.sin(rad)).toFixed(1)}" y1="${(cy - bezel * Math.cos(rad)).toFixed(1)}" x2="${(cx + outer * Math.sin(rad)).toFixed(1)}" y2="${(cy - outer * Math.cos(rad)).toFixed(1)}"/>`);
    }
    const orbit = bezel + 30;
    dial.innerHTML = `
      <circle class="bloom__orbit bloom__orbit--outer" cx="${cx}" cy="${cy}" r="${(bezel - 2).toFixed(1)}"/>
      <g data-dial-spin><g class="bloom__ticks">${ticks.join('')}</g></g>
      <circle class="bloom__orbit" cx="${cx}" cy="${cy}" r="${orbit.toFixed(1)}"/>
      <g data-dial-sats>
        <circle class="bloom__dot" cx="${cx}" cy="${(cy - orbit).toFixed(1)}" r="3.5"/>
        <circle class="bloom__dot" cx="${cx}" cy="${(cy + orbit).toFixed(1)}" r="2.5" opacity="0.6"/>
      </g>`;
    dialSpin = $('[data-dial-spin]', dial);
    satellites = $('[data-dial-sats]', dial);
  }

  /* ---------- Rendering ---------- */

  function render() {
    const { cx, cy, r, pw, ph } = geo;
    const radius = r * (1 + state.spread * 0.55);
    let nearest = 0;
    let nearestAngle = 999;

    petals.forEach((petal, i) => {
      const a = arch[i];
      const angle = wrap180(i * STEP + state.rot + state.turn + state.lean) * a.b;
      const away = Math.abs(angle);
      if (away < nearestAngle) {
        nearestAngle = away;
        nearest = i;
      }
      const focus = Math.max(0, 1 - away / STEP);
      const scale = (0.88 + 0.24 * focus) * (0.82 + 0.18 * a.b);
      const reach = radius - (1 - a.b) * r * 0.1 + a.lift;
      const rad = (angle * Math.PI) / 180;
      const x = cx + reach * Math.sin(rad) - pw / 2;
      const y = cy - reach * Math.cos(rad) - ph / 2;
      // Arches fade as they sink below the horizon of the wheel.
      const visible = clamp((118 - away) / 22, 0, 1) * a.o;

      petal.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${angle.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
      petal.style.opacity = visible.toFixed(3);
      petal.style.visibility = visible > 0.01 ? '' : 'hidden';
      petal.style.zIndex = String(400 - Math.round(away * 2));
      petal.style.setProperty('--f', (focus * focus * (3 - 2 * focus)).toFixed(3));
    });

    if (dialSpin) {
      const s = 1 + state.spread * 0.55;
      const turn = state.rot + state.turn + state.lean;
      dialSpin.setAttribute('transform', `translate(${cx} ${cy}) rotate(${turn.toFixed(3)}) scale(${s.toFixed(4)}) translate(${-cx} ${-cy})`);
      satellites.setAttribute('transform', `rotate(${state.sats.toFixed(2)} ${cx} ${cy})`);
      dial.style.opacity = String(state.dial * (1 - state.spread));
    }

    if (nearest !== focused) {
      focused = nearest;
      petals.forEach((petal, i) => petal.classList.toggle('is-focus', i === nearest));
    }
  }

  /* ---------- Turning ---------- */

  /** The unwrapped step the wheel is on: rot = -position * STEP. */
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

  /** Turn the shortest way round so arch i sits at the top. */
  function bring(i, duration = 1.2) {
    const now = position();
    const delta = wrap180((i - now) * STEP) / STEP;
    turnTo(Math.round(now + delta), duration, 'power3.inOut');
  }

  function activate(i) {
    const petal = petals[i];
    const { kind, id } = petal.dataset;
    emit('bloom:navigate');
    if (kind === 'business') emit('bloom:vertical', { id });
    else if (kind === 'community') emit('bloom:community', { id });
    else scrollToTarget('#life');
  }

  /* ---------- Interaction ---------- */

  let suppressClick = false;

  petals.forEach((petal, i) => {
    petal.addEventListener('click', (event) => {
      event.preventDefault();
      if (suppressClick) return;
      if (i === focused && Math.abs(wrap180(i * STEP + state.rot)) < STEP * 0.35) activate(i);
      else bring(i);
    });
    petal.addEventListener('focus', () => {
      if (i !== focused) bring(i, 0.9);
    });
    petal.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const next = (i + (event.key === 'ArrowRight' ? 1 : -1) + count) % count;
      petals[next].focus({ preventScroll: true });
    });

    if (motionOK && finePointer()) {
      petal.addEventListener('pointerenter', () => {
        if (dragging) return;
        gsap.to(arch[i], { lift: geo.ph * 0.07, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
        gsap.to($('img', petal), { scale: 1.06, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
      });
      petal.addEventListener('pointerleave', () => {
        gsap.to(arch[i], { lift: 0, duration: 0.9, ease: 'power3.out', overwrite: 'auto' });
        gsap.to($('img', petal), { scale: 1, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
      });
    }
  });

  if (motionOK) {
    // Drag (or swipe) the wheel round; let go and it glides on and settles on an arch.
    let startX = 0;
    let startRot = 0;
    let samples = [];
    const degPerPixel = () => STEP / (geo.pw * 1.15);

    bloom.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !opened) return;
      startX = event.clientX;
      startRot = state.rot;
      samples = [{ x: event.clientX, t: performance.now() }];
      const move = (e) => {
        const dx = e.clientX - startX;
        if (!dragging && Math.abs(dx) > 6) {
          dragging = true;
          bloom.classList.add('is-dragging');
          gsap.killTweensOf(state, 'rot');
          autoCall?.kill();
          petals.forEach((_, i) => gsap.to(arch[i], { lift: 0, duration: 0.4, overwrite: 'auto' }));
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
        bloom.classList.remove('is-dragging');
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
        const first = samples[0];
        const last = samples[samples.length - 1];
        const seconds = Math.max((last.t - first.t) / 1000, 0.016);
        const velocity = ((last.x - first.x) / seconds) * degPerPixel(); // degrees per second
        const projected = state.rot + clamp(velocity, -900, 900) * 0.32;
        turnTo(Math.round(-projected / STEP), clamp(0.9 + Math.abs(velocity) / 1500, 0.9, 1.8), 'power3.out');
      };
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });

    bloom.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      hovering = true;
      autoCall?.kill();
    });
    bloom.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'mouse') return;
      hovering = false;
      schedule();
    });

    // The wheel leans a few degrees towards the pointer; the headline drifts the other way.
    if (finePointer()) {
      const lean = gsap.quickTo(state, 'lean', { duration: 1.4, ease: 'power3.out' });
      const copyX = gsap.quickTo(copy, 'x', { duration: 1.4, ease: 'power3.out' });
      hero.addEventListener('pointermove', (event) => {
        if (dragging) return;
        const nx = event.clientX / window.innerWidth - 0.5;
        lean(nx * 5);
        copyX(nx * -14);
      });
      hero.addEventListener('pointerleave', () => {
        lean(0);
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
      state.sats += gsap.ticker.deltaRatio() * 0.06;
      render();
    };
    ScrollTrigger.create({
      trigger: '.opening',
      start: 'top bottom',
      end: () => `top+=${window.innerHeight * 1.9} top`,
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

  window.addEventListener('resize', () => {
    measure();
  });
  measure();

  /**
   * As you scroll on, the wheel turns and opens outwards past the edges of the screen while
   * the headline lifts away; then the next section slides up over it.
   */
  function buildRunway() {
    gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: () => `+=${window.innerHeight}`, scrub: 1, invalidateOnRefresh: true },
    })
      .fromTo(state, { spread: 0, turn: 0 }, { spread: 1, turn: -STEP * 2.5, ease: 'power1.in' }, 0)
      .fromTo(copy, { y: 0, autoAlpha: 1, scale: 1 }, { y: () => -window.innerHeight * 0.14, autoAlpha: 0, scale: 0.94, ease: 'none' }, 0);
  }

  /* ---------- Opening ---------- */

  /** The three arches the loader flies in: the top one and its two neighbours. */
  const flown = [count - 1, 0, 1];

  /** Fold the wheel shut before the loader hands over: everything tucked behind the top arch. */
  function fold() {
    arch.forEach((a, i) => {
      a.b = flown.includes(i) ? 1 : 0;
      a.o = 0;
    });
    state.dial = 0;
    render();
  }

  /** Where arch i will sit once open, for the loader's arches to fly to. */
  function landing(i) {
    const { cx, cy, r, pw, ph } = geo;
    const angle = wrap180(i * STEP);
    const scale = 0.88 + 0.24 * Math.max(0, 1 - Math.abs(angle) / STEP);
    const rad = (angle * Math.PI) / 180;
    const width = pw * scale;
    const height = ph * scale;
    return {
      left: cx + r * Math.sin(rad) - width / 2,
      top: cy - r * Math.cos(rad) - height / 2,
      width,
      height,
      rotation: angle,
    };
  }

  /** Bloom open: the folded arches fan out from behind the top one, nearest first. */
  function open() {
    const timeline = gsap.timeline({
      onComplete: () => {
        opened = true;
        schedule();
      },
    });
    if (!motionOK) {
      arch.forEach((a) => Object.assign(a, { b: 1, o: 1 }));
      state.dial = 1;
      render();
      opened = true;
      return timeline;
    }
    const order = petals.map((_, i) => i).filter((i) => !flown.includes(i))
      .sort((p, q) => Math.abs(wrap180(p * STEP)) - Math.abs(wrap180(q * STEP)));
    order.forEach((i, n) => {
      const delay = Math.floor(n / 2) * 0.09;
      timeline.to(arch[i], { o: 1, duration: 0.35, ease: 'power1.out' }, delay);
      timeline.to(arch[i], { b: 1, duration: 1.9, ease: 'expo.out' }, delay);
    });
    timeline.fromTo(state, { dial: 0 }, { dial: 1, duration: 1.4, ease: 'power2.out' }, 0.2);
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
        schedule();
        return;
      }
      if (!motionOK) {
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
