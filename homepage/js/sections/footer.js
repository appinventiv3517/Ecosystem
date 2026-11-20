// Footer: the arch of the invitation rises into place, the directory arrives column by column,
// and the name Bloom World settles at the foot of the page as you reach it.

import { $, $$ } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';

export function initFooter() {
  const footer = $('[data-footer]');
  if (!footer || !motionOK) return;

  gsap.from('[data-footer-arch]', {
    clipPath: 'inset(35% 12% 0% 12% round 999px 999px 32px 32px)',
    y: 60,
    duration: 1.4,
    ease: EASE.out,
    clearProps: 'clipPath',
    scrollTrigger: { trigger: '[data-footer-arch]', start: 'top 85%', once: true },
  });

  gsap.from($$('[data-footer-grid] > *', footer), {
    autoAlpha: 0,
    y: 36,
    duration: 1,
    stagger: 0.08,
    ease: EASE.out,
    scrollTrigger: { trigger: '[data-footer-grid]', start: 'top 88%', once: true },
  });

  // Tied to the scroll so the words rise as the page reaches its end.
  gsap.from($$('[data-footer-statement] span', footer), {
    yPercent: 45,
    autoAlpha: 0,
    stagger: 0.12,
    ease: 'power2.out',
    scrollTrigger: { trigger: '[data-footer-statement]', start: 'top 100%', end: 'top 70%', scrub: 0.6 },
  });
}
