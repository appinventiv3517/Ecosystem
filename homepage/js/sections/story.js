// Our philosophy: Curated Community Living, word by word.
// The stage is sticky; the scroll position picks the chapter (Curated, Community, Living, Together).
// Each turn is a short timeline rather than a scrub, so the words always land whole:
//   the old word wipes up and out of view while the new one wipes up into place,
//   the definition and figures rise in line by line and the figures count up,
//   the arch photograph opens from the bottom and the page colour shifts a shade.
// Scrubbed with the scroll: the photographs drift inside the letters, and the step bars fill.
// A click on a step scrolls to that chapter, so scroll and selection never disagree.

import { $, $$, clamp } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const TONES = ['#F8F6EA', '#F4EFE2', '#F1E9D8', '#F8F6EA'];

/** "6,500+" counts from 0 to 6,500 and keeps its "+". */
function countUp(element) {
  const text = element.dataset.final || element.textContent.trim();
  element.dataset.final = text;
  const target = Number(text.replace(/[^\d]/g, ''));
  const suffix = text.replace(/[\d,]/g, '');
  if (!target) return;
  const counter = { value: 0 };
  gsap.to(counter, {
    value: target,
    duration: target > 100 ? 1.6 : 1,
    ease: 'expo.out',
    onUpdate: () => (element.textContent = `${Math.round(counter.value).toLocaleString('en-US')}${suffix}`),
    onComplete: () => (element.textContent = text),
  });
}

export function initStory() {
  const track = $('[data-story]');
  if (!track) return;
  const section = track.closest('section');
  const tenets = $$('[data-tenet]', track);
  const steps = $$('[data-story-go]', track);
  const count = tenets.length;
  let current = 0;
  let trigger = null;

  const parts = tenets.map((tenet) => ({
    word: $('.tenet__word, .whole__line', tenet),
    words: $$('.whole__word', tenet),
    lines: $$('[data-tenet-line]', tenet),
    photo: $('[data-tenet-photo]', tenet),
    image: $('[data-tenet-photo] img', tenet),
    counts: $$('[data-tenet-count]', tenet),
  }));

  function setSteps(index) {
    steps.forEach((step, i) => {
      step.classList.toggle('is-active', i === index);
      if (i === index) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
  }

  function show(index, { instant = false } = {}) {
    index = clamp(index, 0, count - 1);
    if (index === current && !instant) return;
    const forward = index >= current;
    const from = parts[current];
    const to = parts[index];
    const leaving = tenets[current];
    const arriving = tenets[index];
    current = index;
    setSteps(index);

    tenets.forEach((tenet) => {
      if (tenet !== leaving && tenet !== arriving) tenet.classList.remove('is-active');
    });
    arriving.classList.add('is-active');
    gsap.to(section, { '--story-bg': TONES[index], duration: 0.9, ease: EASE.inOut });
    if (instant || leaving === arriving) return;

    gsap.killTweensOf([from.word, ...from.words, ...from.lines, from.photo, to.word, ...to.words, ...to.lines, to.photo, to.image]);

    // Out: the word wipes away upwards, its lines drop back, the photograph closes downwards.
    gsap.timeline({ onComplete: () => leaving.classList.remove('is-active') })
      .to(from.words.length ? from.words : from.word, {
        clipPath: forward ? 'inset(0% 0% 100% 0%)' : 'inset(100% 0% 0% 0%)',
        yPercent: forward ? -18 : 18,
        duration: 0.55,
        stagger: 0.04,
        ease: 'power3.in',
      }, 0)
      .to(from.lines, { autoAlpha: 0, y: forward ? -16 : 16, duration: 0.35, stagger: 0.04, ease: 'power2.in' }, 0)
      .to(from.photo, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.55, ease: 'power3.in' }, 0);

    // In: the new word rises out of a mask, then its lines, then the photograph opens.
    gsap.timeline({ delay: 0.32 })
      .fromTo(to.words.length ? to.words : to.word,
        { clipPath: forward ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)', yPercent: forward ? 22 : -22 },
        { clipPath: 'inset(0% 0% 0% 0%)', yPercent: 0, duration: 1.1, stagger: 0.09, ease: 'expo.out' }, 0)
      .fromTo(to.lines, { autoAlpha: 0, y: forward ? 24 : -24 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease: EASE.out }, 0.25)
      .fromTo(to.photo, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut' }, 0.1)
      .fromTo(to.image, { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0.1)
      .add(() => to.counts.forEach(countUp), 0.35);
  }

  // Steps: a click goes to that chapter (by scrolling when the stage is pinned).
  steps.forEach((step, index) => step.addEventListener('click', () => {
    if (trigger) {
      const span = trigger.end - trigger.start;
      window.scrollTo({ top: trigger.start + span * ((index + 0.5) / count), behavior: 'smooth' });
    } else {
      show(index);
    }
  }));

  if (!motionOK) return;

  trigger = ScrollTrigger.create({
    trigger: track,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const position = self.progress * count;
      steps.forEach((step, i) => step.style.setProperty('--fill', clamp(position - i, 0, 1).toFixed(3)));
      show(Math.min(count - 1, Math.floor(position)));
    },
    onRefresh: (self) => show(Math.min(count - 1, Math.floor(self.progress * count)), { instant: true }),
  });

  // The photographs drift inside the letters as the page scrolls.
  $$('[data-tenet-fill]', track).forEach((image) => {
    gsap.fromTo(image, { yPercent: -8 }, {
      yPercent: 8,
      ease: 'none',
      scrollTrigger: { trigger: track, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // The first word rises into place as the section arrives.
  gsap.fromTo(parts[0].word, { clipPath: 'inset(100% 0% 0% 0%)', yPercent: 22 }, {
    clipPath: 'inset(0% 0% 0% 0%)',
    yPercent: 0,
    duration: 1.3,
    ease: 'expo.out',
    scrollTrigger: { trigger: track, start: 'top 70%', once: true },
  });
  gsap.fromTo(parts[0].lines, { autoAlpha: 0, y: 24 }, {
    autoAlpha: 1,
    y: 0,
    duration: 0.9,
    stagger: 0.08,
    ease: EASE.out,
    delay: 0.3,
    scrollTrigger: { trigger: track, start: 'top 70%', once: true, onEnter: () => parts[0].counts.forEach(countUp) },
  });
  gsap.fromTo(parts[0].photo, { clipPath: 'inset(100% 0% 0% 0%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)',
    duration: 1.4,
    ease: 'expo.inOut',
    scrollTrigger: { trigger: track, start: 'top 70%', once: true },
  });
}
