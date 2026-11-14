// Life at Bloom: a sticky stage. The headline rises out of its masks; six photographs drift up
// past it, each at its own depth; then a doorway-shaped frame rises from the bottom and opens
// to fill the screen with a closing photograph and line. All scrubbed by the scroll.

import { $, $$ } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';

export function initLife() {
  const track = $('[data-life-track]');
  if (!track || !motionOK) return;
  const head = $('[data-life-head]', track);
  const lines = $$('.life__line > span', track);
  const shots = $$('[data-lshot]', track);
  const open = $('[data-life-open]', track);
  const openImage = $('[data-life-open-img]', track);
  const openCopy = [...$('[data-life-open-copy]', track).children];

  gsap.fromTo(lines, { yPercent: 110 }, {
    yPercent: 0,
    duration: 1.4,
    stagger: 0.12,
    ease: 'expo.out',
    scrollTrigger: { trigger: track, start: 'top 60%', once: true },
  });

  const doorway = (top, side) => () => {
    const radius = Math.round(window.innerWidth * (1 - side * 2 / 100) / 2);
    return `inset(${top}% ${side}% 0% ${side}% round ${radius}px ${radius}px 0px 0px)`;
  };
  const narrow = () => (window.innerWidth < 760 ? 30 : 41);

  gsap.set(openCopy, { autoAlpha: 0, y: 30 });
  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: track, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true },
  });

  shots.forEach((shot) => {
    const depth = parseFloat(shot.dataset.depth) || 1;
    timeline.fromTo(shot, { y: 0 }, { y: () => -window.innerHeight * (1.05 + depth * 0.55), duration: 0.8 }, 0);
    timeline.fromTo($('img', shot), { yPercent: -8, scale: 1.12 }, { yPercent: 8, scale: 1.12, duration: 0.8 }, 0);
  });

  timeline
    .fromTo(open, { clipPath: doorway(100, 44) }, { clipPath: () => doorway(64, narrow())(), duration: 0.3, ease: 'power1.out' }, 0.25)
    .to(open, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', duration: 0.4, ease: EASE.inOut }, 0.55)
    .fromTo(openImage, { scale: 1.4 }, { scale: 1, duration: 0.7, ease: 'power1.out' }, 0.25)
    .to(head, { autoAlpha: 0, scale: 0.94, yPercent: -10, duration: 0.25 }, 0.55)
    .to(openCopy, { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.03 }, 0.86)
    .to({}, { duration: 0.06 }, 0.98);
}
