// Header: scroll states and progress, the sliding nav indicator, section spy,
// the mega menu, the full-screen mobile menu and the language switch.

import { $, $$, finePointer, listen, rafThrottle } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';
import { showToast } from '../ui/toast.js';

export function initHeader() {
  const header = $('[data-header]');
  if (!header) return;

  const state = { megaOpen: false, menuOpen: false };

  /* ---------- Scroll states and progress ---------- */

  const progress = $('[data-scroll-progress]', header);
  const hero = $('[data-hero]');

  const onScroll = rafThrottle(() => {
    const y = window.scrollY;
    const heroEnd = hero ? hero.offsetHeight - header.offsetHeight - 8 : 0;
    header.classList.toggle('is-compact', y > 80);
    header.classList.toggle('is-solid', y > heroEnd || state.megaOpen);
    const range = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty('--progress', range > 0 ? (y / range).toFixed(4) : 0);
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Sliding indicator and section spy ---------- */

  const nav = $('[data-nav]', header);
  const indicator = $('[data-nav-indicator]', header);
  const items = $$('[data-nav-item]', header);
  let currentItem = null;

  function moveIndicator(item) {
    if (!item) {
      indicator.style.setProperty('--o', 0);
      return;
    }
    const link = $('.nav-item__link', item);
    const navBox = nav.getBoundingClientRect();
    const box = link.getBoundingClientRect();
    indicator.style.setProperty('--x', `${box.left - navBox.left}px`);
    indicator.style.setProperty('--w', box.width);
    indicator.style.setProperty('--o', 1);
  }

  items.forEach((item) => {
    item.addEventListener('pointerenter', () => moveIndicator(item));
    item.addEventListener('focusin', () => moveIndicator(item));
  });
  nav.addEventListener('pointerleave', () => moveIndicator(openItem() || currentItem));
  nav.addEventListener('focusout', (event) => {
    if (!nav.contains(event.relatedTarget)) moveIndicator(openItem() || currentItem);
  });
  window.addEventListener('resize', rafThrottle(() => moveIndicator(openItem() || currentItem)));

  // The section crossing the middle of the viewport owns the active state.
  const spyTargets = new Map();
  items.forEach((item) => {
    item.dataset.spy.split(' ').forEach((id) => {
      const section = document.getElementById(id);
      if (section) spyTargets.set(section, item);
    });
  });
  const visible = new Set();
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
    const section = [...spyTargets.keys()].find((target) => visible.has(target));
    const next = section ? spyTargets.get(section) : null;
    if (next === currentItem) return;
    currentItem = next;
    items.forEach((item) => {
      const active = item === currentItem;
      item.classList.toggle('is-current', active);
      const link = $('.nav-item__link', item);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (!nav.matches(':hover') && !state.megaOpen) moveIndicator(currentItem);
  }, { rootMargin: '-45% 0px -54% 0px' });
  spyTargets.forEach((_, section) => spy.observe(section));

  /* ---------- Mega menu ---------- */

  const mega = $('[data-mega]', header);
  const sheet = $('.mega__sheet', mega);
  const panels = $$('[data-mega-panel]', mega);
  let openKey = null;
  let openTimer = 0;
  let closeTimer = 0;

  function openItem() {
    return openKey ? items.find((item) => item.dataset.navItem === openKey) : null;
  }

  function setExpanded() {
    items.forEach((item) => {
      const open = item.dataset.navItem === openKey;
      item.classList.toggle('is-open', open);
      $('.nav-item__toggle', item).setAttribute('aria-expanded', String(open));
    });
  }

  function openMega(key, { focus = false } = {}) {
    clearTimeout(closeTimer);
    if (openKey === key) return;
    const wasOpen = Boolean(openKey);
    const previousHeight = sheet.offsetHeight;
    openKey = key;
    state.megaOpen = true;
    panels.forEach((panel) => (panel.hidden = panel.dataset.megaPanel !== key));
    const panel = panels.find((item) => item.dataset.megaPanel === key);
    mega.classList.add('is-open');
    header.classList.add('is-solid');
    setExpanded();
    moveIndicator(openItem());

    if (motionOK) {
      const parts = [...panel.children];
      gsap.killTweensOf([sheet, ...panels.flatMap((item) => [...item.children])]);
      if (wasOpen) {
        gsap.fromTo(sheet, { height: previousHeight }, { height: sheet.scrollHeight, duration: 0.55, ease: EASE.out, clearProps: 'height' });
        gsap.set(sheet, { clipPath: 'inset(0% 0% 0% 0%)' });
      } else {
        gsap.fromTo(sheet, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75, ease: EASE.out });
      }
      gsap.fromTo(parts, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: EASE.soft, delay: wasOpen ? 0.05 : 0.14 });
    } else {
      sheet.style.clipPath = 'none';
    }
    if (focus) $('a, button', panel)?.focus();
  }

  function closeMega({ refocus = false } = {}) {
    clearTimeout(openTimer);
    if (!openKey) return;
    const item = openItem();
    openKey = null;
    state.megaOpen = false;
    setExpanded();
    moveIndicator(nav.matches(':hover') ? null : currentItem);
    const finish = () => {
      if (openKey) return;
      mega.classList.remove('is-open');
      panels.forEach((panel) => (panel.hidden = true));
      onScroll();
    };
    if (motionOK) {
      gsap.killTweensOf(sheet);
      gsap.to(sheet, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.45, ease: 'power3.inOut', onComplete: finish });
    } else {
      finish();
    }
    if (refocus && item) $('.nav-item__toggle', item).focus();
  }

  items.forEach((item) => {
    const key = item.dataset.navItem;
    // Click or keyboard: the chevron button always toggles.
    $('.nav-item__toggle', item).addEventListener('click', (event) => {
      if (openKey === key) closeMega();
      else openMega(key, { focus: event.detail === 0 });
    });
    // Mouse: opening on hover is a shortcut, with a short delay to avoid flicker.
    if (finePointer()) {
      item.addEventListener('pointerenter', () => {
        clearTimeout(closeTimer);
        openTimer = setTimeout(() => openMega(key), openKey ? 0 : 90);
      });
      item.addEventListener('pointerleave', () => clearTimeout(openTimer));
    }
  });

  if (finePointer()) {
    header.addEventListener('pointerleave', () => {
      closeTimer = setTimeout(() => closeMega(), 220);
    });
    header.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  }

  // Dismiss: Escape, a click outside, focus leaving, or following a link.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (state.megaOpen) closeMega({ refocus: header.contains(document.activeElement) });
    if (state.menuOpen) closeMenu();
  });
  document.addEventListener('pointerdown', (event) => {
    if (state.megaOpen && !header.contains(event.target)) closeMega();
  });
  header.addEventListener('focusout', (event) => {
    if (state.megaOpen && event.relatedTarget && !header.contains(event.relatedTarget)) closeMega();
  });
  mega.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMega();
  });

  // Community links preview their photograph in the arch beside them.
  const previewFrame = $('[data-mega-preview-frame]', mega);
  $$('[data-mega-previews] a', mega).forEach((link) => {
    const show = () => {
      const current = $('img:not(.is-leaving)', previewFrame);
      if (!current || current.getAttribute('src') === link.dataset.preview) return;
      const next = current.cloneNode();
      next.src = link.dataset.preview;
      next.style.opacity = 0;
      previewFrame.append(next);
      requestAnimationFrame(() => {
        next.style.opacity = '';
        current.classList.add('is-leaving');
        setTimeout(() => current.remove(), 450);
      });
    };
    link.addEventListener('pointerenter', show);
    link.addEventListener('focus', show);
  });

  /* ---------- Mobile menu ---------- */

  const menu = $('[data-mobile-menu]');
  const menuPanel = $('.mobile-menu__panel', menu);
  const toggle = $('[data-menu-toggle]', header);
  const toggleLabel = $('[data-menu-toggle-label]', toggle);
  const clipOrigin = 'at calc(100% - var(--gutter) - 1.375rem) calc(var(--header-h) / 2)';

  function openMenu() {
    if (state.menuOpen) return;
    state.menuOpen = true;
    menu.hidden = false;
    header.classList.add('is-menu-open');
    document.documentElement.classList.add('is-locked');
    toggle.setAttribute('aria-expanded', 'true');
    toggleLabel.textContent = 'Close menu';
    if (motionOK) {
      gsap.killTweensOf(menuPanel);
      gsap.fromTo(menuPanel, { clipPath: `circle(0% ${clipOrigin})` }, { clipPath: `circle(150% ${clipOrigin})`, duration: 0.95, ease: EASE.inOut });
      gsap.fromTo($$('.mobile-menu__word', menu), { yPercent: 115 }, { yPercent: 0, duration: 1, stagger: 0.07, ease: EASE.out, delay: 0.28 });
      gsap.fromTo($$('.mobile-menu__num, .mobile-menu__sub, .mobile-menu__foot', menu), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.04, delay: 0.5 });
    }
    $('.mobile-menu__link', menu).focus({ preventScroll: true });
  }

  function closeMenu({ refocus = true } = {}) {
    if (!state.menuOpen) return;
    state.menuOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    toggleLabel.textContent = 'Open menu';
    document.documentElement.classList.remove('is-locked');
    const finish = () => {
      if (state.menuOpen) return;
      menu.hidden = true;
      header.classList.remove('is-menu-open');
    };
    if (motionOK) {
      gsap.killTweensOf(menuPanel);
      gsap.to(menuPanel, { clipPath: `circle(0% ${clipOrigin})`, duration: 0.6, ease: 'power3.inOut', onComplete: finish });
    } else {
      finish();
    }
    if (refocus) toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', () => (state.menuOpen ? closeMenu() : openMenu()));

  // Keep keyboard focus inside the open menu (the toggle counts as part of it).
  document.addEventListener('keydown', (event) => {
    if (!state.menuOpen || event.key !== 'Tab') return;
    const focusable = [toggle, ...$$('a, button', menu)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.matchMedia('(min-width: 1100px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu({ refocus: false });
    else closeMega();
  });

  // Any in-page navigation closes whichever menu is open.
  listen('bloom:navigate', () => {
    closeMega();
    closeMenu({ refocus: false });
  });

  /* ---------- Language ---------- */

  $$('[data-lang]').forEach((group) => {
    $$('[data-lang-option]', group).forEach((option) => {
      option.addEventListener('click', () => {
        if (option.dataset.langOption === 'en') return;
        group.classList.remove('is-nudged');
        void group.offsetWidth;
        group.classList.add('is-nudged');
        showToast('Arabic is planned for the full site. This prototype is in English only.');
      });
    });
  });
}
