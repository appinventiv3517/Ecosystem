// Glimpses of Bloom World: one illustrative day that passes through all seven businesses.
//
// As the section arrives an arch opens onto the scene. The day then plays on its own: the sun
// travels a dial from morning to evening, stopping a few seconds at each business. At every
// stop the scene and its story change and the dial draws the links from that business to the
// others it works with. The links stay drawn as the day goes on, so by evening the seven are
// visibly one connected web; a last step says so, then the day starts again. It waits while
// the pointer or focus is on the story or dial, and has a pause button.
//
// Without motion (or reduced motion) nothing plays: the dial's stops work as tabs.
// Clicks anywhere on the page reach a business through the bloom:world event.

import { $, $$, clamp, listen, scrollToTarget } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const SVG_W = 1000;
const ARC = { cx: 500, cy: 290, rx: 470, ry: 250 };
const FIRST = 168; // degrees round the arc of the first and last stops
const LAST = 12;
const HOLD = 2.8; // seconds on each business
const HOLD_ALL = 4; // seconds on "all seven, together" before the day starts again

const point = (deg) => {
  const rad = (deg * Math.PI) / 180;
  return { x: ARC.cx + ARC.rx * Math.cos(rad), y: ARC.cy - ARC.ry * Math.sin(rad) };
};

export function initWorld() {
  const section = $('#world');
  if (!section) return;

  const track = $('[data-glimpse-track]', section);
  const windowEl = $('[data-glimpse-window]', section);
  const ui = $('[data-glimpse-ui]', section);
  const svg = $('[data-dial-svg]', section);
  const sun = $('[data-dial-sun]', section);
  const stops = $$('[data-stop]', section);
  const moments = $$('[data-moment]', section);
  const scenes = $$('[data-scene]', section);
  const ids = stops.map((stop) => stop.dataset.id);
  const COUNT = stops.length; // seven businesses
  const angles = ids.map((_, k) => FIRST - ((FIRST - LAST) * k) / (COUNT - 1));
  const points = angles.map(point);

  let current = -1;
  let shownScene = scenes.find((scene) => scene.classList.contains('is-active'));

  /* ---------- The dial ---------- */

  // Each business's links (its "connects with" list), drawn once as curves inside the arch.
  // ownLinks[k] holds the keys of the links business k's story names.
  const pairs = new Map();
  const ownLinks = ids.map(() => new Set());
  moments.forEach((moment) => {
    const a = ids.indexOf(moment.dataset.moment);
    if (a < 0) return;
    moment.dataset.links.split(' ').filter(Boolean).forEach((id) => {
      const b = ids.indexOf(id);
      const key = [Math.min(a, b), Math.max(a, b)].join('-');
      if (!pairs.has(key)) pairs.set(key, [Math.min(a, b), Math.max(a, b)]);
      ownLinks[a].add(key);
    });
  });

  const start = point(180);
  const end = point(0);
  const linkPaths = [...pairs.values()].map(([a, b]) => {
    const p = points[a];
    const q = points[b];
    // Each curve bows in towards the foot of the arch, so the links fan out as a web inside it.
    const mx = (p.x + q.x) / 2;
    const my = (p.y + q.y) / 2;
    const pull = 0.35 + (Math.abs(b - a) / (COUNT - 1)) * 0.4;
    const kx = mx + (ARC.cx - mx) * pull;
    const ky = my + (ARC.cy + 20 - my) * pull;
    return `<path class="dial__link" data-key="${a}-${b}" d="M${p.x.toFixed(1)} ${p.y.toFixed(1)} Q${kx.toFixed(1)} ${ky.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}"/>`;
  });
  svg.innerHTML = `
    <path class="dial__arc" d="M${start.x} ${start.y} A${ARC.rx} ${ARC.ry} 0 0 1 ${end.x} ${end.y}"/>
    <path class="dial__arc dial__arc--day" data-dial-day d="M${start.x} ${start.y}"/>
    <g class="dial__links">${linkPaths.join('')}</g>`;
  const day = $('[data-dial-day]', svg);
  const links = $$('.dial__link', svg);

  stops.forEach((stop, k) => {
    stop.parentElement.style.left = `${(points[k].x / SVG_W) * 100}%`;
    stop.parentElement.style.top = `${(points[k].y / 300) * 100}%`;
  });

  /** Place the sun (and the stretch of the day already travelled) at stop position s. */
  function drawSun(s) {
    const k = clamp(Math.floor(s), 0, COUNT - 1);
    const t = s - k;
    const deg = k >= COUNT - 1 ? angles[COUNT - 1] : angles[k] + (angles[k + 1] - angles[k]) * t;
    const p = point(deg);
    // The dial keeps the SVG's 1000 × 300 proportions, so both axes scale with its width.
    sun.style.transform = `translate3d(${((p.x / SVG_W) * 100).toFixed(3)}cqw, ${((p.y / SVG_W) * 100).toFixed(3)}cqw, 0)`;
    day.setAttribute('d', `M${start.x} ${start.y} A${ARC.rx} ${ARC.ry} 0 0 1 ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  }

  /* ---------- Moments ---------- */

  function setMoment(k, { animate = motionOK } = {}) {
    if (k === current) return;
    const previous = current;
    current = k;
    const id = k < COUNT ? ids[k] : 'all';
    const incoming = moments.find((moment) => moment.dataset.moment === id);
    const outgoing = moments.find((moment) => moment.classList.contains('is-active') && moment !== incoming);
    const sceneIn = scenes.find((scene) => scene.dataset.scene === id);
    const sceneOut = shownScene !== sceneIn ? shownScene : null;
    shownScene = sceneIn;

    // Dial: the active stop, the links its story names, and every link named earlier that day.
    stops.forEach((stop, i) => {
      stop.classList.toggle('is-active', i === k);
      stop.classList.toggle('is-passed', i < k);
      if (i === k) stop.setAttribute('aria-current', 'step');
      else stop.removeAttribute('aria-current');
    });
    const known = new Set(ownLinks.slice(0, k + 1).flatMap((set) => [...set]));
    links.forEach((link) => {
      const key = link.dataset.key;
      link.classList.toggle('is-live', k < COUNT && ownLinks[k].has(key));
      link.classList.toggle('is-known', k >= COUNT || known.has(key));
    });
    section.classList.toggle('is-all', k >= COUNT);

    // Story
    if (outgoing) {
      outgoing.classList.remove('is-active');
      if (animate) {
        gsap.to(outgoing, { autoAlpha: 0, y: -18, duration: 0.35, ease: 'power2.in', onComplete: () => { outgoing.hidden = true; gsap.set(outgoing, { clearProps: 'all' }); } });
      } else {
        outgoing.hidden = true;
      }
    }
    // A story coming straight back must not be hidden by its own fade-out finishing.
    gsap.killTweensOf(incoming);
    gsap.set(incoming, { clearProps: 'opacity,visibility,transform' });
    incoming.hidden = false;
    incoming.classList.add('is-active');
    if (animate) {
      const parts = [...incoming.children];
      gsap.fromTo(parts, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.05, ease: EASE.out, delay: outgoing ? 0.25 : 0, clearProps: 'transform,opacity,visibility' });
    }

    // Scene: the new photograph fades up over the old one and settles from a slight zoom.
    // Any scene left over from a transition that was cut short drops out of sight.
    scenes.forEach((scene) => {
      if (scene === sceneIn || scene === sceneOut) return;
      gsap.killTweensOf(scene);
      scene.classList.remove('is-active');
      gsap.set(scene, { clearProps: 'zIndex,opacity,visibility' });
    });
    if (sceneIn !== sceneOut) {
      if (animate) {
        gsap.killTweensOf([sceneIn, sceneOut]);
        gsap.set(sceneIn, { zIndex: 2, autoAlpha: 0 });
        if (sceneOut) gsap.set(sceneOut, { zIndex: 1 });
        gsap.to(sceneIn, {
          autoAlpha: 1, duration: 0.7, ease: 'power2.inOut',
          onComplete: () => {
            sceneOut?.classList.remove('is-active');
            gsap.set([sceneIn, sceneOut].filter(Boolean), { clearProps: 'zIndex,opacity,visibility' });
          },
        });
        gsap.fromTo($('img', sceneIn), { scale: 1.1 }, { scale: 1.02, duration: 2.4, ease: EASE.out });
        sceneIn.classList.add('is-active');
      } else {
        sceneOut?.classList.remove('is-active');
        sceneIn.classList.add('is-active');
      }
    }

    return previous;
  }

  /* ---------- Playing the day ---------- */

  const pause = $('[data-glimpse-pause]', section);
  let timer = null;
  let inView = false;
  let held = false; // pointer on the story or dial, or focus inside them
  let paused = false; // the visitor pressed pause

  /** Glide the sun to stop s. */
  function sunTo(s) {
    gsap.to(sunAt, { s: Math.min(s, COUNT - 1), duration: 0.8, ease: EASE.inOut, overwrite: true, onUpdate: () => drawSun(sunAt.s) });
  }
  const sunAt = { s: 0 };

  function show(k) {
    setMoment(k);
    if (motionOK) sunTo(k);
    else drawSun(Math.min(k, COUNT - 1));
  }

  function schedule() {
    timer?.kill();
    timer = null;
    section.classList.toggle('is-playing', motionOK && inView && !held && !paused);
    if (!motionOK || !inView || held || paused || document.hidden) return;
    // Each business stays for a few seconds; the day ends on all seven, then starts again.
    const wait = current >= COUNT ? HOLD_ALL : HOLD;
    section.style.setProperty('--hold', `${wait}s`);
    restartProgress();
    timer = gsap.delayedCall(wait, () => {
      show(current >= COUNT ? 0 : current + 1);
      schedule();
    });
  }

  /** Restart the thin line that fills under the active stop while it waits. */
  function restartProgress() {
    section.classList.remove('is-counting');
    void section.offsetWidth;
    section.classList.add('is-counting');
  }

  function goTo(id) {
    const k = id === 'all' ? COUNT : ids.indexOf(id);
    if (k < 0) return;
    show(k);
    const box = section.getBoundingClientRect();
    if (Math.abs(box.top) > 4) scrollToTarget(section);
    schedule();
  }

  listen('bloom:world', ({ id }) => goTo(id));
  stops.forEach((stop, k) => {
    stop.addEventListener('click', () => goTo(ids[k]));
    stop.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const next = clamp(k + (event.key === 'ArrowRight' ? 1 : -1), 0, COUNT - 1);
      stops[next].focus({ preventScroll: true });
      goTo(ids[next]);
    });
  });

  setMoment(0, { animate: false });
  drawSun(0);
  if (!motionOK) {
    if (pause) pause.hidden = true;
    return;
  }

  // The day waits while you read or use the story and the dial, and when you press pause.
  $$('[data-glimpse-story], [data-dial]', section).forEach((area) => {
    area.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      held = true;
      schedule();
    });
    area.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'mouse') return;
      held = false;
      schedule();
    });
    area.addEventListener('focusin', () => { held = true; schedule(); });
    area.addEventListener('focusout', (event) => {
      if (area.contains(event.relatedTarget)) return;
      held = false;
      schedule();
    });
  });
  pause?.addEventListener('click', () => {
    paused = !paused;
    pause.setAttribute('aria-pressed', String(paused));
    $('[data-pause-label]', pause).textContent = paused ? 'Play the day' : 'Pause the day';
    $('use', pause).setAttribute('href', paused ? '#i-play' : '#i-pause');
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);

  // Plays only while the section is on screen.
  ScrollTrigger.create({
    trigger: section,
    start: 'top 60%',
    end: 'bottom 40%',
    onToggle: (self) => {
      inView = self.isActive;
      schedule();
    },
  });

  // Arrival: an arch-shaped window opens out to the full scene as the section slides up.
  gsap.timeline({
    scrollTrigger: { trigger: track, start: 'top bottom', end: 'top top', scrub: 0.8, invalidateOnRefresh: true },
  })
    .fromTo(windowEl, {
      clipPath: () => {
        const r = Math.round(Math.min(window.innerWidth * 0.32, window.innerHeight * 0.6));
        return `inset(10% 18% 0% 18% round ${r}px ${r}px 0px 0px)`;
      },
    // The arch keeps its shape while it rises and opens out to the edges as it settles.
    }, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'power2.in' }, 0)
    .fromTo($('[data-glimpse-media]', section), { scale: 1.12 }, { scale: 1, ease: 'power1.out' }, 0)
    .fromTo(ui, { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, ease: 'power2.out' }, 0.45);
}
