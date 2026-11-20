// Our Story: Bloom's timeline, driven by scrolling down. The stage holds still (sticky inside a
// tall track) while the years travel past from right to left; the year in focus is bright, the
// others recede, a large faint year behind the heading rolls to match, and the rail at the foot
// fills as you go. Any year on the rail scrolls straight to it.
//
// Without motion (or reduced motion) the years are an ordinary list and the rail is hidden.

import { $, $$, clamp, scrollToTarget } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

export function initStory() {
  const section = $('#story');
  if (!section) return;

  const track = $('[data-story-track]', section);
  const reel = $('[data-story-reel]', section);
  const items = $$('[data-story-item]', section);
  const stops = $$('[data-story-go]', section);
  const fill = $('[data-story-fill]', section);
  const ghost = $('[data-story-ghost]', section);
  const years = items.map((item) => $('.moment-y__year', item).textContent.trim());
  const last = items.length - 1;
  let active = 0;

  function setActive(k) {
    if (k === active) return;
    const forward = k > active;
    active = k;
    items.forEach((item, i) => item.classList.toggle('is-active', i === k));
    stops.forEach((stop, i) => {
      stop.classList.toggle('is-active', i === k);
      stop.classList.toggle('is-passed', i < k);
      if (i === k) stop.setAttribute('aria-current', 'step');
      else stop.removeAttribute('aria-current');
    });
    if (!motionOK) {
      ghost.textContent = years[k];
      return;
    }
    // The faint year behind the heading rolls to the new one.
    gsap.timeline()
      .to(ghost, { yPercent: forward ? -40 : 40, autoAlpha: 0, duration: 0.3, ease: 'power2.in', overwrite: true })
      .add(() => { ghost.textContent = years[k]; })
      .fromTo(ghost, { yPercent: forward ? 40 : -40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: EASE.out });
  }

  /** Where the reel must sit for year k to be in focus (its slide at the left of the content). */
  const offsetOf = (k) => -(items[k].offsetLeft - items[0].offsetLeft);

  function goTo(k) {
    if (!motionOK) {
      setActive(k);
      scrollToTarget(items[k], { offset: 120 });
      return;
    }
    const top = track.getBoundingClientRect().top + window.scrollY;
    const room = track.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (room * k) / last + 2, behavior: 'smooth' });
  }

  stops.forEach((stop, k) => {
    stop.addEventListener('click', () => goTo(k));
    stop.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const next = clamp(k + (event.key === 'ArrowRight' ? 1 : -1), 0, last);
      stops[next].focus({ preventScroll: true });
      goTo(next);
    });
  });

  if (!motionOK) {
    items.forEach((item) => item.classList.add('is-active'));
    return;
  }

  const moveX = gsap.quickTo(reel, 'x', { duration: 0.7, ease: 'power3.out' });
  const fillTo = gsap.quickTo(fill, 'scaleX', { duration: 0.7, ease: 'power3.out' });

  function follow(progress) {
    const f = progress * last;
    const k = Math.min(Math.floor(f), last - 1);
    const t = f - k;
    // Each year rests a moment before the reel moves on to the next.
    const eased = t < 0.3 ? 0 : t > 0.85 ? 1 : smoothStep((t - 0.3) / 0.55);
    const x = offsetOf(k) + (offsetOf(Math.min(k + 1, last)) - offsetOf(k)) * eased;
    moveX(x);
    fillTo(progress);
    setActive(clamp(Math.round(k + eased), 0, last));
  }

  ScrollTrigger.create({
    trigger: track,
    start: 'top top',
    end: 'bottom bottom',
    invalidateOnRefresh: true,
    onUpdate: (self) => follow(self.progress),
    onRefresh: (self) => follow(self.progress),
  });

  // Arrival: the heading and the first year rise in.
  gsap.from([$('.story__head', section), reel], {
    y: 48,
    autoAlpha: 0,
    duration: 1.1,
    stagger: 0.12,
    ease: EASE.out,
    scrollTrigger: { trigger: section, start: 'top 70%', once: true },
  });
}

/** Smooth step: eases in and out between 0 and 1. */
function smoothStep(x) {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}
