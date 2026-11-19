// Find Your Property: Buy and Rent pathways, custom dropdowns, bedroom chips, a budget that
// follows the pathway, quick starts, featured developments and a demo result.
// No inventory is loaded or implied: the result explains itself.

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

const BUDGET_TEXT = { buy: 'budget', rent: 'yearly rent' };

const BEDS_TEXT = {
  '': '',
  studio: ', studio',
  1: ', 1 bedroom',
  '4+': ', 4 or more bedrooms',
};

export function initFind() {
  const form = $('[data-search]');
  if (!form) return;

  const result = $('[data-search-result]', form);
  const summary = $('[data-result-summary]', form);
  const next = $('[data-result-next]', form);
  const submitLabel = $('[data-search-label]', form);
  const paths = $$('[data-path]');
  const modeInputs = $$('input[name="mode"]');
  const devs = $$('[data-dev]');
  const selects = Object.fromEntries($$('[data-select]', form).map((root) => [root.dataset.select, new Select(root, {
    onChange: root.dataset.select === 'community' ? (value) => matchDevelopments(value) : undefined,
  })]));

  const mode = () => modeInputs.find((input) => input.checked)?.value || 'buy';
  const budget = () => selects[`budget-${mode()}`];

  /* ---------- Featured developments ---------- */

  /** Light up the developments in the chosen community; the others step back. */
  function matchDevelopments(community) {
    devs.forEach((dev) => {
      const match = Boolean(community) && dev.dataset.community === community;
      dev.classList.toggle('is-match', match);
      dev.classList.toggle('is-muted', Boolean(community) && !match);
    });
  }

  devs.forEach((dev) => {
    const name = $('.dev__name', dev).textContent;
    const enquire = $('[data-dev-enquire]', dev);
    if (enquire) enquire.dataset.note = name;
    $('[data-dev-search]', dev)?.addEventListener('click', (event) => {
      event.stopPropagation();
      emit('bloom:find', { community: dev.dataset.community, type: '', run: true });
    });
  });

  /* ---------- Buy / Rent ---------- */

  function applyMode(value, { animate = true } = {}) {
    const label = value === 'rent' ? 'Search homes to rent' : 'Search homes to buy';

    // Supporting line
    $$('[data-mode-copy]').forEach((copy) => {
      const active = copy.dataset.modeCopy === value;
      copy.hidden = !active;
      copy.classList.toggle('is-active', active);
      if (active && animate && motionOK) gsap.fromTo(copy, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE.soft });
    });

    // Pathways: the chosen word comes forward and its rule draws across; the other recedes.
    paths.forEach((path) => {
      const active = path.dataset.path === value;
      path.classList.toggle('is-active', active);
      if (active && animate && motionOK) {
        gsap.fromTo($('.path__title', path), { yPercent: 18, autoAlpha: 0.4 }, { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: EASE.out, clearProps: 'all' });
      }
    });

    // Budget: buying and renting are priced differently, so each has its own ranges.
    $$('[data-budget]', form).forEach((field) => {
      const active = field.dataset.budget === value;
      field.hidden = !active;
      if (active && animate && motionOK) gsap.fromTo(field, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: EASE.out, clearProps: 'all' });
    });

    // Featured developments: their search buttons and enquiries follow the pathway.
    devs.forEach((dev) => {
      const label = $('[data-dev-label]', dev);
      if (label) label.textContent = value === 'rent' ? 'Homes to rent here' : 'Homes to buy here';
      const enquire = $('[data-dev-enquire]', dev);
      if (enquire) enquire.dataset.interest = value;
    });

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

  modeInputs.forEach((input) => {
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
    const price = budget().value ? `, ${BUDGET_TEXT[mode()]} ${budget().label.replace(/^Up to/, 'up to')}` : '';
    return { community, text: `${what} ${where}${bedrooms}${price}`, html: `<b>${what}</b> ${where}${bedrooms}${price}` };
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
      const card = document.querySelector(`.community[data-community="${search.community}"]`);
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

  /* ---------- Prefill from elsewhere (menu, quick starts, community and development cards) ---------- */

  listen('bloom:find', ({ mode: nextMode, community, type, beds, run, scroll = true }) => {
    closeResult();
    if (nextMode && nextMode !== mode()) {
      modeInputs.find((input) => input.value === nextMode).checked = true;
      applyMode(nextMode);
    }
    if (community !== undefined) {
      selects.community.set(community);
      matchDevelopments(community);
    }
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
}
