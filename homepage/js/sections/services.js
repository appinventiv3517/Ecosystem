// Customer Services: pick a task and the pathway that handles it is highlighted.
// Every pathway stays visible and readable; hover only adds a preview and feedback.

import { $, $$, finePointer, listen, scrollToTarget } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

export function initServices() {
  const list = $('[data-services]');
  if (!list) return;

  const rows = $$('[data-service]', list);
  const tasks = $$('[data-task]');
  const status = $('[data-tasks-status]');
  const nameOf = (row) => $('.service__name', row).textContent;

  function highlight(ids, { announce = true, reveal = false } = {}) {
    const matches = rows.filter((row) => ids.includes(row.dataset.service));
    rows.forEach((row) => row.classList.toggle('is-match', matches.includes(row)));
    list.classList.toggle('has-match', matches.length > 0);
    if (announce) {
      const names = matches.map(nameOf);
      status.textContent = names.length ? `Start with ${names.join(' or ')}.` : '';
    }
    // On narrow screens the list sits below the tasks, so bring the match into view.
    if (reveal && matches.length) {
      const box = matches[0].getBoundingClientRect();
      if (box.top > window.innerHeight * 0.8 || box.bottom < 0) scrollToTarget(matches[0]);
    }
  }

  tasks.forEach((task) => {
    task.addEventListener('click', () => {
      const pressed = task.getAttribute('aria-pressed') === 'true';
      tasks.forEach((other) => other.setAttribute('aria-pressed', 'false'));
      if (pressed) {
        highlight([]);
        return;
      }
      task.setAttribute('aria-pressed', 'true');
      highlight(task.dataset.task.split(' '), { reveal: true });
    });
  });

  listen('bloom:service', ({ id }) => {
    tasks.forEach((task) => task.setAttribute('aria-pressed', 'false'));
    highlight([id], { announce: false });
    status.textContent = '';
    const row = rows.find((item) => item.dataset.service === id);
    if (!row) return;
    scrollToTarget(row, { offset: Math.max(120, window.innerHeight * 0.3) });
    setTimeout(() => $('.service__link', row).focus({ preventScroll: true }), motionOK ? 700 : 0);
  });

  /* ---------- App preview that follows the pointer ---------- */

  const preview = $('[data-service-preview]');
  if (preview && finePointer() && motionOK) {
    const image = $('img', preview);
    const moveX = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3.out' });
    const moveY = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3.out' });
    rows.filter((row) => row.dataset.preview).forEach((row) => {
      row.addEventListener('pointerenter', (event) => {
        image.src = row.dataset.preview;
        gsap.set(preview, { x: event.clientX + 28, y: event.clientY + 24 });
        preview.classList.add('is-visible');
      });
      row.addEventListener('pointermove', (event) => {
        // Keep the card on screen near the right edge.
        const x = Math.min(event.clientX + 28, window.innerWidth - preview.offsetWidth - 24);
        moveX(x);
        moveY(event.clientY + 24);
      });
      row.addEventListener('pointerleave', () => preview.classList.remove('is-visible'));
    });
    window.addEventListener('scroll', () => preview.classList.remove('is-visible'), { passive: true });
  }

  /* ---------- Entrance ---------- */

  if (motionOK) {
    gsap.set(rows, { autoAlpha: 0, x: 70 });
    ScrollTrigger.create({
      trigger: list,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(rows, { autoAlpha: 1, x: 0, duration: 1.1, stagger: 0.09, ease: EASE.out, clearProps: 'transform' }),
    });
    gsap.set(tasks, { autoAlpha: 0, scale: 0.86 });
    ScrollTrigger.create({
      trigger: tasks[0],
      start: 'top 92%',
      once: true,
      onEnter: () => gsap.to(tasks, { autoAlpha: 1, scale: 1, duration: 0.7, stagger: 0.045, ease: 'back.out(1.4)', clearProps: 'transform' }),
    });
  }
}
