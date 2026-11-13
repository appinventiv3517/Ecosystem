// GSAP setup. The library is vendored in /vendor/gsap and loaded as classic scripts,
// so it is read from the window here and shared with every section module.

export const gsap = window.gsap;
export const ScrollTrigger = window.ScrollTrigger;
export const SplitText = window.SplitText;

const root = document.documentElement;

/**
 * True only when GSAP loaded and the visitor has not asked for reduced motion.
 * Every module checks this before animating and falls back to plain state changes.
 */
export const motionOK = Boolean(gsap && ScrollTrigger) && root.classList.contains('motion');

if (!motionOK) {
  // Nothing will reveal hidden content, so make sure none is hidden.
  root.classList.remove('motion', 'is-intro', 'is-locked');
}

if (gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);
  gsap.defaults({ ease: 'power3.out', duration: 0.9 });
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/** Shared easing names so sections stay consistent. */
export const EASE = {
  // Gentle curves: quick to respond, long soft landing, no abrupt start or stop.
  out: 'power4.out',
  inOut: 'power3.inOut',
  soft: 'power3.out',
  smooth: 'power2.inOut',
};
