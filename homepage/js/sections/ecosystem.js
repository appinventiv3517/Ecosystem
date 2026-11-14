// Bloom ecosystem, "the Bloom book". The section's stage holds still while you scroll through
// a track behind it, and the scroll turns the pages: first the red cover opens, then one page
// per business. Every spread is one business: its photograph in an arch window on the left
// page, its story set like a magazine page on the right. The book always settles on a whole
// spread. On phones the businesses are a deck of pages that flip up and away instead.
//
// The book is built here from the plain list in the markup (which is what shows without
// motion): leaf 0 is the cover with the first photograph on its back; leaf n carries the story
// of business n-1 on its front and the photograph of business n on its back. A leaf turns
// from 0 to -180deg about the spine as the scroll passes it.

import { $, $$, clamp, listen } from '../lib/dom.js';
import { gsap, ScrollTrigger, motionOK } from '../lib/motion.js';

const easeTurn = (t) => -(Math.cos(Math.PI * t) - 1) / 2; // sine in-out, like a hand turning a page

function el(className) {
  const node = document.createElement('div');
  node.className = className;
  return node;
}

export function initEcosystem() {
  const section = $('#ecosystem');
  const list = $('[data-eco-list]', section || document);
  if (!section || !list) return;

  const track = $('[data-eco-track]', section);
  const body = $('[data-book-body]', section);
  const items = $$('.eco-item', list);
  const count = items.length;
  const indexItems = $$('.eco-index__item', section);
  const hint = $('[data-eco-hint]', section);
  const ids = items.map((item) => item.dataset.verticalItem);
  let active = -1;
  let pages = [];

  function setActive(index) {
    if (index === active) return;
    active = index;
    indexItems.forEach((button, i) => {
      button.classList.toggle('is-active', i === index);
      if (i === index) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    // Only the story in view can take focus; the others are tucked inside the book.
    pages.forEach((page, i) => (page.inert = i !== index));
  }

  /* ---------- Without motion: the plain list, and the index jumps to it ---------- */

  if (!motionOK) {
    setActive(0);
    const jump = (index) => {
      setActive(index);
      items[index].scrollIntoView({ block: 'start' });
    };
    indexItems.forEach((button, i) => button.addEventListener('click', () => jump(i)));
    listen('bloom:vertical', ({ id }) => ids.includes(id) && jump(ids.indexOf(id)));
    return;
  }

  const phone = window.matchMedia('(max-width: 760px)').matches;
  // Move each business's pages out of the list and into the book (or the deck on phones),
  // keeping their ids so links into the section still find them.
  const photos = items.map((item) => $('.eco-photo', item));
  pages = items.map((item) => {
    const page = $('.eco-page', item);
    page.id = item.id;
    item.removeAttribute('id');
    return page;
  });

  let steps;
  let render;
  let restingStep; // the scroll step at which business i is fully in view

  if (!phone) {
    /* ---------- The book ---------- */
    const cover = $('template[data-book-cover]', section).content.cloneNode(true);
    const baseLeft = el('book__base book__base--left');
    const baseRight = el('book__base book__base--right');
    baseRight.append(pages[count - 1]);
    body.append(baseLeft, baseRight);

    const leaves = items.map((_, n) => {
      const leaf = el('book__leaf');
      const front = el('book__face book__face--front');
      const back = el('book__face book__face--back');
      front.append(n === 0 ? cover : pages[n - 1]);
      back.append(photos[n]);
      leaf.append(front, back);
      body.append(leaf);
      return leaf;
    });

    steps = count; // the cover, then a page for each business after the first
    restingStep = (i) => i + 1;
    render = (p) => {
      // The endpaper on the left shows itself as the cover lifts off it.
      body.style.setProperty('--open', easeTurn(clamp(p * 2.5, 0, 1)).toFixed(4));
      leaves.forEach((leaf, n) => {
        const turn = easeTurn(clamp(p - n, 0, 1));
        const lift = Math.sin(Math.PI * turn);
        leaf.style.transform = `translateZ(${(lift * 40).toFixed(1)}px) rotateY(${(-180 * turn).toFixed(2)}deg)`;
        // Unturned leaves stack with the next page on top; turned ones with the latest on top.
        leaf.style.zIndex = String(turn < 0.5 ? 200 - n : 100 + n);
        leaf.style.setProperty('--shade', lift.toFixed(3));
      });
    };
  } else {
    /* ---------- Phones: a deck of pages ---------- */
    body.classList.add('is-deck');
    const cards = items.map((_, i) => {
      const card = el('deck-card');
      card.append(photos[i], pages[i]);
      body.append(card);
      return card;
    });
    steps = count - 1;
    restingStep = (i) => i;
    render = (p) => {
      cards.forEach((card, i) => {
        const gone = clamp(p - i, 0, 1);
        const depth = clamp(i - p, 0, 3);
        card.style.transform = `translateY(${(depth * 3 - gone * 16).toFixed(2)}%) rotateX(${(gone * 82).toFixed(2)}deg) scale(${(1 - depth * 0.05).toFixed(4)})`;
        card.style.opacity = String(gone > 0.75 ? clamp(1 - (gone - 0.75) / 0.25, 0, 1) : 1);
        card.style.zIndex = String(100 - i);
        card.style.visibility = gone > 0.999 ? 'hidden' : '';
      });
    };
  }

  /* ---------- Scroll drives it ---------- */

  track.style.setProperty('--steps', steps);
  const state = { p: 0 };

  function update() {
    const p = state.p;
    render(p);
    const index = clamp(Math.round(p) - restingStep(0), 0, count - 1);
    setActive(index);
    // Each index line fills as you read through that business's stretch of scroll.
    indexItems.forEach((button, i) => {
      const fill = i < index ? 1 : i > index ? 0 : clamp(0.5 + p - restingStep(i), 0, 1);
      $('b', button).style.setProperty('--fill', fill.toFixed(3));
    });
    if (hint) hint.style.opacity = String(clamp(1 - (p - restingStep(0)) * 1.5, 0, 1));
  }

  const turn = gsap.to(state, {
    p: steps,
    ease: 'none',
    onUpdate: update,
    scrollTrigger: {
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,
      // Always come to rest on a whole spread.
      snap: { snapTo: 1 / steps, inertia: false, duration: { min: 0.25, max: 0.7 }, delay: 0.08, ease: 'power2.inOut' },
      invalidateOnRefresh: true,
    },
  });
  update();

  /** Scroll to business i's spread; the scroll turns the pages on the way. */
  function goTo(index) {
    const trigger = turn.scrollTrigger;
    const top = trigger.start + (trigger.end - trigger.start) * (restingStep(index) / steps);
    window.scrollTo({ top: Math.ceil(top), behavior: 'smooth' });
  }

  indexItems.forEach((button, i) => button.addEventListener('click', () => goTo(i)));

  // From the menu, the hero wheel or the footer: turn to that business.
  listen('bloom:vertical', ({ id }) => {
    if (ids.includes(id)) goTo(ids.indexOf(id));
  });

}
