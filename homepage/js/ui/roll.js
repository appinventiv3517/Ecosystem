// Rolling labels: buttons and navigation links carry a second copy of their text that
// rolls up into place on hover (styles in css/motion.css). The copy is hidden from
// assistive technology, so each label is still read once.

import { $$ } from '../lib/dom.js';
import { motionOK } from '../lib/motion.js';

export function initRoll() {
  if (!motionOK) return;
  // The search button's label is rewritten by script, so it keeps its own animation.
  $$('.btn__label:not([data-search-label]), .nav-item__link').forEach((element) => {
    const text = element.textContent.trim();
    if (!text || element.querySelector('.roll')) return;
    const roll = document.createElement('span');
    roll.className = 'roll';
    const inner = document.createElement('span');
    inner.className = 'roll__inner';
    const first = document.createElement('span');
    first.textContent = text;
    const second = document.createElement('span');
    second.textContent = text;
    second.setAttribute('aria-hidden', 'true');
    inner.append(first, second);
    roll.append(inner);
    element.replaceChildren(roll);
  });
}
