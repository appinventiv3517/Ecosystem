// Bloom ecosystem: seven businesses sit on a ring around "Curated Community Living".
// Choosing one turns the ring to bring it forward, draws its connection to the centre
// and swaps the photograph and copy. On smaller screens the ring becomes a row of tabs.

import { $, $$, finePointer, listen, scrollToTarget } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const RING_RADIUS = 420; // in the 1000-unit viewBox, so 42% of the stage
const ANCHOR_ANGLE = 180; // the active business sits at nine o'clock, beside its description
const AUTOPLAY_SECONDS = 5.5;

export function initEcosystem() {
  const root = $('[data-ecosystem]');
  if (!root) return;

  const section = root.closest('section');
  const orbit = $('[data-orbit]', root);
  const stage = $('[data-orbit-stage]', root);
  const nodeList = $('[data-orbit-nodes]', root);
  const nodes = $$('[data-vertical]', nodeList);
  const panels = $$('[data-vertical-panel]', root);
  const images = $$('[data-vertical-image]', root);
  const linkGroup = $('[data-orbit-links]', root);
  const pulse = $('[data-orbit-pulse]', root);
  const desktop = window.matchMedia('(min-width: 1100px)');
  const step = 360 / nodes.length;

  const state = { index: 0, rotation: 0, interacted: false, inView: false, hovering: false, turning: false, rest: null };
  let pulseTween = null;
  let autoplay = null;

  const links = nodes.map(() => {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('class', 'orbit__link');
    linkGroup.append(line);
    return line;
  });

  /* ---------- Ring geometry ---------- */

  function pointFor(index) {
    const angle = ((ANCHOR_ANGLE + index * step + state.rotation) * Math.PI) / 180;
    return { cos: Math.cos(angle), sin: Math.sin(angle) };
  }

  /** Where a connection stops: just outside the arch at the centre. */
  function innerRadius({ cos, sin }) {
    const halfWidth = 180 + 14;
    const halfHeight = 225 + 14;
    return Math.min(halfWidth / Math.max(Math.abs(cos), 0.001), halfHeight / Math.max(Math.abs(sin), 0.001));
  }

  function layout() {
    if (!desktop.matches) return;
    nodes.forEach((node, index) => {
      const point = pointFor(index);
      node.style.left = `${50 + (point.cos * RING_RADIUS) / 10}%`;
      node.style.top = `${50 + (point.sin * RING_RADIUS) / 10}%`;
      const inner = innerRadius(point);
      const line = links[index];
      line.setAttribute('x1', 500 + point.cos * (RING_RADIUS - 6));
      line.setAttribute('y1', 500 + point.sin * (RING_RADIUS - 6));
      line.setAttribute('x2', 500 + point.cos * inner);
      line.setAttribute('y2', 500 + point.sin * inner);
    });
  }

  /** A dot travels along the active connection, from the business into the centre. */
  function runPulse() {
    pulseTween?.kill();
    if (!motionOK || !desktop.matches) return;
    const line = links[state.index];
    const from = { x: +line.getAttribute('x1'), y: +line.getAttribute('y1') };
    const to = { x: +line.getAttribute('x2'), y: +line.getAttribute('y2') };
    pulseTween = gsap.timeline({ repeat: -1, repeatDelay: 0.5 })
      .fromTo(pulse, { attr: { cx: from.x, cy: from.y }, opacity: 0 }, { attr: { cx: to.x, cy: to.y }, duration: 1.5, ease: 'power1.inOut' }, 0)
      .to(pulse, { opacity: 1, duration: 0.25 }, 0)
      .to(pulse, { opacity: 0, duration: 0.3 }, 1.2);
  }

  /* ---------- Selection ---------- */

  function select(index, { user = false, focus = false } = {}) {
    index = (index + nodes.length) % nodes.length;
    if (user) stopAutoplay();
    if (index === state.index) {
      if (focus) nodes[index].focus({ preventScroll: true });
      return;
    }
    const previous = state.index;
    state.index = index;

    nodes.forEach((node, i) => {
      const active = i === index;
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-selected', String(active));
      node.tabIndex = active ? 0 : -1;
    });
    links.forEach((line, i) => line.classList.toggle('is-active', i === index));
    if (focus) nodes[index].focus({ preventScroll: true });

    // Ring: turn the short way round.
    let delta = -index * step - state.rotation;
    delta = ((((delta + 180) % 360) + 360) % 360) - 180;
    const target = state.rotation + delta;
    if (motionOK && desktop.matches) {
      pulseTween?.kill();
      gsap.set(pulse, { opacity: 0 });
      state.turning = true;
      gsap.to(state, {
        rotation: target,
        duration: 1.2,
        ease: EASE.inOut,
        overwrite: true,
        onUpdate: layout,
        onComplete: () => {
          state.turning = false;
          runPulse();
        },
      });
    } else {
      state.rotation = target;
      layout();
    }

    // Tabs row on smaller screens: keep the active tab in view.
    if (!desktop.matches) {
      const node = nodes[index];
      nodeList.scrollTo({ left: node.offsetLeft - nodeList.offsetLeft - 20, behavior: motionOK ? 'smooth' : 'auto' });
    }

    // Photograph: the new one wipes up inside the arch.
    const incoming = images[index];
    const outgoing = images[previous];
    if (motionOK) {
      gsap.killTweensOf(images);
      gsap.set(images, { zIndex: 0 });
      gsap.set(outgoing, { zIndex: 1, opacity: 1 });
      gsap.set(incoming, { zIndex: 2, opacity: 1 });
      gsap.fromTo(incoming, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.25 }, {
        clipPath: 'inset(0% 0% 0% 0%)',
        scale: 1,
        duration: 1.15,
        ease: EASE.inOut,
        onComplete: () => {
          images.forEach((image, i) => image.classList.toggle('is-active', i === index));
          gsap.set(images, { clearProps: 'opacity,zIndex,clipPath' });
        },
      });
    } else {
      images.forEach((image, i) => image.classList.toggle('is-active', i === index));
    }

    // Copy: the old panel steps back, the new one arrives line by line.
    const show = () => {
      panels.forEach((panel, i) => {
        panel.hidden = i !== index;
        panel.classList.toggle('is-active', i === index);
      });
      if (motionOK) {
        gsap.fromTo([...panels[index].children], { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.06, ease: EASE.soft, overwrite: true });
      }
    };
    if (motionOK) {
      gsap.to([...panels[previous].children], { autoAlpha: 0, y: -14, duration: 0.22, ease: 'power2.in', overwrite: true, onComplete: show });
    } else {
      show();
    }
  }

  /* ---------- Input: click, hover, keyboard, swipe ---------- */

  nodes.forEach((node, index) => {
    node.addEventListener('click', (event) => {
      state.rest = { x: event.clientX, y: event.clientY };
      select(index, { user: true });
    });
    if (finePointer()) {
      let intent = 0;
      node.addEventListener('pointermove', (event) => {
        const moved = !state.rest || Math.hypot(event.clientX - state.rest.x, event.clientY - state.rest.y) > 6;
        if (!desktop.matches || state.turning || !moved || index === state.index) return;
        clearTimeout(intent);
        intent = setTimeout(() => {
          state.rest = { x: event.clientX, y: event.clientY };
          select(index, { user: true });
        }, 140);
      });
      node.addEventListener('pointerleave', () => clearTimeout(intent));
    }
  });

  nodeList.addEventListener('keydown', (event) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (event.key in keys) {
      event.preventDefault();
      select(state.index + keys[event.key], { user: true, focus: true });
    } else if (event.key === 'Home') {
      event.preventDefault();
      select(0, { user: true, focus: true });
    } else if (event.key === 'End') {
      event.preventDefault();
      select(nodes.length - 1, { user: true, focus: true });
    }
  });

  // Swipe across the photograph on touch screens.
  let swipeStart = null;
  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    swipeStart = { x: event.clientX, y: event.clientY };
  });
  stage.addEventListener('pointerup', (event) => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) select(state.index + (dx < 0 ? 1 : -1), { user: true });
  });

  /* ---------- Autoplay until someone takes over ---------- */

  function stopAutoplay() {
    state.interacted = true;
    autoplay?.kill();
    autoplay = null;
  }

  function scheduleAutoplay() {
    autoplay?.kill();
    if (!motionOK || state.interacted) return;
    autoplay = gsap.delayedCall(AUTOPLAY_SECONDS, () => {
      if (state.inView && !state.hovering && !document.hidden) select(state.index + 1);
      scheduleAutoplay();
    });
  }

  orbit.addEventListener('pointerenter', () => (state.hovering = true));
  orbit.addEventListener('pointerleave', () => (state.hovering = false));
  orbit.addEventListener('focusin', stopAutoplay);

  /* ---------- Entrance and housekeeping ---------- */

  links[0].classList.add('is-active');
  layout();
  desktop.addEventListener('change', () => {
    nodes.forEach((node) => {
      node.style.left = '';
      node.style.top = '';
    });
    layout();
    runPulse();
  });

  if (motionOK) {
    const ring = $('.orbit__ring--outer', root);
    const core = $('[data-orbit-core]', root);
    gsap.set(ring, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(nodes, { autoAlpha: 0 });
    gsap.set(links, { autoAlpha: 0 });
    gsap.set(core, { autoAlpha: 0, y: 36 });
    gsap.set($$('.eco-panel.is-active > *', root), { autoAlpha: 0, y: 26 });

    ScrollTrigger.create({
      trigger: orbit,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        gsap.timeline({ onComplete: runPulse })
          .to(ring, { strokeDashoffset: 0, duration: 1.8, ease: EASE.smooth }, 0)
          .to(core, { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE.out }, 0.2)
          .to(nodes, { autoAlpha: 1, duration: 0.6, stagger: 0.09 }, 0.5)
          .to(links, { autoAlpha: 1, duration: 0.8, stagger: 0.06 }, 0.8)
          .to($$('.eco-panel.is-active > *', root), { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.07, ease: EASE.soft }, 0.5);
      },
    });

    ScrollTrigger.create({
      trigger: section,
      start: 'top 60%',
      end: 'bottom 40%',
      onToggle: (self) => {
        state.inView = self.isActive;
        if (self.isActive) scheduleAutoplay();
      },
    });

    initMarquee($('[data-marquee-track]', section));
  }

  listen('bloom:vertical', ({ id }) => {
    const index = nodes.findIndex((node) => node.dataset.vertical === id);
    if (index < 0) return;
    scrollToTarget(orbit, { offset: Math.max(96, window.innerHeight * 0.14) });
    setTimeout(() => select(index, { user: true }), motionOK ? 500 : 0);
  });
}

/** The band of business names drifts on its own and leans into the scroll direction. */
function initMarquee(track) {
  if (!track) return;
  let x = 0;
  let direction = -1;
  let velocity = 0;
  let visible = false;
  const half = () => track.scrollWidth / 2;
  const setX = gsap.quickSetter(track, 'x', 'px');

  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(track);
  ScrollTrigger.create({
    onUpdate: (self) => {
      velocity = Math.abs(self.getVelocity());
      if (velocity > 40) direction = self.direction === 1 ? -1 : 1;
    },
  });

  gsap.ticker.add((time, delta) => {
    velocity *= 0.92;
    if (!visible) return;
    const boost = Math.min(velocity / 900, 4);
    x += direction * (0.045 + boost * 0.05) * delta;
    const width = half();
    if (x <= -width) x += width;
    if (x > 0) x -= width;
    setX(x);
  });
}
