// Bloom ecosystem, "the skyline": seven arches side by side, one per business. The chosen
// business opens wide with its photograph and story while the others stand as slim arches
// with their names. Until someone picks, the skyline moves on by itself, a hairline timer
// along the foot of the open arch; pointing at the skyline pauses it, choosing stops it.
//
// The width change is a CSS transition on flex-grow, so it stays smooth and the arch tops
// reshape themselves as they widen. GSAP handles the words, the numbers and the entrance.

import { $, $$, finePointer, listen, pad2, scrollToTarget } from '../lib/dom.js';
import { gsap, ScrollTrigger, SplitText, motionOK, EASE } from '../lib/motion.js';

const AUTO_SECONDS = 6;

/** Count a figure such as "6,500+" up from zero, keeping its commas and suffix. */
function countUp(element) {
  const text = element.dataset.figure || element.textContent;
  element.dataset.figure = text;
  const match = text.match(/^([\d,]+)(.*)$/);
  if (!match) return;
  const target = Number(match[1].replace(/,/g, ''));
  const counter = { value: 0 };
  gsap.to(counter, {
    value: target,
    duration: 1.4,
    ease: 'power3.out',
    onUpdate: () => (element.textContent = Math.round(counter.value).toLocaleString('en-US') + match[2]),
    onComplete: () => (element.textContent = text),
  });
}

export function initEcosystem() {
  const section = $('#ecosystem');
  const skyline = $('[data-skyline]');
  if (!section || !skyline) return;

  const arches = $$('.eco-arch', skyline);
  const tabs = arches.map((arch) => $('.eco-arch__tab', arch));
  const panels = arches.map((arch) => $('.eco-arch__panel', arch));
  const images = arches.map((arch) => $('img', arch));
  const counter = $('[data-eco-count]', section);
  const names = panels.map((panel) => $('[data-eco-name]', panel));
  const letters = names.map((name) => (motionOK && SplitText ? SplitText.create(name, { type: 'words,chars', mask: 'chars', charsClass: 'name-char' }).chars : [name]));

  let active = Math.max(0, arches.findIndex((arch) => arch.classList.contains('is-active')));
  let timer = null;
  let interacted = false;
  let inView = false;
  let hovering = false;

  /** How wide the open arch ends up, so its words can be laid out at that width from the start. */
  function measureOpenWidth() {
    if (window.matchMedia('(max-width: 760px)').matches) {
      skyline.style.removeProperty('--open-w');
      return;
    }
    const style = getComputedStyle(arches[active]);
    const grow = parseFloat(style.getPropertyValue('--grow')) || 6;
    const gap = parseFloat(getComputedStyle(skyline).columnGap) || 0;
    const room = skyline.clientWidth - gap * (arches.length - 1);
    skyline.style.setProperty('--open-w', `${Math.floor((room * grow) / (grow + arches.length - 1))}px`);
  }
  measureOpenWidth();
  window.addEventListener('resize', measureOpenWidth);

  /* ---------- Opening a business ---------- */

  function setCount(index) {
    if (!counter) return;
    if (!motionOK) {
      counter.textContent = pad2(index + 1);
      return;
    }
    gsap.timeline()
      .to(counter, { yPercent: -60, autoAlpha: 0, duration: 0.22, ease: 'power2.in' })
      .add(() => (counter.textContent = pad2(index + 1)))
      .fromTo(counter, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: EASE.out });
  }

  function select(index, { user = false } = {}) {
    if (user) stopAuto();
    if (index === active) return;
    const previous = active;
    active = index;

    arches.forEach((arch, i) => {
      const on = i === index;
      arch.classList.toggle('is-active', on);
      tabs[i].setAttribute('aria-expanded', String(on));
    });
    setCount(index);

    const outPanel = panels[previous];
    const inPanel = panels[index];
    if (!motionOK) {
      outPanel.hidden = true;
      inPanel.hidden = false;
      return;
    }

    // The old story steps out; the new one waits for its arch to open, then rises in.
    const outItems = [...outPanel.children];
    gsap.killTweensOf(outItems);
    gsap.to(outItems, {
      autoAlpha: 0, y: 12, duration: 0.3, stagger: 0.03, ease: 'power2.in',
      onComplete: () => {
        if (panels[active] !== outPanel) outPanel.hidden = true;
        gsap.set(outItems, { clearProps: 'opacity,visibility,transform' });
      },
    });

    inPanel.hidden = false;
    const inItems = [...inPanel.children].filter((item) => item !== names[index]);
    const fact = $('.eco-arch__fact strong', inPanel);
    gsap.timeline()
      .fromTo(letters[index], { yPercent: 115 }, { yPercent: 0, duration: 1, stagger: 0.022, ease: EASE.out }, 0.42)
      .fromTo(inItems, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.07, ease: EASE.out }, 0.5)
      .add(() => fact && countUp(fact), 0.65);
    gsap.fromTo(images[index], { scale: 1.2 }, { scale: 1, duration: 1.9, ease: EASE.out, overwrite: 'auto' });
    gsap.to(images[previous], { scale: 1.06, x: 0, y: 0, duration: 1.2, ease: EASE.out, overwrite: 'auto' });
  }

  /* ---------- Moving on by itself ---------- */

  function resetTimers() {
    timer?.kill();
    timer = null;
    $$('.eco-arch__timer b', skyline).forEach((bar) => gsap.set(bar, { scaleX: 0 }));
  }

  function runAuto() {
    resetTimers();
    const running = motionOK && !interacted && inView && !document.hidden;
    skyline.classList.toggle('is-auto', running);
    if (!running) return;
    timer = gsap.fromTo($('.eco-arch__timer b', arches[active]), { scaleX: 0 }, {
      scaleX: 1,
      duration: AUTO_SECONDS,
      ease: 'none',
      paused: hovering,
      onComplete: () => {
        select((active + 1) % arches.length);
        runAuto();
      },
    });
  }

  function stopAuto() {
    interacted = true;
    resetTimers();
    skyline.classList.remove('is-auto');
  }

  /* ---------- Choosing ---------- */

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i, { user: true }));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const next = (i + step + arches.length) % arches.length;
      select(next, { user: true });
      tabs[next].focus({ preventScroll: true });
    });
  });

  // From the menu, the hero wheel or the footer: open that business.
  listen('bloom:vertical', ({ id }) => {
    const index = arches.findIndex((arch) => arch.dataset.verticalItem === id);
    if (index < 0) return;
    scrollToTarget(section);
    setTimeout(() => select(index, { user: true }), motionOK ? 500 : 0);
  });

  if (!motionOK) return;

  /* ---------- Pointer: a peek at the slim arches, and parallax in the open one ---------- */

  if (finePointer()) {
    skyline.addEventListener('pointerenter', () => {
      hovering = true;
      timer?.pause();
    });
    skyline.addEventListener('pointerleave', () => {
      hovering = false;
      arches.forEach((arch) => arch.classList.remove('is-peek'));
      if (timer) timer.resume();
      else runAuto();
    });
    arches.forEach((arch, i) => {
      arch.addEventListener('pointerenter', () => arch.classList.add('is-peek'));
      arch.addEventListener('pointerleave', () => arch.classList.remove('is-peek'));
      const moveX = gsap.quickTo(images[i], 'x', { duration: 1.2, ease: 'power3.out' });
      const moveY = gsap.quickTo(images[i], 'y', { duration: 1.2, ease: 'power3.out' });
      arch.addEventListener('pointermove', (event) => {
        if (i !== active) return;
        const box = arch.getBoundingClientRect();
        moveX(((event.clientX - box.left) / box.width - 0.5) * -22);
        moveY(((event.clientY - box.top) / box.height - 0.5) * -16);
      });
      arch.addEventListener('pointerleave', () => {
        moveX(0);
        moveY(0);
      });
    });
  }

  document.addEventListener('visibilitychange', () => (document.hidden ? resetTimers() : runAuto()));
  ScrollTrigger.create({
    trigger: skyline,
    start: 'top 80%',
    end: 'bottom 15%',
    onToggle: (self) => {
      inView = self.isActive;
      runAuto();
    },
  });

  /* ---------- The ring of words turns, faster while the page scrolls ---------- */

  const ring = $('[data-eco-ring-text]', section);
  if (ring) {
    const spin = gsap.to(ring, { rotation: 360, duration: 26, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        gsap.to(spin, { timeScale: 1 + Math.min(Math.abs(self.getVelocity()) / 220, 9), duration: 0.2, overwrite: true });
        gsap.to(spin, { timeScale: 1, duration: 1.4, delay: 0.25 });
      },
    });
  }

  /* ---------- Entrance: the skyline rises, arch by arch, from the middle out ---------- */

  const arch = (inset) => `inset(${inset} 0% 0% 0% round 999px 999px 20px 20px)`;
  const labels = arches.map((item) => $('.eco-arch__label', item));
  const firstItems = [...panels[active].children].filter((item) => item !== names[active]);
  skyline.classList.add('is-entering');
  gsap.set(arches, { clipPath: arch('100%') });
  gsap.set(images, { scale: 1.25 });
  gsap.set(labels, { autoAlpha: 0 });
  gsap.set(letters[active], { yPercent: 115 });
  gsap.set(firstItems, { autoAlpha: 0, y: 18 });
  ScrollTrigger.create({
    trigger: skyline,
    start: 'top 78%',
    once: true,
    onEnter: () => {
      gsap.timeline({
        onComplete: () => {
          gsap.set(arches, { clearProps: 'clipPath' });
          skyline.classList.remove('is-entering');
        },
      })
        .to(arches, { clipPath: arch('0%'), duration: 1.5, stagger: { each: 0.08, from: 'center' }, ease: 'expo.out' }, 0)
        .to(images, { scale: 1, duration: 2, stagger: { each: 0.08, from: 'center' }, ease: EASE.out }, 0)
        .to(labels, { autoAlpha: 1, duration: 0.8, stagger: 0.05, ease: 'power2.out', clearProps: 'opacity,visibility' }, 0.6)
        .to(letters[active], { yPercent: 0, duration: 1.1, stagger: 0.025, ease: EASE.out }, 0.55)
        .to(firstItems, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: EASE.out }, 0.7)
        .add(() => {
          const fact = $('.eco-arch__fact strong', panels[active]);
          if (fact) countUp(fact);
        }, 0.8);
    },
  });
}
