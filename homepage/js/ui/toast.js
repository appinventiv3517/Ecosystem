// One toast for every "this lives outside the prototype" moment.

import { $ } from '../lib/dom.js';

let timer = 0;

export function showToast(message, duration = 4600) {
  const toast = $('[data-toast]');
  if (!toast) return;
  $('[data-toast-text]', toast).textContent = message;
  toast.hidden = false;
  // Force a style flush so the transition runs from the hidden state.
  void toast.offsetWidth;
  toast.classList.add('is-visible');
  clearTimeout(timer);
  timer = setTimeout(() => {
    toast.classList.remove('is-visible');
    timer = setTimeout(() => {
      toast.hidden = true;
    }, 650);
  }, duration);
}

/** Destinations that belong to the full site get clear feedback instead of a dead link. */
export function demoDestination(label) {
  showToast(`“${label}” opens on the full Bloom site. This prototype covers the homepage only.`);
}
