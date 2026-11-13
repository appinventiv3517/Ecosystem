// Life at Bloom: the stage pins while the page scrolls through four chapters. Three arch
// "reels" turn in opposite directions to bring up each chapter's photographs.

import { $, $$, clamp } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

export function initLife() {
  const section = $('[data-life]');
  if (!section) return;

  const stage = $('[data-life-stage]', section);
  const chapters = $$('[data-life-chapter]', section);
  const reels = $$('.reel', section).map((reel) => ({ strip: $('.reel__strip', reel), down: reel.dataset.reel === 'down' }));
  const meter = $('[data-life-meter]', section);
  const count = chapters.length;
  let active = 0;
  let trigger = null;

  /** Strip position for a (possibly fractional) chapter index. */
  const stripPercent = (reel, position) => (reel.down ? -75 + 25 * position : -25 * position);

  function setChapter(index, position = index) {
    meter.style.setProperty('--progress', ((position + 1) / count).toFixed(3));
    if (index === active) return;
    active = index;
    chapters.forEach((chapter, i) => chapter.classList.toggle('is-active', i === index));
  }

  $$('[data-life-go]', section).forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.lifeGo);
      if (trigger) {
        // Scroll to the point in the pinned sequence where this chapter sits.
        const top = trigger.start + ((trigger.end - trigger.start) * index) / (count - 1);
        window.scrollTo({ top: Math.round(top) + 1, behavior: 'smooth' });
      } else {
        setChapter(index);
        reels.forEach((reel) => (reel.strip.style.transform = `translateY(${stripPercent(reel, index)}%)`));
      }
    });
  });

  if (!motionOK) return;

  reels.forEach((reel) => gsap.set(reel.strip, { y: 0, yPercent: stripPercent(reel, 0) }));

  const timeline = gsap.timeline({ defaults: { ease: EASE.smooth, duration: 0.86 } });
  for (let step = 1; step < count; step += 1) {
    timeline.addLabel(`chapter-${step - 1}`, step - 1);
    reels.forEach((reel, i) => {
      timeline.to(reel.strip, { yPercent: stripPercent(reel, step) }, step - 1 + i * 0.07);
    });
  }
  timeline.addLabel(`chapter-${count - 1}`, count - 1);
  timeline.set({}, {}, count - 1);

  trigger = ScrollTrigger.create({
    animation: timeline,
    trigger: stage,
    start: 'top top',
    end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < 900 ? 0.75 : 0.95) * (count - 1))}`,
    pin: true,
    scrub: 0.6,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    snap: { snapTo: 'labels', inertia: false, duration: { min: 0.25, max: 0.6 }, delay: 0.1, ease: 'power2.inOut' },
    onUpdate: (self) => {
      const position = self.progress * (count - 1);
      setChapter(clamp(Math.round(position), 0, count - 1), position);
    },
  });

  // The reels rise into place as the section arrives.
  gsap.from($$('.reel', section), {
    yPercent: 28,
    autoAlpha: 0,
    duration: 1.3,
    stagger: 0.12,
    ease: EASE.out,
    scrollTrigger: { trigger: section, start: 'top 70%', once: true },
  });
}
