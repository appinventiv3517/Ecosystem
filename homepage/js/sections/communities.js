// Explore Communities: a horizontally scrolling gallery. Touch, trackpad and keyboard use
// native scrolling with snap points; a mouse can also grab and throw the track. Images
// drift inside their frames as the track moves, and the nearest card becomes the active one.

import { $, $$, clamp, finePointer, listen, pad2, rafThrottle, scrollToTarget } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

export function initCommunities() {
  const carousel = $('[data-carousel]');
  if (!carousel) return;

  const track = $('[data-carousel-track]', carousel);
  const cards = $$('.community', track);
  const now = $('[data-carousel-now]');
  const progress = $('[data-carousel-progress]');
  const prevButton = $('[data-carousel-prev]');
  const nextButton = $('[data-carousel-next]');
  let active = -1;

  const edge = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
  const snapLeft = (card) => Math.min(card.offsetLeft - edge(), track.scrollWidth - track.clientWidth);
  const maxScroll = () => Math.max(1, track.scrollWidth - track.clientWidth);

  function nearestIndex(position = track.scrollLeft) {
    let best = 0;
    let bestDistance = Infinity;
    cards.forEach((card, index) => {
      const distance = Math.abs(snapLeft(card) - position);
      if (distance < bestDistance - 1) {
        best = index;
        bestDistance = distance;
      }
    });
    return best;
  }

  function setActive(index) {
    if (index === active) return;
    active = index;
    cards.forEach((card, i) => card.classList.toggle('is-active', i === index));
    now.textContent = pad2(index + 1);
    now.classList.remove('is-changing');
    void now.offsetWidth;
    now.classList.add('is-changing');
  }

  const update = rafThrottle(() => {
    const fraction = clamp(track.scrollLeft / maxScroll(), 0, 1);
    const thumb = clamp(track.clientWidth / track.scrollWidth, 0.08, 1);
    progress.style.setProperty('--thumb', `${thumb * 100}%`);
    progress.style.setProperty('--pos', `${fraction * (1 / thumb - 1) * 100}%`);

    prevButton.disabled = track.scrollLeft < 4;
    nextButton.disabled = track.scrollLeft > maxScroll() - 4;
    // At the very end the last card may not reach the left edge, so treat the end as the last card.
    setActive(track.scrollLeft > maxScroll() - 4 && maxScroll() > 4 ? cards.length - 1 : nearestIndex());

    if (!motionOK) return;
    const centre = window.innerWidth / 2;
    cards.forEach((card) => {
      const box = card.getBoundingClientRect();
      if (box.right < -200 || box.left > window.innerWidth + 200) return;
      const offset = clamp((box.left + box.width / 2 - centre) / window.innerWidth, -1, 1);
      $('img', card).style.setProperty('--shift', `${(offset * -0.08 * box.width).toFixed(1)}px`);
    });
  });

  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  function goTo(index, { instant = false } = {}) {
    const card = cards[clamp(index, 0, cards.length - 1)];
    track.scrollTo({ left: snapLeft(card), behavior: instant || !motionOK ? 'auto' : 'smooth' });
  }

  /** Move one card along, skipping cards whose resting position the track already holds. */
  function step(direction) {
    let index = clamp(active + direction, 0, cards.length - 1);
    while (index > 0 && index < cards.length - 1 && Math.abs(snapLeft(cards[index]) - track.scrollLeft) < 4) {
      index += direction;
    }
    goTo(index);
  }

  prevButton.addEventListener('click', () => step(-1));
  nextButton.addEventListener('click', () => step(1));

  track.addEventListener('keydown', (event) => {
    if (event.target !== track) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  });

  /* ---------- Mouse: grab, throw, settle on the nearest card ---------- */

  const drag = { on: false, moved: false, startX: 0, startScroll: 0, lastX: 0, lastTime: 0, velocity: 0 };

  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    gsap?.killTweensOf(track);
    Object.assign(drag, { on: true, moved: false, startX: event.clientX, startScroll: track.scrollLeft, lastX: event.clientX, lastTime: performance.now(), velocity: 0 });
  });

  window.addEventListener('pointermove', (event) => {
    if (!drag.on) return;
    const distance = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) > 5) {
      drag.moved = true;
      track.classList.add('is-dragging');
    }
    if (!drag.moved) return;
    track.scrollLeft = drag.startScroll - distance;
    const time = performance.now();
    const elapsed = Math.max(1, time - drag.lastTime);
    drag.velocity = 0.75 * ((event.clientX - drag.lastX) / elapsed) + 0.25 * drag.velocity;
    drag.lastX = event.clientX;
    drag.lastTime = time;
  });

  function release() {
    if (!drag.on) return;
    drag.on = false;
    if (!drag.moved) return;
    // Project where the throw would land, then settle on the closest card.
    const stale = performance.now() - drag.lastTime > 80;
    const projected = track.scrollLeft - (stale ? 0 : drag.velocity * 380);
    const target = snapLeft(cards[nearestIndex(clamp(projected, 0, maxScroll()))]);
    const settle = () => track.classList.remove('is-dragging');
    if (motionOK) {
      const distance = Math.abs(target - track.scrollLeft);
      gsap.to(track, { scrollLeft: target, duration: clamp(distance / 900, 0.45, 1.1), ease: 'power3.out', onComplete: settle, onInterrupt: settle });
    } else {
      track.scrollLeft = target;
      settle();
    }
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  // A drag should not also count as a click on whatever was under the pointer.
  track.addEventListener('click', (event) => {
    if (!drag.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.moved = false;
  }, true);
  track.addEventListener('dragstart', (event) => event.preventDefault());

  /* ---------- "Drag" cursor ---------- */

  const cursor = $('[data-carousel-cursor]', carousel);
  if (cursor && finePointer() && motionOK) {
    const moveX = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3.out' });
    const moveY = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3.out' });
    carousel.addEventListener('pointermove', (event) => {
      const box = carousel.getBoundingClientRect();
      moveX(event.clientX - box.left);
      moveY(event.clientY - box.top);
      const overMedia = Boolean(event.target.closest('.community__media'));
      cursor.classList.toggle('is-visible', overMedia || drag.moved);
    });
    carousel.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
    carousel.addEventListener('pointerdown', () => cursor.classList.add('is-pressed'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-pressed'));
  }

  /* ---------- Entrance ---------- */

  if (motionOK) {
    gsap.set(cards, { autoAlpha: 0, x: 140 });
    ScrollTrigger.create({
      trigger: carousel,
      start: 'top 82%',
      once: true,
      onEnter: () => gsap.to(cards, { autoAlpha: 1, x: 0, duration: 1.4, stagger: 0.12, ease: EASE.out, clearProps: 'transform', onComplete: update }),
    });
  }

  /* ---------- Jump to a community from the menu or the search result ---------- */

  listen('bloom:community', ({ id }) => {
    const index = cards.findIndex((card) => card.dataset.community === id);
    if (index < 0) return;
    scrollToTarget(carousel, { offset: Math.max(96, window.innerHeight * 0.12) });
    setTimeout(() => {
      goTo(index);
      if (motionOK) {
        gsap.fromTo($('.community__media', cards[index]), { scale: 0.94 }, { scale: 1, duration: 1.1, ease: EASE.out, delay: 0.25, clearProps: 'scale' });
      }
    }, motionOK ? 350 : 0);
  });
}
