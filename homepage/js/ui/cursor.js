// Pointer follower for mouse users: a dot that tracks exactly and a ring that trails it.
// The ring swells over anything clickable and shows a word where an area has its own
// gesture (data-cursor="Drag" on the communities stage, "Open" on the intent lines).
// The system pointer stays visible; this only adds to it.

import { $, finePointer } from '../lib/dom.js';
import { gsap, motionOK } from '../lib/motion.js';

const INTERACTIVE = 'a, button, label, input, textarea, [role="option"], [role="tab"]';
const LIGHT = '.on-dark, .on-red, .hero__frame, .stage__media, .stage__copy, .stage__tabs, .stage__next';

export function initCursor() {
  if (!motionOK || !finePointer()) return;
  const root = $('[data-cursor-el]');
  if (!root) return;
  const ring = $('.cursor__ring', root);
  const dot = $('.cursor__dot', root);
  const label = $('[data-cursor-label]', root);
  document.documentElement.classList.add('has-cursor');

  const ringX = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3.out' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3.out' });
  const dotX = gsap.quickSetter(dot, 'x', 'px');
  const dotY = gsap.quickSetter(dot, 'y', 'px');
  let shown = false;

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const { clientX: x, clientY: y, target } = event;
    if (!shown) {
      gsap.set(ring, { x, y });
      shown = true;
    }
    root.classList.add('is-visible');
    ringX(x);
    ringY(y);
    dotX(x);
    dotY(y);

    const element = target instanceof Element ? target : null;
    const named = element?.closest('[data-cursor]');
    const interactive = element?.closest(INTERACTIVE);
    // A labelled area keeps its word unless the pointer is on a control inside it.
    const word = named && (!interactive || interactive === named || !named.contains(interactive)) ? named.dataset.cursor : '';
    if (word) label.textContent = word;
    root.classList.toggle('has-label', Boolean(word));
    root.classList.toggle('is-hover', !word && Boolean(interactive));
    root.classList.toggle('is-light', Boolean(element?.closest(LIGHT)));
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => root.classList.remove('is-visible'));
  window.addEventListener('pointerdown', () => root.classList.add('is-down'));
  window.addEventListener('pointerup', () => root.classList.remove('is-down'));
}
