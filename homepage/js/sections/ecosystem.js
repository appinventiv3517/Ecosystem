// Bloom Ecosystem: seven numbered businesses and one large photograph.
// Wide screens with motion: the stage is sticky and scrolling walks the selection down the list
// (a click scrolls to that business's stretch of the track, so scroll and selection never
// disagree). Each change wipes the new photograph in from the direction of travel, draws a wire
// from the selected row to the frame, turns the orbit to the business and shifts the ground colour.
// Without motion a click selects directly; on phones every business is shown in turn.

import { $, $$, clamp, listen, pad2, scrollToTarget } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const SVG = 'http://www.w3.org/2000/svg';

export function initEcosystem() {
  const section = $('[data-eco]');
  if (!section) return;
  const track = $('[data-eco-track]', section);
  const stage = $('[data-eco-stage]', section);
  const rows = $$('[data-eco-row]', section);
  const images = $$('[data-eco-img]', section);
  const num = $('[data-eco-num]', section);
  const dots = $('[data-eco-dots]', section);
  const wire = $('[data-eco-wire-path]', section);
  const wireDot = $('[data-eco-wire-dot]', section);
  const glow = $('[data-eco-glow]', section);
  const frame = $('[data-eco-frame]', section);
  const wide = window.matchMedia('(min-width: 900px)');
  const count = rows.length;
  let active = 0;
  let trigger = null;

  // Seven points around the orbit, the first at the top.
  const points = rows.map((row, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const dot = document.createElementNS(SVG, 'circle');
    dot.setAttribute('class', `eco__orbit-dot${i === 0 ? ' is-on' : ''}`);
    dot.setAttribute('cx', (100 + 78 * Math.cos(angle)).toFixed(2));
    dot.setAttribute('cy', (100 + 78 * Math.sin(angle)).toFixed(2));
    dot.setAttribute('r', '3.5');
    dots.append(dot);
    return dot;
  });

  section.style.setProperty('--eco-bg', rows[0].dataset.tone);

  /* ---------- The wire from the selected row to the photograph ---------- */

  function drawWire(animate) {
    if (!wide.matches) return;
    const box = stage.getBoundingClientRect();
    const head = $('.eco-row__head', rows[active]).getBoundingClientRect();
    const target = frame.getBoundingClientRect();
    const sx = head.right - box.left + 12;
    const sy = head.top + head.height / 2 - box.top;
    const ex = target.left - box.left + target.width * 0.08;
    const ey = target.top + target.height * 0.55 - box.top;
    const mid = sx + (ex - sx) * 0.55;
    wire.setAttribute('d', `M${sx.toFixed(1)} ${sy.toFixed(1)} C${mid.toFixed(1)} ${sy.toFixed(1)} ${mid.toFixed(1)} ${ey.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
    wireDot.setAttribute('cx', ex.toFixed(1));
    wireDot.setAttribute('cy', ey.toFixed(1));
    if (animate && motionOK) {
      gsap.fromTo(wire, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: EASE.inOut });
      gsap.fromTo(wireDot, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.5, delay: 0.7, ease: 'back.out(3)' });
    } else {
      gsap.set(wire, { strokeDasharray: 'none' });
    }
  }

  /* ---------- Selection ---------- */

  function select(index) {
    index = clamp(index, 0, count - 1);
    if (index === active) return;
    const forward = index > active;
    const incoming = images[index];
    const outgoing = images[active];
    active = index;

    rows.forEach((row, i) => {
      row.classList.toggle('is-active', i === index);
      $('.eco-row__head', row).setAttribute('aria-expanded', String(i === index));
    });
    points.forEach((dot, i) => dot.classList.toggle('is-on', i === index));
    num.textContent = pad2(index + 1);
    section.style.setProperty('--eco-bg', rows[index].dataset.tone);

    if (!motionOK) {
      images.forEach((image) => image.classList.toggle('is-active', image === incoming));
      drawWire(false);
      return;
    }

    gsap.killTweensOf([incoming, outgoing]);
    images.forEach((image) => {
      if (image !== incoming && image !== outgoing) gsap.set(image, { autoAlpha: 0, zIndex: 0 });
    });
    gsap.set(outgoing, { zIndex: 1 });
    gsap.set(incoming, { zIndex: 2, autoAlpha: 1 });
    incoming.classList.add('is-active');
    gsap.fromTo(incoming,
      { clipPath: forward ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)', scale: 1.18 },
      { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.15, ease: 'expo.out', clearProps: 'clipPath' });
    gsap.to(outgoing, {
      scale: 1.08,
      yPercent: forward ? -6 : 6,
      duration: 1.15,
      ease: 'expo.out',
      onComplete: () => {
        outgoing.classList.remove('is-active');
        gsap.set(outgoing, { autoAlpha: 0, yPercent: 0, scale: 1 });
      },
    });
    gsap.to(dots, { rotation: -(index / count) * 360, svgOrigin: '100 100', duration: 1.2, ease: EASE.inOut });
    gsap.to(glow, { xPercent: -5 * index, yPercent: (index % 3) * 10 - 10, duration: 1.4, ease: EASE.inOut });
    gsap.fromTo(num, { yPercent: forward ? 80 : -80, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: EASE.out });
    drawWire(true);
  }

  /* ---------- Scroll-controlled selection ---------- */

  function bind() {
    trigger?.kill();
    trigger = null;
    if (!motionOK || !wide.matches) return;
    trigger = ScrollTrigger.create({
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => select(Math.floor(self.progress * count * 0.999)),
      onRefresh: () => drawWire(false),
    });
  }
  bind();
  wide.addEventListener('change', bind);
  window.addEventListener('resize', () => drawWire(false));

  function scrollToIndex(index) {
    if (!trigger) {
      select(index);
      return false;
    }
    const span = trigger.end - trigger.start;
    window.scrollTo({ top: trigger.start + span * ((index + 0.5) / count), behavior: 'smooth' });
    return true;
  }

  rows.forEach((row, index) => {
    $('.eco-row__head', row).addEventListener('click', () => {
      if (!wide.matches) return;
      scrollToIndex(index);
    });
  });

  listen('bloom:vertical', ({ id }) => {
    const index = rows.findIndex((row) => row.dataset.verticalItem === id);
    if (index < 0) return;
    if (trigger) {
      scrollToIndex(index);
    } else if (wide.matches) {
      scrollToTarget(section);
      select(index);
    } else {
      scrollToTarget(rows[index]);
    }
  });

  // First wire once fonts and images have settled.
  requestAnimationFrame(() => drawWire(false));
  if (motionOK) {
    gsap.from(rows.map((row) => $('.eco-row__head', row)), {
      autoAlpha: 0,
      x: -30,
      duration: 0.9,
      stagger: 0.06,
      ease: EASE.out,
      scrollTrigger: { trigger: stage, start: 'top 75%', once: true },
    });
    gsap.from(frame, {
      clipPath: 'inset(100% 0% 0% 0% round 999px 999px 4px 4px)',
      duration: 1.6,
      ease: 'expo.inOut',
      scrollTrigger: { trigger: stage, start: 'top 70%', once: true },
      onComplete: () => gsap.set(frame, { clearProps: 'clipPath' }),
    });
  }
}
