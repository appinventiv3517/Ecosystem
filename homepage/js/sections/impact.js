// About Bloom: the figures.
// The band's photograph opens from an inset card to the full width as it scrolls in (scrubbed),
// and the ledger's cells rise in one after another. Every number rolls into place like an
// odometer: each digit is a window onto a strip of 0-9 that spins once round and settles, the
// rightmost digits travelling furthest. The numbers live in index.html (data-count / data-suffix).

import { $, $$ } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const format = (value) => Math.round(value).toLocaleString('en-US');

/** Replace a figure's text with odometer digits; returns the strips and their target positions. */
function buildOdometer(value) {
  const target = Number(value.dataset.count);
  const suffix = value.dataset.suffix || '';
  const text = format(target);
  value.setAttribute('aria-label', `${text}${suffix}`);
  const odo = document.createElement('span');
  odo.className = 'odo';
  odo.setAttribute('aria-hidden', 'true');
  const strips = [];
  [...text].forEach((char) => {
    if (!/\d/.test(char)) {
      const sep = document.createElement('span');
      sep.className = 'odo__sep';
      sep.textContent = char;
      odo.append(sep);
      return;
    }
    const digit = document.createElement('span');
    digit.className = 'odo__digit';
    const strip = document.createElement('span');
    strip.className = 'odo__strip';
    // Two runs of 0-9, so every digit spins at least once round before it settles.
    for (let i = 0; i < 20; i += 1) {
      const cell = document.createElement('span');
      cell.textContent = String(i % 10);
      strip.append(cell);
    }
    digit.append(strip);
    odo.append(digit);
    strips.push({ strip, stop: 10 + Number(char) });
  });
  value.replaceChildren(odo);
  // Each window is as wide as the digit it settles on, so the number keeps its natural spacing.
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
  value.append(probe);
  const size = parseFloat(getComputedStyle(value).fontSize) || 16;
  strips.forEach(({ strip, stop }) => {
    probe.textContent = String(stop % 10);
    strip.parentElement.style.width = `${(probe.getBoundingClientRect().width / size).toFixed(3)}em`;
  });
  probe.remove();
  if (suffix) {
    const tail = document.createElement('span');
    tail.className = 'figure__suffix';
    tail.setAttribute('aria-hidden', 'true');
    tail.textContent = suffix;
    value.append(tail);
  }
  return strips;
}

function roll(strips, delay = 0) {
  strips.forEach(({ strip, stop }, i) => {
    gsap.fromTo(strip, { yPercent: 0 }, {
      yPercent: -(stop / 20) * 100,
      duration: 1.5 + (strips.length - i) * 0.12,
      delay: delay + i * 0.05,
      ease: 'expo.out',
    });
  });
}

export function initImpact() {
  const values = $$('.impact [data-count]');
  if (!values.length) return;

  if (!motionOK) {
    // Same markup, numbers simply at rest.
    values.forEach((value) => buildOdometer(value).forEach(({ strip, stop }) => (strip.style.transform = `translateY(${-(stop / 20) * 100}%)`)));
    return;
  }

  values.forEach((value) => {
    const strips = buildOdometer(value);
    gsap.set(strips.map((s) => s.strip), { yPercent: 0 });
    ScrollTrigger.create({
      trigger: value,
      start: 'top 88%',
      once: true,
      onEnter: () => roll(strips, value.closest('[data-ledger-cell]') ? (Number(value.closest('[data-ledger-cell]').style.getPropertyValue('--i')) % 3) * 0.12 : 0.1),
    });
  });

  // The band opens from an inset card to the full width, and its photograph settles.
  const band = $('[data-impact-band]');
  if (band) {
    const media = $('[data-impact-media]', band);
    gsap.fromTo(media, { clipPath: 'inset(8% 6% 8% 6% round 32px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 0px)',
      ease: 'none',
      scrollTrigger: { trigger: band, start: 'top bottom', end: 'top 15%', scrub: 0.4 },
    });
    gsap.fromTo($('[data-impact-img]', band), { scale: 1.3, yPercent: -6 }, {
      scale: 1,
      yPercent: 6,
      ease: 'none',
      scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  // Ledger cells rise in, one after another, with their rules drawing across.
  const cells = $$('[data-ledger-cell]');
  gsap.from(cells, {
    autoAlpha: 0,
    y: 50,
    duration: 1,
    stagger: 0.08,
    ease: EASE.out,
    scrollTrigger: { trigger: $('.ledger'), start: 'top 85%', once: true },
  });
}
