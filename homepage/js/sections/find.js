// Find a Home: the Buy / Rent switch, custom dropdowns, bedroom chips, quick starts
// and a demo result. No inventory is loaded or implied: the result explains itself.

import { $, $$, emit, listen, scrollToTarget } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';
import { Select } from '../ui/select.js';

const TYPE_PLURAL = {
  '': 'Homes',
  apartment: 'Apartments',
  townhouse: 'Townhouses',
  villa: 'Villas',
  penthouse: 'Penthouses',
  'hotel-apartment': 'Hotel apartments',
};

const BEDS_TEXT = {
  '': '',
  studio: ', studio',
  1: ', 1 bedroom',
  '5+': ', 5 or more bedrooms',
};

export function initFind() {
  const form = $('[data-search]');
  if (!form) return;

  const result = $('[data-search-result]', form);
  const summary = $('[data-result-summary]', form);
  const next = $('[data-result-next]', form);
  const submitLabel = $('[data-search-label]', form);
  const figure = $('[data-find-figure]');
  const selects = Object.fromEntries($$('[data-select]', form).map((root) => [root.dataset.select, new Select(root)]));

  const mode = () => form.elements.mode.value;

  /* ---------- Buy / Rent ---------- */

  function applyMode(value, { animate = true } = {}) {
    const label = value === 'rent' ? 'Search homes to rent' : 'Search homes to buy';
    const word = value === 'rent' ? 'Rent' : 'Buy';

    // Supporting line
    $$('[data-mode-copy]').forEach((copy) => {
      const active = copy.dataset.modeCopy === value;
      copy.hidden = !active;
      copy.classList.toggle('is-active', active);
      if (active && animate && motionOK) gsap.fromTo(copy, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE.soft });
    });

    // Arch image: the new photograph wipes up over the old one.
    if (figure) {
      const images = $$('[data-mode-image]', figure);
      const incoming = images.find((image) => image.dataset.modeImage === value);
      const outgoing = images.find((image) => image !== incoming);
      const badgeWord = $('[data-mode-word]', figure);
      if (animate && motionOK) {
        gsap.killTweensOf(images);
        gsap.set(outgoing, { zIndex: 1 });
        gsap.set(incoming, { zIndex: 2, opacity: 1 });
        gsap.fromTo(incoming, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.2 }, {
          clipPath: 'inset(0% 0% 0% 0%)',
          scale: 1,
          duration: 1.1,
          ease: EASE.inOut,
          onComplete: () => {
            outgoing.classList.remove('is-active');
            incoming.classList.add('is-active');
            gsap.set(images, { clearProps: 'opacity,zIndex,clipPath' });
          },
        });
        gsap.timeline()
          .to(badgeWord, { yPercent: -130, duration: 0.3, ease: 'power2.in' })
          .add(() => (badgeWord.textContent = word))
          .fromTo(badgeWord, { yPercent: 130 }, { yPercent: 0, duration: 0.55, ease: EASE.out });
      } else {
        images.forEach((image) => image.classList.toggle('is-active', image === incoming));
        badgeWord.textContent = word;
      }
    }

    // Button label rolls to the new intent.
    if (animate && motionOK) {
      gsap.timeline()
        .to(submitLabel, { yPercent: -60, autoAlpha: 0, duration: 0.22, ease: 'power2.in' })
        .add(() => (submitLabel.textContent = label))
        .fromTo(submitLabel, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: EASE.out });
    } else {
      submitLabel.textContent = label;
    }
  }

  $$('input[name="mode"]', form).forEach((input) => {
    input.addEventListener('change', () => {
      applyMode(input.value);
      closeResult();
    });
  });

  /* ---------- Search ---------- */

  function describe() {
    const community = selects.community.value;
    const beds = form.elements.beds.value;
    const what = `${TYPE_PLURAL[selects.type.value]} to ${mode()}`;
    const where = community ? `in ${selects.community.label}` : 'across all Bloom communities';
    const bedrooms = beds in BEDS_TEXT ? BEDS_TEXT[beds] : `, ${beds} bedrooms`;
    return { community, text: `${what} ${where}${bedrooms}`, html: `<b>${what}</b> ${where}${bedrooms}` };
  }

  function button(label, className = 'btn btn--small') {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.innerHTML = `<span class="btn__label">${label}</span><span class="btn__dot"><svg class="icon"><use href="#i-arrow"/></svg></span>`;
    return element;
  }

  function showResult() {
    const search = describe();
    summary.innerHTML = search.html;
    next.replaceChildren();

    if (search.community) {
      // Developments come from the community cards, the page's single source for them.
      const card = document.querySelector(`[data-gcard][data-community="${search.community}"]`);
      const developments = document.createElement('p');
      developments.className = 'search-result__devs';
      developments.innerHTML = `Bloom developments in ${card.dataset.name}: <strong>${card.dataset.developments}</strong>`;
      const explore = button(`Explore ${card.dataset.name}`);
      explore.addEventListener('click', () => emit('bloom:community', { id: search.community }));
      next.append(developments, explore);
    } else {
      const explore = button('Explore the communities');
      explore.addEventListener('click', () => scrollToTarget('#communities'));
      next.append(explore);
    }

    const enquire = button('Enquire about this search', 'btn btn--small btn--outline');
    enquire.addEventListener('click', () => emit('bloom:enquire', { interest: mode(), note: search.text, trigger: enquire }));
    next.append(enquire);

    result.hidden = false;
    void result.offsetWidth;
    result.classList.add('is-open');
    summary.focus({ preventScroll: true });
    // Bring the result into view if the console sits low on the screen.
    setTimeout(() => {
      const box = result.getBoundingClientRect();
      if (box.bottom > window.innerHeight) window.scrollBy({ top: box.bottom - window.innerHeight + 32, behavior: motionOK ? 'smooth' : 'auto' });
    }, motionOK ? 500 : 0);
  }

  function closeResult() {
    if (!result.classList.contains('is-open')) return;
    result.classList.remove('is-open');
    setTimeout(() => {
      if (!result.classList.contains('is-open')) result.hidden = true;
    }, motionOK ? 720 : 0);
  }

  function runSearch() {
    if (form.classList.contains('is-searching')) return;
    form.classList.add('is-searching');
    setTimeout(() => {
      form.classList.remove('is-searching');
      showResult();
    }, motionOK ? 700 : 0);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    runSearch();
  });
  $('[data-search-close]', form).addEventListener('click', () => {
    closeResult();
    $('[data-search-submit]', form).focus({ preventScroll: true });
  });

  /* ---------- Prefill from elsewhere (menu, quick starts, community cards) ---------- */

  listen('bloom:find', ({ mode: nextMode, community, type, beds, run, scroll = true }) => {
    closeResult();
    if (nextMode && nextMode !== mode()) {
      form.querySelector(`input[name="mode"][value="${nextMode}"]`).checked = true;
      applyMode(nextMode);
    }
    if (community !== undefined) selects.community.set(community);
    if (type !== undefined) selects.type.set(type);
    if (beds !== undefined) {
      const chip = form.querySelector(`input[name="beds"][value="${beds}"]`);
      if (chip) chip.checked = true;
    }
    if (scroll) scrollToTarget(form, { offset: Math.max(96, window.innerHeight * 0.18) });
    if (run) runSearch();
    else if (motionOK) gsap.fromTo('[data-search-submit]', { scale: 1 }, { scale: 1.06, duration: 0.3, yoyo: true, repeat: 1, ease: 'power2.inOut', delay: scroll ? 0.7 : 0.1, clearProps: 'scale' });
  });

  applyMode(mode(), { animate: false });

  /* ---------- Arrival ---------- */

  if (!motionOK || !figure) return;
  const section = form.closest('section');
  // The photograph wipes in from the left as the section arrives, then settles slowly while the
  // questions scroll past it.
  gsap.fromTo(figure, { clipPath: 'inset(0% 100% 0% 0%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)',
    ease: 'none',
    scrollTrigger: { trigger: section, start: 'top 85%', end: 'top 15%', scrub: 0.4 },
  });
  gsap.fromTo($('[data-find-photos]', figure), { scale: 1.18 }, {
    scale: 1,
    ease: 'none',
    scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom bottom', scrub: true },
  });
  // The questions slide in from the right, one after another.
  gsap.from($$('.qrow', form), {
    autoAlpha: 0,
    x: 60,
    duration: 1,
    stagger: 0.09,
    ease: EASE.out,
    scrollTrigger: { trigger: form, start: 'top 85%', once: true },
  });
}
