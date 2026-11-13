// Floating section dock: a capsule at the foot of the screen that springs up once you leave
// the hero. Its arch fills with your progress down the page, and each section's name rolls
// in letter by letter as you reach it. Opening it lists every section to jump to.

import { $, $$, rafThrottle, scrollToTarget } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';

export function initDock() {
  const dock = $('[data-dock]');
  if (!dock) return;
  const toggle = $('[data-dock-toggle]', dock);
  const list = $('[data-dock-list]', dock);
  const links = $$('[data-dock-link]', dock);
  const num = $('[data-dock-num]', dock);
  const name = $('[data-dock-name]', dock);
  const progress = $('[data-dock-progress]', dock);
  const hero = $('[data-hero]');
  const sections = links.map((link) => document.getElementById(link.dataset.dockLink)).filter(Boolean);
  let current = -1;

  function letters(text) {
    name.replaceChildren(...Array.from(text).map((letter) => {
      const span = document.createElement('span');
      span.textContent = letter === ' ' ? ' ' : letter;
      span.style.display = 'inline-block';
      return span;
    }));
    return [...name.children];
  }

  function setSection(index) {
    if (index === current || index < 0) return;
    const first = current < 0;
    current = index;
    links.forEach((link, i) => {
      if (i === index) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    const label = links[index].textContent.replace(/^\d+/, '').trim();
    const number = String(index + 1).padStart(2, '0');

    if (!motionOK || first) {
      num.textContent = number;
      name.textContent = label;
      return;
    }
    // The capsule stretches to the new name while the letters roll through.
    const before = name.getBoundingClientRect().width;
    const old = [...name.children];
    gsap.timeline()
      .to(old, { yPercent: -120, duration: 0.25, stagger: 0.012, ease: 'power2.in' })
      .to(num, { yPercent: -120, autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, 0)
      .add(() => {
        num.textContent = number;
        const fresh = letters(label);
        const after = name.getBoundingClientRect().width;
        gsap.fromTo(name, { width: before }, { width: after, duration: 0.55, ease: EASE.out, clearProps: 'width' });
        gsap.fromTo(fresh, { yPercent: 120, rotate: 12 }, { yPercent: 0, rotate: 0, duration: 0.7, stagger: 0.025, ease: 'back.out(1.8)' });
        gsap.fromTo(num, { yPercent: 120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: EASE.out });
      });
    dock.classList.remove('is-pulse');
    void dock.offsetWidth;
    dock.classList.add('is-pulse');
  }

  const update = rafThrottle(() => {
    const y = window.scrollY;
    const range = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty('--progress', range > 0 ? (y / range).toFixed(4) : 0);
    const pastHero = !hero || y > hero.offsetHeight * 0.6;
    dock.classList.toggle('is-visible', pastHero);
    if (!pastHero) close();
    // The section whose top has passed the middle of the screen is the current one.
    const middle = window.innerHeight * 0.5;
    let index = 0;
    sections.forEach((section, i) => {
      if (section.getBoundingClientRect().top < middle) index = i;
    });
    setSection(index);
  });

  function open() {
    list.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    if (motionOK) {
      gsap.fromTo(list, { autoAlpha: 0, y: 16, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.6)', transformOrigin: '50% 100%' });
      gsap.fromTo($$('li', list), { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.03, delay: 0.1 });
    }
  }

  function close() {
    if (list.hidden) return;
    toggle.setAttribute('aria-expanded', 'false');
    list.hidden = true;
  }

  toggle.addEventListener('click', () => (list.hidden ? open() : close()));
  links.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    close();
    scrollToTarget(link.getAttribute('href'));
  }));
  document.addEventListener('pointerdown', (event) => {
    if (!dock.contains(event.target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !list.hidden) {
      close();
      toggle.focus();
    }
  });

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}
