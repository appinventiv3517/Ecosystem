// About Bloom: figures count up as their dividers draw across.
// The numbers live in index.html (data-count / data-suffix), so they are edited there.

import { $$ } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const format = (value) => Math.round(value).toLocaleString('en-US');

export function initAbout() {
  const stats = $$('.stat');
  if (!stats.length) return;

  stats.forEach((stat) => {
    const value = stat.querySelector('[data-count]');
    const target = Number(value.dataset.count);
    const suffix = value.dataset.suffix || '';

    // Split the number from its suffix so the "+" can be styled, with the full value kept for screen readers.
    value.setAttribute('aria-label', `${format(target)}${suffix}`);
    value.innerHTML = `<span class="stat__number" aria-hidden="true">${format(target)}</span>${suffix ? `<span class="stat__suffix" aria-hidden="true">${suffix}</span>` : ''}`;

    if (!motionOK) return;
    const number = value.querySelector('.stat__number');
    const counter = { value: 0 };
    number.textContent = '0';
    stat.style.setProperty('--line', 0);
    gsap.set(value, { autoAlpha: 0, y: 30 });
    gsap.set(stat.querySelector('.stat__label'), { autoAlpha: 0 });

    ScrollTrigger.create({
      trigger: stat,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        const delay = (stats.indexOf(stat) % 3) * 0.12;
        gsap.timeline({ delay })
          .to(stat, { '--line': 1, duration: 1.2, ease: EASE.inOut }, 0)
          .to(value, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE.out }, 0.15)
          .to(counter, {
            value: target,
            duration: 2,
            ease: 'power2.out',
            onUpdate: () => (number.textContent = format(counter.value)),
          }, 0.15)
          .to(stat.querySelector('.stat__label'), { autoAlpha: 1, duration: 0.8 }, 0.5);
      },
    });
  });
}
