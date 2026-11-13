// A small fixed label, bottom left on wide screens, naming the section you are in.
// The name rolls over as you cross into the next section.

import { $ } from '../lib/dom.js';
import { gsap, motionOK, EASE } from '../lib/motion.js';

const SECTIONS = [
  ['begin', 'Start here'],
  ['find', 'Find a Home'],
  ['communities', 'Explore Communities'],
  ['ecosystem', 'Bloom Ecosystem'],
  ['life', 'Life at Bloom'],
  ['services', 'Customer Services'],
  ['about', 'About Bloom'],
  ['footer', 'Make an enquiry'],
];

export function initSectionTag() {
  const tag = $('[data-section-tag]');
  if (!tag || !motionOK) return;
  const num = $('[data-section-tag-num]', tag);
  const name = $('[data-section-tag-name]', tag);
  let current = null;

  function show(index) {
    if (index === current) return;
    current = index;
    tag.classList.toggle('is-visible', index !== null);
    if (index === null) return;
    const [id, label] = SECTIONS[index];
    const section = document.getElementById(id);
    tag.classList.toggle('is-light', Boolean(section?.matches('.on-dark, .on-red')));
    gsap.timeline()
      .to([num, name], { xPercent: -110, duration: 0.25, ease: 'power2.in', overwrite: true })
      .add(() => {
        num.textContent = String(index + 1).padStart(2, '0');
        name.textContent = label;
      })
      .fromTo([num, name], { xPercent: 110 }, { xPercent: 0, duration: 0.55, stagger: 0.05, ease: EASE.out });
  }

  const visible = new Set();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id)));
    const index = SECTIONS.findIndex(([id]) => visible.has(id));
    show(index < 0 ? null : index);
  }, { rootMargin: '-55% 0px -44% 0px' });
  SECTIONS.forEach(([id]) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}
