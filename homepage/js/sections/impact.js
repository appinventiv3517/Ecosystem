// About Bloom figures: each number rises out of its mask and counts up while the rule above it
// draws across. The numbers live in index.html (data-count / data-suffix), so they are edited there.

import { $$ } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const format = (value) => Math.round(value).toLocaleString('en-US');

export function initImpact() {
  const figures = $$('[data-figures] .figure');
  figures.forEach((figure, index) => {
    const value = figure.querySelector('[data-count]');
    const target = Number(value.dataset.count);
    const suffix = value.dataset.suffix || '';

    // Split the number from its suffix so the "+" can be styled; screen readers get the whole value.
    value.setAttribute('aria-label', `${format(target)}${suffix}`);
    value.innerHTML = `<span class="figure__number" aria-hidden="true">${format(target)}</span>${suffix ? `<span class="figure__suffix" aria-hidden="true">${suffix}</span>` : ''}`;
    if (!motionOK) return;

    const number = value.querySelector('.figure__number');
    const parts = value.children;
    const label = figure.querySelector('.figure__label');
    const counter = { value: 0 };
    // Hold the final width so the line does not reflow while the digits count.
    number.style.minWidth = `${number.offsetWidth}px`;
    number.textContent = '0';
    figure.style.setProperty('--line', 0);
    gsap.set(parts, { yPercent: 105 });
    gsap.set(label, { autoAlpha: 0, y: 12 });

    ScrollTrigger.create({
      trigger: figure,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.timeline({ delay: (index % 3) * 0.1 })
          .to(figure, { '--line': 1, duration: 1.3, ease: EASE.inOut }, 0)
          .to(parts, { yPercent: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out' }, 0.1)
          .to(counter, {
            value: target,
            duration: target > 100 ? 2.2 : 1.4,
            ease: 'expo.out',
            onUpdate: () => (number.textContent = format(counter.value)),
          }, 0.1)
          .to(label, { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE.soft }, 0.45);
      },
    });
  });
}
