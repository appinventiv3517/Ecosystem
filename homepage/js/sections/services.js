// Customer Services, as a concierge. Pick what you need to do on the left; a cream highlight
// glides to it, and the card on the right turns to the place that handles it, with the
// feature that does the job picked out (and a link when a second app can do it too).
// The tabs on the card list every service, so nothing is hidden behind the tasks.
// Until someone picks, the concierge runs through the tasks by itself, a hairline timer
// showing when it will move on; pointing at the list pauses it, choosing stops it.

import { $, $$, finePointer, listen, scrollToTarget } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const AUTO_SECONDS = 4.2;

export function initServices() {
  const concierge = $('[data-concierge]');
  if (!concierge) return;

  const tasks = $$('[data-task]', concierge);
  const glow = $('[data-task-glow]', concierge);
  const tabList = $('[data-service-tabs]', concierge);
  const tabs = $$('[data-service-tab]', concierge);
  const pill = $('[data-tab-pill]', concierge);
  const panels = $$('.svc', concierge);
  const status = $('[data-tasks-status]', concierge);
  const answer = $('[data-answer]', concierge);
  const panelOf = (id) => panels.find((panel) => panel.dataset.service === id);
  const tabOf = (id) => tabs.find((tab) => tab.dataset.serviceTab === id);

  let current = panels.find((panel) => panel.classList.contains('is-active'))?.dataset.service;
  let currentTask = -1;
  let interacted = false;
  let inView = false;
  let hovering = false;
  let timer = null;

  /* ---------- Moving parts ---------- */

  function moveGlow(task, instant = false) {
    if (!task) {
      gsap.to(glow, { autoAlpha: 0, duration: instant ? 0 : 0.3 });
      return;
    }
    const to = { x: task.offsetLeft, y: task.offsetTop, width: task.offsetWidth, height: task.offsetHeight, autoAlpha: 1 };
    if (!motionOK || instant || gsap.getProperty(glow, 'opacity') === 0) gsap.set(glow, to);
    else gsap.to(glow, { ...to, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
  }

  function movePill(instant = false) {
    const tab = tabOf(current);
    if (!tab) return;
    const to = { x: tab.offsetLeft, width: tab.offsetWidth };
    if (!motionOK || instant) gsap.set(pill, to);
    else gsap.to(pill, { ...to, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
    // Keep the chosen tab in view when the tabs scroll sideways on a phone.
    if (tabList.scrollWidth > tabList.clientWidth) {
      const left = tab.offsetLeft - (tabList.clientWidth - tab.offsetWidth) / 2;
      tabList.scrollTo({ left, behavior: motionOK && !instant ? 'smooth' : 'auto' });
    }
  }

  /** Turn the card to service `id`, picking out `feature`, and offering `also` as a second home. */
  function show(id, { feature = null, also = '', instant = false } = {}) {
    const panel = panelOf(id);
    if (!panel) return;
    const previous = panelOf(current);
    const changed = id !== current;
    current = id;

    tabs.forEach((tab) => {
      const on = tab.dataset.serviceTab === id;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    movePill(instant);

    const features = $$('[data-feature]', panel);
    features.forEach((item) => item.classList.toggle('is-match', item.dataset.feature === feature));
    const alsoButton = $('[data-svc-also]', panel);
    alsoButton.hidden = !also;
    if (also) {
      alsoButton.dataset.target = also;
      $('b', alsoButton).textContent = panelOf(also).dataset.name;
    }

    if (!changed) {
      // Same card, a different job: just pick out the new feature.
      const match = features.find((item) => item.classList.contains('is-match'));
      if (motionOK && match && !instant) gsap.fromTo(match, { scale: 0.88 }, { scale: 1, duration: 0.6, ease: 'back.out(2)' });
      return;
    }

    panels.forEach((item) => {
      const on = item === panel;
      item.classList.toggle('is-active', on);
      item.inert = !on;
    });
    if (!motionOK || instant || !previous) return;

    // The old card steps back while the new one rises in: picture first, then words.
    gsap.killTweensOf([previous, panel]);
    gsap.set(previous, { visibility: 'visible' });
    gsap.fromTo(previous, { opacity: 1 }, {
      opacity: 0, y: -12, duration: 0.35, ease: 'power2.in',
      onComplete: () => gsap.set(previous, { clearProps: 'visibility,opacity,transform' }),
    });
    const media = $('[data-svc-media]', panel);
    const words = [$('.svc__for', panel), $('.svc__name', panel)];
    gsap.timeline({ defaults: { overwrite: 'auto' } })
      .fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none', clearProps: 'opacity' }, 0.1)
      .fromTo(media, { clipPath: 'inset(100% 0% 0% 0% round 20px)' }, { clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 0.95, ease: EASE.inOut, clearProps: 'clipPath' }, 0.1)
      .fromTo(media.children, { scale: 1.12, y: 24 }, { scale: 1, y: 0, duration: 1.25, ease: EASE.out, clearProps: 'transform' }, 0.1)
      .fromTo(words, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.07, ease: EASE.out }, 0.3)
      .fromTo(features, { autoAlpha: 0, y: 12, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.045, ease: 'back.out(1.7)' }, 0.4)
      .fromTo($('.svc__actions', panel), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE.out }, 0.55);
  }

  function announce(task) {
    const names = [task.dataset.task, task.dataset.also].filter(Boolean).map((id) => panelOf(id).dataset.name);
    status.textContent = `Start with ${names.join(' or ')}.`;
  }

  /* ---------- "I need to ..." types out the task in focus ---------- */

  const typed = $('[data-typed]', concierge);
  let typing = null;
  function typeOut(text) {
    if (!typed) return;
    const target = text ? text.charAt(0).toLowerCase() + text.slice(1) : '';
    typing?.kill();
    if (!motionOK) {
      typed.textContent = target;
      return;
    }
    const from = typed.textContent;
    const state = { n: from.length };
    typing = gsap.timeline()
      .to(state, { n: 0, duration: Math.min(0.32, from.length * 0.012), ease: 'none', onUpdate: () => (typed.textContent = from.slice(0, Math.round(state.n))) })
      .to(state, { n: target.length, duration: target.length * 0.034, ease: 'none', onUpdate: () => (typed.textContent = target.slice(0, Math.round(state.n))) });
  }

  function selectTask(index, { user = false, instant = false } = {}) {
    currentTask = index;
    const task = tasks[index];
    typeOut($('.task__text', task).textContent);
    tasks.forEach((item, i) => {
      item.classList.toggle('is-active', i === index);
      item.setAttribute('aria-pressed', String(i === index && user));
    });
    moveGlow(task, instant);
    show(task.dataset.task, { feature: task.dataset.feature, also: task.dataset.also || '', instant });
    if (user) announce(task);
  }

  function clearTasks() {
    currentTask = -1;
    typeOut('');
    tasks.forEach((item) => {
      item.classList.remove('is-active');
      item.setAttribute('aria-pressed', 'false');
    });
    moveGlow(null);
  }

  /* ---------- Running through the tasks on its own ---------- */

  function resetTimers() {
    timer?.kill();
    timer = null;
    $$('.task__timer b', concierge).forEach((bar) => gsap.set(bar, { scaleX: 0 }));
  }

  function runAuto() {
    resetTimers();
    if (!motionOK || interacted || !inView || hovering || document.hidden || currentTask < 0) return;
    const bar = $('.task__timer b', tasks[currentTask]);
    timer = gsap.fromTo(bar, { scaleX: 0 }, {
      scaleX: 1,
      duration: AUTO_SECONDS,
      ease: 'none',
      onComplete: () => {
        selectTask((currentTask + 1) % tasks.length);
        runAuto();
      },
    });
  }

  function stopAuto() {
    interacted = true;
    resetTimers();
  }

  /* ---------- Choosing ---------- */

  tasks.forEach((task, index) => {
    task.addEventListener('click', () => {
      stopAuto();
      selectTask(index, { user: true });
      // When the card sits below the list (tablets and phones), bring the answer into view.
      const box = answer.getBoundingClientRect();
      const stacked = box.top > task.parentElement.getBoundingClientRect().bottom - 4;
      if (stacked && (box.top > window.innerHeight * 0.3 || box.bottom < window.innerHeight * 0.5)) {
        scrollToTarget(answer, { offset: Math.max(88, window.innerHeight * 0.1) });
      }
    });
  });

  if (motionOK && finePointer()) {
    // Pointing at a task previews it; the timer waits until the pointer leaves the list.
    let hoverCall = null;
    const list = $('[data-tasks]', concierge);
    list.addEventListener('pointerenter', () => {
      hovering = true;
      resetTimers();
    });
    list.addEventListener('pointerleave', () => {
      hovering = false;
      hoverCall?.kill();
      runAuto();
    });
    tasks.forEach((task, index) => task.addEventListener('pointerenter', () => {
      hoverCall?.kill();
      if (index === currentTask) return;
      hoverCall = gsap.delayedCall(0.12, () => selectTask(index, { user: interacted }));
    }));
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => {
    stopAuto();
    clearTasks();
    status.textContent = '';
    show(tab.dataset.serviceTab);
  }));

  tabList.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.dataset.serviceTab === current);
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next.click();
    next.focus();
  });

  $$('[data-svc-also]', concierge).forEach((button) => button.addEventListener('click', () => {
    stopAuto();
    clearTasks();
    show(button.dataset.target);
  }));

  // From the menu, the intents, or the footer: open that service.
  listen('bloom:service', ({ id }) => {
    if (!panelOf(id)) return;
    stopAuto();
    clearTasks();
    status.textContent = '';
    show(id, { instant: true });
    scrollToTarget(answer, { offset: Math.max(96, window.innerHeight * 0.1) });
    setTimeout(() => tabOf(id).focus({ preventScroll: true }), motionOK ? 900 : 0);
  });

  /* ---------- Start ---------- */

  selectTask(0, { instant: true });
  const settle = () => {
    if (currentTask >= 0) moveGlow(tasks[currentTask], true);
    movePill(true);
  };
  window.addEventListener('resize', settle);
  document.fonts?.ready.then(settle);
  window.addEventListener('load', settle);

  if (!motionOK) return;

  document.addEventListener('visibilitychange', () => (document.hidden ? resetTimers() : runAuto()));
  ScrollTrigger.create({
    trigger: concierge,
    start: 'top 75%',
    end: 'bottom 20%',
    onToggle: (self) => {
      inView = self.isActive;
      if (inView) runAuto();
      else resetTimers();
    },
  });

  // The arch outlines behind drift on their own and slide past at their own pace as you scroll.
  const deco = $$('[data-services-deco] i');
  deco.forEach((item, i) => {
    gsap.to(item, { y: i % 2 ? 26 : -22, rotation: i % 2 ? -2 : 2, duration: 7 + i * 1.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });
  gsap.fromTo('[data-services-deco]', { yPercent: 8 }, {
    yPercent: -8, ease: 'none',
    scrollTrigger: { trigger: concierge.closest('section'), start: 'top bottom', end: 'bottom top', scrub: 1 },
  });

  // Entrance: the tasks slide in one by one and the card rises out of the red.
  gsap.set(tasks, { autoAlpha: 0, x: -36 });
  gsap.set(answer, { autoAlpha: 0, y: 80, rotate: 1.2 });
  gsap.set(glow, { autoAlpha: 0 });
  ScrollTrigger.create({
    trigger: concierge,
    start: 'top 82%',
    once: true,
    onEnter: () => {
      gsap.to(tasks, { autoAlpha: 1, x: 0, duration: 0.9, stagger: 0.06, ease: EASE.out, clearProps: 'transform' });
      gsap.to(answer, { autoAlpha: 1, y: 0, rotate: 0, duration: 1.3, ease: EASE.out, delay: 0.15, clearProps: 'transform', onComplete: settle });
      gsap.fromTo(glow, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.9, ease: 'back.out(1.6)', delay: 0.35 });
    },
  });
}
