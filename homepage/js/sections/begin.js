// Intent-led entry. Pointing at (or focusing) a line previews where it leads in the arch
// window; following the line goes there. Until someone takes over, the preview cycles
// slowly through all four so the section never sits still.

import { $, $$, finePointer, pad2 } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const CYCLE_SECONDS = 4.2;

export function initIntents() {
  const root = $('[data-intents]');
  if (!root) return;

  const items = $$('.intent', root);
  const images = $$('[data-intent-image]', root);
  const panels = $$('[data-intent-panel]', root);
  const marker = $('[data-intent-marker]', root);
  const stampNum = $('[data-intent-num]', root);
  const wide = window.matchMedia('(min-width: 901px)');
  const state = { active: 0, touched: false, inView: false };
  let cycle = null;

  function placeMarker(instant = false) {
    if (!marker || !wide.matches) return;
    const item = items[state.active];
    const props = { y: item.offsetTop, height: item.offsetHeight };
    if (!gsap) {
      Object.assign(marker.style, { transform: `translateY(${props.y}px)`, height: `${props.height}px` });
    } else if (instant || !motionOK) {
      gsap.set(marker, props);
    } else {
      gsap.to(marker, { ...props, duration: 0.75, ease: EASE.out, overwrite: true });
    }
  }

  function activate(index, { user = false } = {}) {
    if (user) stopCycle();
    if (index === state.active) return;
    const previous = state.active;
    state.active = index;

    items.forEach((item, i) => item.classList.toggle('is-active', i === index));
    placeMarker();

    // Photograph: the new one rises through the arch while the old one sinks back.
    const incoming = images[index];
    const outgoing = images[previous];
    if (motionOK) {
      gsap.killTweensOf(images);
      gsap.set(images, { zIndex: 0 });
      gsap.set(outgoing, { zIndex: 1, opacity: 1 });
      gsap.set(incoming, { zIndex: 2, opacity: 1 });
      gsap.to(outgoing, { scale: 1.12, duration: 1.1, ease: EASE.inOut });
      gsap.fromTo(incoming, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.3 }, {
        clipPath: 'inset(0% 0% 0% 0%)',
        scale: 1,
        duration: 1.1,
        ease: EASE.inOut,
        onComplete: () => {
          images.forEach((image, i) => image.classList.toggle('is-active', i === index));
          gsap.set(images, { clearProps: 'opacity,zIndex,clipPath,scale' });
        },
      });
      gsap.timeline()
        .to(stampNum, { yPercent: -120, duration: 0.25, ease: 'power2.in' })
        .add(() => (stampNum.textContent = pad2(index + 1)))
        .fromTo(stampNum, { yPercent: 120 }, { yPercent: 0, duration: 0.5, ease: EASE.out });
    } else {
      images.forEach((image, i) => image.classList.toggle('is-active', i === index));
      stampNum.textContent = pad2(index + 1);
    }

    // Destination copy and links
    panels.forEach((panel, i) => (panel.hidden = i !== index));
    if (motionOK) {
      const panel = panels[index];
      gsap.fromTo([...panel.children], { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, ease: EASE.soft, overwrite: true });
      gsap.fromTo($$('.intent-view__links li', panel), { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 0.6, stagger: 0.05, delay: 0.2, ease: EASE.soft });
    }
  }

  items.forEach((item, index) => {
    const row = $('.intent__row', item);
    if (finePointer()) row.addEventListener('pointerenter', () => activate(index, { user: true }));
    row.addEventListener('focus', () => activate(index, { user: true }));
  });

  function stopCycle() {
    state.touched = true;
    cycle?.kill();
    cycle = null;
  }

  function scheduleCycle() {
    cycle?.kill();
    if (!motionOK || state.touched) return;
    cycle = gsap.delayedCall(CYCLE_SECONDS, () => {
      if (state.inView && wide.matches && !document.hidden) activate((state.active + 1) % items.length);
      scheduleCycle();
    });
  }

  window.addEventListener('resize', () => placeMarker(true));
  wide.addEventListener('change', () => placeMarker(true));
  placeMarker(true);

  if (!motionOK) return;

  // Lines rise out of their masks one after another.
  gsap.set($$('.intent__line', root), { yPercent: 110 });
  gsap.set($$('.intent__num, .intent__who, .intent__go, .intent__thumb', root), { autoAlpha: 0 });
  ScrollTrigger.create({
    trigger: root,
    start: 'top 78%',
    once: true,
    onEnter: () => {
      gsap.to($$('.intent__line', root), { yPercent: 0, duration: 1.2, stagger: 0.1, ease: EASE.out });
      gsap.to($$('.intent__num, .intent__who', root), { autoAlpha: 1, duration: 0.8, stagger: 0.05, delay: 0.25 });
      gsap.fromTo($$('.intent__go, .intent__thumb', root), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.8, stagger: 0.08, delay: 0.35, ease: 'back.out(1.6)', clearProps: 'scale' });
      gsap.fromTo(marker, { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: 0.9, delay: 0.6, ease: EASE.out, transformOrigin: 'top' });
    },
  });

  // The arch window opens out of a narrow arch as the section scrolls into place.
  const frame = $('[data-intent-frame]', root);
  if (frame) {
    gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 90%', end: 'top 25%', scrub: 0.8 } })
      .fromTo(frame, { clipPath: 'inset(38% 26% 0% 26% round 999px 999px 0px 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 0px 0px)', ease: 'none' }, 0)
      .fromTo(images, { yPercent: 8 }, { yPercent: 0, ease: 'none' }, 0);
  }

  ScrollTrigger.create({
    trigger: root,
    start: 'top 60%',
    end: 'bottom 30%',
    onToggle: (self) => {
      state.inView = self.isActive;
      if (self.isActive) scheduleCycle();
    },
  });
}
