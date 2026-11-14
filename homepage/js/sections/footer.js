// Closing screen and footer: an arch window opens to the whole screen behind the enquiry headline
// as it scrolls in, the directory columns arrive one after another, and the Bloom wordmark rises
// into place across the full width.

import { $, $$ } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';

export function initFooter() {
  const footer = $('[data-footer]');
  if (!footer || !motionOK) return;
  const closing = $('[data-closing]', footer);
  const windowFrame = $('[data-closing-window]', footer);
  const image = $('[data-closing-img]', footer);

  const arch = (top, side) => () => {
    const radius = Math.round(window.innerWidth * (1 - side * 2 / 100) / 2);
    return `inset(${top}% ${side}% 0% ${side}% round ${radius}px ${radius}px 0px 0px)`;
  };
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: closing, start: 'top 60%', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true },
  })
    .fromTo(windowFrame, { clipPath: arch(22, window.innerWidth < 760 ? 22 : 34) }, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: EASE.inOut }, 0)
    .fromTo(image, { scale: 1.35, yPercent: 6 }, { scale: 1, yPercent: 0 }, 0);

  gsap.from($$('.footer__grid > *', footer), {
    autoAlpha: 0,
    y: 40,
    duration: 1,
    stagger: 0.08,
    ease: EASE.out,
    scrollTrigger: { trigger: $('.footer__grid', footer), start: 'top 88%', once: true },
  });

  gsap.from($('[data-footer-mark] img', footer), {
    yPercent: 100,
    duration: 1.6,
    ease: 'expo.out',
    scrollTrigger: { trigger: $('[data-footer-mark]', footer), start: 'top 95%', once: true },
  });
}
