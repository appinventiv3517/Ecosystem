// Our philosophy: three cards that explain "Curated Community Living".
// Nothing is pinned. When the cards come into view they rise in one after another and each
// photograph opens inside its arch. The heading and the line beside it use the shared reveals
// (data-split, data-reveal in reveal.js). Without motion the cards are simply there.

import { $, $$ } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';

export function initStory() {
  const list = $('[data-story-cards]');
  if (!list || !motionOK) return;

  const cards = $$('[data-pcard]', list);
  const media = cards.map((card) => $('[data-pcard-media]', card));
  const photos = media.map((figure) => $('img', figure));
  const bodies = cards.map((card) => $('.pcard__body', card).children);

  const tl = gsap.timeline({
    defaults: { ease: EASE.out },
    scrollTrigger: { trigger: list, start: 'top 88%', once: true },
  });

  tl.from(cards, { y: 70, autoAlpha: 0, duration: 1.1, stagger: 0.12 }, 0)
    .from(media, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.3, stagger: 0.12, clearProps: 'clipPath' }, 0.05)
    .from(photos, { scale: 1.18, duration: 1.6, stagger: 0.12, clearProps: 'transform' }, 0.05);
  bodies.forEach((children, i) => {
    tl.from(children, { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.06 }, 0.3 + i * 0.12);
  });
}
