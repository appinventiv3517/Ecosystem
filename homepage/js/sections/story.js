// Brand story: one scrubbed timeline across a sticky stage. For each of four chapters the next
// photograph wipes up from the bottom while the one before it drifts and swells, the frame
// changes shape (full frame, arch, inset panel, full frame), the stage colour shifts, and the
// three words of Curated Community Living light up one at a time, then together.

import { $, $$, clamp, pad2 } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK, EASE } from '../lib/motion.js';

const CAPTIONS = ['Landscapes', 'Architecture', 'Lifestyle', 'Community'];
const TONES = ['#F8F6EA', '#F2ECDD', '#EDE4D0', '#F8F6EA'];

export function initStory() {
  const track = $('[data-story]');
  if (!track || !motionOK) return;

  const stage = $('[data-story-stage]', track);
  const frame = $('[data-story-frame]', track);
  const shots = $$('[data-story-shot]', track);
  const images = shots.map((shot) => $('img', shot));
  const words = $$('[data-story-word]', track);
  const texts = $$('[data-story-text]', track);
  const num = $('[data-story-num]', track);
  const bar = $('[data-story-bar]', track);
  const caption = $('[data-story-caption]', track);
  const ghost = $('[data-story-ghost]', track);
  const arch = $('[data-story-arch]', track);
  const chapters = shots.length;

  // Frame shapes, worked out from the frame's size so the arch is always a true semicircle.
  const shape = (index) => () => {
    const width = frame.offsetWidth;
    if (index === 1) {
      const radius = Math.round(width * 0.36);
      return `inset(0% 14% 0% 14% round ${radius}px ${radius}px 4px 4px)`;
    }
    if (index === 2) return 'inset(7% 5% 7% 5% round 28px 28px 28px 28px)';
    return 'inset(0% 0% 0% 0% round 4px 4px 4px 4px)';
  };

  // As the stage arrives, the frame opens from a narrow arch into its first shape.
  gsap.fromTo(frame, {
    clipPath: () => {
      const radius = Math.round(frame.offsetWidth * 0.2);
      return `inset(30% 30% 0% 30% round ${radius}px ${radius}px 4px 4px)`;
    },
  }, {
    clipPath: shape(0),
    ease: 'none',
    immediateRender: true,
    scrollTrigger: { trigger: track, start: 'top 90%', end: 'top top', scrub: true, invalidateOnRefresh: true },
  });
  gsap.fromTo(images[0], { scale: 1.3 }, {
    scale: 1.04,
    ease: 'none',
    scrollTrigger: { trigger: track, start: 'top bottom', end: 'top top', scrub: true },
  });
  gsap.fromTo(words, { yPercent: 40 }, {
    yPercent: 0,
    stagger: 0.08,
    ease: 'none',
    scrollTrigger: { trigger: track, start: 'top 85%', end: 'top 10%', scrub: true },
  });

  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => setChapter(chapterAt(self.progress)),
    },
  });

  // Chapter i turns over between time i - 0.55 and i; the timeline runs to `chapters`.
  gsap.set(words[0], { opacity: 1 });
  for (let i = 1; i < chapters; i += 1) {
    const at = i - 0.55;
    timeline
      .fromTo(shots[i], { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: EASE.inOut }, at)
      .fromTo(images[i], { scale: 1.28, yPercent: 6 }, { scale: 1.04, yPercent: 0, duration: 0.7, ease: 'power2.out' }, at)
      // Explicit start values: the entrance tweens above also drive the frame and the first
      // photograph, and a plain .to() would record their starting state instead of the chapter's.
      .fromTo(images[i - 1], { scale: 1.04, yPercent: 0 }, { scale: 1.16, yPercent: -7, duration: 0.6, ease: 'power1.in', immediateRender: false }, at)
      .fromTo(frame, { clipPath: shape(i - 1) }, { clipPath: shape(i), duration: 0.55, ease: EASE.inOut, immediateRender: false }, at)
      .to(stage, { backgroundColor: TONES[i], duration: 0.55 }, at);
    if (i < words.length) {
      timeline
        .to(words[i], { opacity: 1, duration: 0.3 }, at + 0.15)
        .to(words[i - 1], { opacity: 0.32, duration: 0.3 }, at + 0.15);
    } else {
      timeline.to(words, { opacity: 1, duration: 0.3, stagger: 0.04 }, at + 0.15);
    }
  }
  timeline
    .fromTo(ghost, { yPercent: 0 }, { yPercent: -30, duration: chapters }, 0)
    .fromTo(arch, { rotation: 0 }, { rotation: -8, transformOrigin: '50% 100%', duration: chapters }, 0)
    .fromTo($('path', arch), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2 }, 0)
    .to({}, { duration: 0.3 }, chapters - 0.3);

  const total = timeline.duration();
  const chapterAt = (progress) => {
    const time = progress * total;
    let index = 0;
    for (let i = 1; i < chapters; i += 1) if (time > i - 0.22) index = i;
    return index;
  };

  let current = 0;
  function setChapter(index) {
    if (index === current) return;
    const forward = index > current;
    const leaving = texts[current];
    const arriving = texts[index];
    current = index;
    // Only the outgoing and incoming lines may be visible, however fast the page is scrolled.
    gsap.killTweensOf(texts);
    texts.forEach((text) => {
      if (text === arriving) return;
      text.classList.remove('is-active');
      if (text !== leaving) gsap.set(text, { autoAlpha: 0 });
    });
    gsap.to(leaving, { autoAlpha: 0, y: forward ? -14 : 14, duration: 0.25, ease: 'power2.in' });
    arriving.classList.add('is-active');
    gsap.fromTo(arriving, { autoAlpha: 0, y: forward ? 18 : -18 }, { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.22, ease: EASE.out });
    num.textContent = pad2(index + 1);
    ghost.textContent = pad2(index + 1);
    bar.style.setProperty('--p', ((index + 1) / chapters).toFixed(3));
    gsap.timeline()
      .to(caption, { yPercent: forward ? -110 : 110, duration: 0.3, ease: 'power2.in' })
      .add(() => (caption.textContent = CAPTIONS[index]))
      .fromTo(caption, { yPercent: forward ? 110 : -110 }, { yPercent: 0, duration: 0.6, ease: EASE.out });
  }

  bar.style.setProperty('--p', (1 / chapters).toFixed(3));
  ScrollTrigger.addEventListener('refresh', () => setChapter(clamp(chapterAt(timeline.scrollTrigger?.progress || 0), 0, chapters - 1)));
}
