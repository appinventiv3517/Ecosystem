// Pointer-led touches for mouse users: magnetic calls to action and a slight 3D tilt.
// Neither is needed to use the page, so both are skipped on touch and with reduced motion.

import { $$, finePointer } from '../lib/dom.js';
import { gsap, motionOK } from '../lib/motion.js';

/** Buttons marked data-magnetic lean a few pixels towards the cursor. */
export function initMagnetic() {
  if (!motionOK || !finePointer()) return;
  $$('[data-magnetic]').forEach((element) => {
    const moveX = gsap.quickTo(element, 'x', { duration: 0.5, ease: 'power3.out' });
    const moveY = gsap.quickTo(element, 'y', { duration: 0.5, ease: 'power3.out' });
    element.addEventListener('pointermove', (event) => {
      const box = element.getBoundingClientRect();
      moveX((event.clientX - (box.left + box.width / 2)) * 0.22);
      moveY((event.clientY - (box.top + box.height / 2)) * 0.3);
    });
    element.addEventListener('pointerleave', () => {
      moveX(0);
      moveY(0);
    });
  });
}

/** Elements matching the selector tilt up to `max` degrees towards the cursor. */
export function initTilt(selector, max = 5) {
  if (!motionOK || !finePointer()) return;
  $$(selector).forEach((element) => {
    gsap.set(element, { transformPerspective: 900 });
    const tiltX = gsap.quickTo(element, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const tiltY = gsap.quickTo(element, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    element.addEventListener('pointermove', (event) => {
      const box = element.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      tiltX(-y * max);
      tiltY(x * max);
    });
    element.addEventListener('pointerleave', () => {
      tiltX(0);
      tiltY(0);
    });
  });
}
