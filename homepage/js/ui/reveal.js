// Scroll-triggered entrances shared across sections. Markup opts in with attributes:
//   data-split="lines"   headline lines rise out of a mask, one after another
//   data-reveal="fade"   short rise and fade for supporting copy
//   data-reveal="rise"   longer rise for whole modules
//   data-reveal="clip"   image frame wipes open while the image settles
//   data-parallax="0.12" element drifts against the scroll by that fraction

import { $, $$ } from '../lib/dom.js';
import { gsap, ScrollTrigger, SplitText, motionOK, EASE } from '../lib/motion.js';

export function initReveals() {
  if (!motionOK) return;

  // Headlines
  $$('[data-split]').forEach((element) => {
    if (!SplitText) {
      gsap.set(element, { autoAlpha: 1 });
      return;
    }
    gsap.set(element, { autoAlpha: 1 });
    SplitText.create(element, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 115,
          duration: 1.15,
          ease: EASE.out,
          stagger: 0.09,
          scrollTrigger: { trigger: element, start: 'top 88%', once: true },
        });
      },
    });
  });

  // Supporting copy: batched so neighbours arrive in a short stagger.
  const fades = $$('[data-reveal="fade"]');
  gsap.set(fades, { autoAlpha: 0, y: 22 });
  ScrollTrigger.batch(fades, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE.soft, stagger: 0.08, overwrite: true }),
  });

  $$('[data-reveal="rise"]').forEach((element) => {
    gsap.fromTo(
      element,
      { autoAlpha: 0, y: 70 },
      { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE.out, scrollTrigger: { trigger: element, start: 'top 92%', once: true } },
    );
  });

  $$('[data-reveal="clip"]').forEach((element) => {
    const image = $('img', element);
    const timeline = gsap.timeline({ scrollTrigger: { trigger: element, start: 'top 85%', once: true } });
    timeline.fromTo(
      element,
      { autoAlpha: 1, clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: EASE.inOut, clearProps: 'clipPath' },
    );
    if (image) timeline.fromTo(image, { scale: 1.3 }, { scale: 1, duration: 1.8, ease: EASE.out }, 0);
  });

  $$('[data-parallax]').forEach((element) => {
    const amount = parseFloat(element.dataset.parallax) || 0.1;
    gsap.fromTo(
      element,
      { yPercent: -amount * 50 },
      {
        yPercent: amount * 50,
        ease: 'none',
        scrollTrigger: { trigger: element.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });
}
