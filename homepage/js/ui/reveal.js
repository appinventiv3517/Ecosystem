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

  // Numbered section labels: the number fades up and the rule draws across.
  $$('.sec-label').forEach((element) => {
    const rule = $('.sec-label__rule', element);
    const timeline = gsap.timeline({ scrollTrigger: { trigger: element, start: 'top 92%', once: true } });
    timeline.fromTo(element, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE.soft }, 0);
    if (rule) timeline.fromTo(rule, { '--draw': 0 }, { '--draw': 1, duration: 1.3, ease: EASE.inOut }, 0.1);
  });

  // Oversized outlined words that slide sideways as their section passes.
  $$('[data-drift-x]').forEach((element) => {
    const amount = parseFloat(element.dataset.driftX) || 0.2;
    gsap.fromTo(element, { xPercent: amount * 50 }, {
      xPercent: -amount * 50,
      ease: 'none',
      scrollTrigger: { trigger: element.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Eyebrow rules draw across before their label settles.
  $$('.eyebrow').forEach((element) => {
    gsap.fromTo(element, { '--draw': 0 }, {
      '--draw': 1,
      duration: 1.2,
      ease: EASE.inOut,
      scrollTrigger: { trigger: element, start: 'top 92%', once: true },
    });
  });

  // Statements that fill in word by word as they scroll through the screen.
  $$('[data-scrub-words]').forEach((element) => {
    if (!SplitText) return;
    const { words } = SplitText.create(element, { type: 'words' });
    gsap.fromTo(words, { opacity: 0.16 }, {
      opacity: 1,
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: { trigger: element, start: 'top 85%', end: 'bottom 50%', scrub: true },
    });
  });

  // Groups whose children arrive one after another.
  $$('[data-stagger]').forEach((group) => {
    gsap.fromTo([...group.children], { autoAlpha: 0, y: 16 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.7,
      stagger: 0.06,
      ease: EASE.soft,
      scrollTrigger: { trigger: group, start: 'top 94%', once: true },
    });
  });

  // Decorative outlines that drift against the scroll at their own speed.
  $$('[data-drift]').forEach((element) => {
    const amount = parseFloat(element.dataset.drift) || 0.1;
    gsap.fromTo(element, { yPercent: -amount * 100 }, {
      yPercent: amount * 100,
      ease: 'none',
      scrollTrigger: { trigger: element.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true },
    });
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
