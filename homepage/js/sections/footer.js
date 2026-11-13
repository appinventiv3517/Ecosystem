// Footer: the directory arrives column by column and the proposition rises word by word.

import { $, $$ } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';

export function initFooter() {
  const footer = $('[data-footer]');
  if (!footer || !motionOK) return;

  gsap.from($$('[data-footer-grid] > *', footer), {
    autoAlpha: 0,
    y: 36,
    duration: 1,
    stagger: 0.08,
    ease: EASE.out,
    scrollTrigger: { trigger: '[data-footer-grid]', start: 'top 88%', once: true },
  });

  // Tied to the scroll so the words settle as the page reaches its end.
  gsap.from($$('[data-footer-statement] span', footer), {
    yPercent: 70,
    autoAlpha: 0,
    stagger: 0.12,
    ease: 'power2.out',
    scrollTrigger: { trigger: '[data-footer-statement]', start: 'top 100%', end: 'top 62%', scrub: 0.6 },
  });
}
