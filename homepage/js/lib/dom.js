// Small DOM helpers shared by every module.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const pad2 = (number) => String(number).padStart(2, '0');

/** True for a mouse or trackpad: hover effects and pointer followers are only wired up here. */
export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Page-level events let sections talk to each other without importing one another. */
export function emit(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

export function listen(name, handler) {
  document.addEventListener(name, (event) => handler(event.detail || {}));
}

const prefersInstant = () => !document.documentElement.classList.contains('motion');

/**
 * Scroll the page to an element or a hash. Sections carry their own top padding,
 * so they scroll flush; smaller targets are offset below the fixed header.
 */
export function scrollToTarget(target, { offset = null, instant = false } = {}) {
  const element = typeof target === 'string' ? (target === '#top' ? document.body : $(target)) : target;
  if (!element) return;
  let top = 0;
  if (element !== document.body) {
    const isSection = element.matches('section, footer');
    const gap = offset ?? (isSection ? 0 : headerHeight() + 24);
    top = element.getBoundingClientRect().top + window.scrollY - gap;
  }
  window.scrollTo({ top: Math.max(0, top), behavior: instant || prefersInstant() ? 'auto' : 'smooth' });
}

export function headerHeight() {
  const bar = $('.site-header__bar');
  return bar ? bar.getBoundingClientRect().height : 0;
}

/** Run a callback at most once per animation frame. */
export function rafThrottle(callback) {
  let frame = 0;
  return (...args) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      callback(...args);
    });
  };
}

/** Resolves when the element's image has loaded, or after a timeout so nothing waits forever. */
export function imageReady(image, timeout = 2500) {
  if (!image) return Promise.resolve();
  const loaded = image.complete && image.naturalWidth
    ? Promise.resolve()
    : new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
  return Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, timeout))]);
}
