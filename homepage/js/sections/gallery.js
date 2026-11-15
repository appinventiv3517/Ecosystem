// Explore Communities: a horizontal gallery.
// Wide screens with motion ("pinned"): the stage is sticky inside a track exactly as tall as the
// rail is wide, and the rail slides sideways with the scroll. Dragging with the mouse or swiping
// sideways on a trackpad scrolls the page by the same amount, so every way in stays in step.
// Phones, tablets and reduced motion ("swipe"): the rail is a native horizontal scroller.
// Either way, each photograph slides inside its frame as its card travels (the crop shifts),
// and the card nearest the centre comes to full size and drives the counter and progress.

import { $, $$, clamp, listen, pad2, scrollToTarget } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

export function initGallery() {
  const section = $('#communities');
  const track = $('[data-gallery-track]');
  if (!section || !track) return;

  const viewport = $('[data-gallery-viewport]', track);
  const rail = $('[data-gallery-rail]', track);
  const cards = $$('[data-gcard]', rail);
  const images = cards.map((card) => $('[data-gcard-img]', card));
  const nowLabel = $('[data-gallery-now]', track);
  const fill = $('[data-gallery-fill]', track);
  const ticks = $$('[data-gallery-ticks] b', track);
  const nameLabel = $('[data-gallery-name]', track);
  const wide = window.matchMedia('(min-width: 900px)');

  let pinned = false;
  let trigger = null;
  let travel = 0;
  let viewWidth = 0;
  let centres = [];
  let active = -1;

  /* ---------- Shared: crops, active card, counter ---------- */

  function measure() {
    viewWidth = viewport.clientWidth;
    centres = cards.map((card) => card.offsetLeft + card.offsetWidth / 2);
    travel = pinned ? Math.max(0, rail.scrollWidth - viewWidth) : Math.max(0, viewport.scrollWidth - viewWidth);
  }

  /** `offset` is how far the rail has moved left, in pixels. */
  function update(offset) {
    const middle = viewWidth / 2;
    let nearest = 0;
    let best = Infinity;
    centres.forEach((centre, index) => {
      const distance = centre - offset - middle;
      if (Math.abs(distance) < best) {
        best = Math.abs(distance);
        nearest = index;
      }
      if (motionOK) images[index].style.setProperty('--shift', `${clamp(-distance / viewWidth, -1, 1) * 4.5}%`);
    });
    fill.style.setProperty('--p', travel ? clamp(offset / travel, 0, 1).toFixed(4) : 0);
    setActive(nearest);
  }

  function setActive(index) {
    if (index === active) return;
    const first = active < 0;
    const forward = index > active;
    active = index;
    cards.forEach((card, i) => card.classList.toggle('is-active', i === index));
    ticks.forEach((tick, i) => tick.classList.toggle('is-on', i <= index));
    nowLabel.textContent = pad2(index + 1);
    const name = cards[index].dataset.name;
    if (first || !motionOK) {
      nameLabel.textContent = name;
      return;
    }
    gsap.timeline()
      .to(nameLabel, { yPercent: forward ? -110 : 110, duration: 0.25, ease: 'power2.in' })
      .add(() => (nameLabel.textContent = name))
      .fromTo(nameLabel, { yPercent: forward ? 110 : -110 }, { yPercent: 0, duration: 0.55, ease: EASE.out });
    gsap.fromTo(nowLabel, { yPercent: forward ? 60 : -60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: EASE.out });
  }

  /**
   * In pinned mode every card, text and buttons included, must sit inside the stage. On a short
   * window the photographs shrink (all by the same factor) until the tallest card fits.
   */
  function fitCards() {
    rail.style.setProperty('--fit', '1');
    const available = viewport.clientHeight - 12;
    let fit = 1;
    for (let pass = 0; pass < 3; pass += 1) {
      let worst = Infinity;
      cards.forEach((card) => {
        const media = card.querySelector('.gcard__media').offsetHeight;
        const body = card.offsetHeight - media;
        worst = Math.min(worst, (available - body) / media);
      });
      if (worst >= 0.999) break;
      fit = Math.max(0.45, fit * worst);
      rail.style.setProperty('--fit', fit.toFixed(3));
    }
  }

  /* ---------- Pinned mode ---------- */

  function setPinned() {
    pinned = true;
    rail.style.width = 'max-content';
    const size = () => {
      fitCards();
      measure();
      track.style.height = `calc(100svh + ${travel}px)`;
    };
    size();
    const tween = gsap.to(rail, {
      x: () => -travel,
      ease: 'none',
      onUpdate: () => update(-gsap.getProperty(rail, 'x')),
    });
    trigger = ScrollTrigger.create({
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      animation: tween,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onRefreshInit: size,
      toggleClass: { targets: section, className: 'is-in-view' },
    });
    update(0);
  }

  function unpin() {
    if (trigger) {
      trigger.animation?.kill();
      trigger.kill();
      trigger = null;
    }
    gsap.set(rail, { clearProps: 'x' });
    rail.style.width = '';
    rail.style.removeProperty('--fit');
    track.style.height = '';
    pinned = false;
  }

  /* ---------- Swipe mode ---------- */

  let swipeFrame = 0;
  viewport.addEventListener('scroll', () => {
    if (pinned || swipeFrame) return;
    swipeFrame = requestAnimationFrame(() => {
      swipeFrame = 0;
      update(viewport.scrollLeft);
    });
  }, { passive: true });

  function setSwipe() {
    measure();
    update(viewport.scrollLeft);
  }

  /* ---------- Mode ---------- */

  function apply() {
    unpin();
    if (motionOK && wide.matches) setPinned();
    else setSwipe();
    if (motionOK) ScrollTrigger.refresh();
  }
  wide.addEventListener('change', apply);
  window.addEventListener('resize', () => !pinned && setSwipe());
  apply();
  if (!pinned && motionOK) {
    ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top', toggleClass: { targets: section, className: 'is-in-view' } });
  }

  /* ---------- Going to a card ---------- */

  function goTo(index, { smooth = true } = {}) {
    index = clamp(index, 0, cards.length - 1);
    const target = clamp(centres[index] - viewWidth / 2, 0, travel);
    if (pinned) {
      const top = track.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + target + 1, behavior: smooth ? 'smooth' : 'auto' });
    } else {
      viewport.scrollTo({ left: target, behavior: smooth && motionOK ? 'smooth' : 'auto' });
    }
  }

  $('[data-gallery-prev]', track).addEventListener('click', () => goTo(active - 1));
  $('[data-gallery-next]', track).addEventListener('click', () => goTo(active + 1));
  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') goTo(active + 1);
    else if (event.key === 'ArrowLeft') goTo(active - 1);
    else return;
    event.preventDefault();
  });

  listen('bloom:community', ({ id }) => {
    const index = cards.findIndex((card) => card.dataset.community === id);
    if (index < 0) return;
    if (pinned) {
      goTo(index);
    } else {
      scrollToTarget(section);
      setTimeout(() => goTo(index), motionOK ? 650 : 0);
    }
    setTimeout(() => $('.gcard__explore', cards[index])?.focus({ preventScroll: true }), motionOK ? 1200 : 0);
  });

  /* ---------- Drag and sideways wheel (pinned mode, mouse and trackpad) ---------- */

  let drag = null;
  let suppressClick = false;
  viewport.addEventListener('pointerdown', (event) => {
    if (!pinned || event.pointerType !== 'mouse' || event.button !== 0) return;
    if (event.target.closest('a, button')) return;
    drag = { x: event.clientX, scroll: window.scrollY, moved: false };
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 4) return;
    if (!drag.moved) viewport.classList.add('is-dragging');
    drag.moved = true;
    window.scrollTo(0, drag.scroll - dx * 1.2);
  });
  const endDrag = () => {
    if (!drag) return;
    suppressClick = drag.moved;
    drag = null;
    viewport.classList.remove('is-dragging');
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('click', (event) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  viewport.addEventListener('wheel', (event) => {
    if (!pinned || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    window.scrollBy(0, event.deltaX);
  }, { passive: false });
}
