// Customer Services: six pathways as a numbered index. Rows slide in from the left one after
// another; over the app rows a screenshot follows the pointer; links from the menu and the
// footer bring the right row forward.

import { $, $$, emit, finePointer, listen, scrollToTarget } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';

export function initServices() {
  const list = $('[data-paths]');
  if (!list) return;
  const paths = $$('[data-path]', list);
  const preview = $('[data-path-preview]');
  const previewImage = $('img', preview);

  listen('bloom:service', ({ id }) => {
    if (id === 'enquiry') {
      emit('bloom:enquire', { interest: 'support' });
      return;
    }
    const path = $(`#service-${id}`);
    if (!path) return;
    scrollToTarget(path, { offset: window.innerHeight * 0.35 });
    paths.forEach((item) => item.classList.remove('is-called'));
    setTimeout(() => {
      path.classList.add('is-called');
      $('.path__row', path)?.focus({ preventScroll: true });
    }, motionOK ? 700 : 0);
    setTimeout(() => path.classList.remove('is-called'), 4000);
  });

  if (!motionOK) return;

  gsap.from(paths, {
    autoAlpha: 0,
    x: -60,
    duration: 1,
    stagger: 0.07,
    ease: EASE.out,
    scrollTrigger: { trigger: list, start: 'top 82%', once: true },
  });

  if (!finePointer()) return;
  const moveX = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3.out' });
  const moveY = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3.out' });
  const tilt = gsap.quickTo(preview, 'rotation', { duration: 0.8, ease: 'power3.out' });
  let lastX = 0;
  let placed = false;

  paths.forEach((path) => {
    const source = path.dataset.preview;
    if (!source) return;
    path.addEventListener('pointerenter', (event) => {
      if (previewImage.getAttribute('src') !== source) previewImage.setAttribute('src', source);
      if (!placed) {
        gsap.set(preview, { x: event.clientX + 24, y: event.clientY - 80 });
        placed = true;
      }
      preview.classList.add('is-visible');
    });
    path.addEventListener('pointerleave', () => preview.classList.remove('is-visible'));
    path.addEventListener('pointermove', (event) => {
      moveX(event.clientX + 24);
      moveY(event.clientY - preview.offsetHeight / 2);
      tilt(Math.max(-8, Math.min(8, (event.clientX - lastX) * 0.6)));
      lastX = event.clientX;
    });
  });
  window.addEventListener('scroll', () => preview.classList.remove('is-visible'), { passive: true });
}
