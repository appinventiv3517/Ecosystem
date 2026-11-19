// Bloom Holding homepage prototype: entry point.
// Each section has its own module; this file wires them together and routes clicks.

import { $, emit, scrollToTarget } from './lib/dom.js';
import { ScrollTrigger, motionOK } from './lib/motion.js';
import { demoDestination } from './ui/toast.js';
import { initEnquiry } from './ui/enquiry.js';
import { initReveals } from './ui/reveal.js';
import { initMagnetic, initTilt } from './ui/pointer.js';
import { initCursor } from './ui/cursor.js';
import { initRoll } from './ui/roll.js';
import { initDock } from './ui/dock.js';
import { playIntro } from './sections/intro.js';
import { initHeader } from './sections/header.js';
import { initHero } from './sections/hero.js';
import { initWorld } from './sections/world.js';
import { initFind } from './sections/find.js';
import { initCommunities } from './sections/communities.js';
import { initEcosystem } from './sections/ecosystem.js';
import { initLife } from './sections/life.js';
import { initServices } from './sections/services.js';
import { initAbout } from './sections/about.js';
import { initFooter } from './sections/footer.js';

window.__bloomStarted = true;

/**
 * One click handler for everything that navigates within the page.
 * Markup declares intent with data attributes:
 *   data-find (+ data-mode / data-community / data-type)  prefill the search and go to it
 *   data-world-jump  go to that business in the glimpses of Bloom World
 *   data-community-jump, data-vertical-jump, data-service-jump  go to that item in its section
 *   data-open-enquiry (+ data-interest, data-note)  open the enquiry panel
 *   data-demo="Label"  a destination outside this prototype: explain instead of navigating
 */
function initActions() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('a[href^="#"], [data-find], [data-open-enquiry], [data-demo], [data-world-jump]');
    if (!target) return;
    const data = target.dataset;

    if ('demo' in data) {
      event.preventDefault();
      demoDestination(data.demo);
      return;
    }

    event.preventDefault();
    emit('bloom:navigate');

    if ('openEnquiry' in data) {
      emit('bloom:enquire', { interest: data.interest, note: data.note, trigger: target });
    } else if ('find' in data) {
      emit('bloom:find', {
        mode: data.mode,
        community: data.community,
        type: data.type,
        // Quick starts inside the console are complete presets and run the demo search straight away.
        beds: target.closest('.search__quick') ? '' : undefined,
        run: Boolean(target.closest('.search__quick')),
        scroll: !target.closest('.search'),
      });
    } else if (data.worldJump) {
      emit('bloom:world', { id: data.worldJump });
    } else if (data.communityJump) {
      emit('bloom:community', { id: data.communityJump });
    } else if (data.verticalJump) {
      emit('bloom:vertical', { id: data.verticalJump });
    } else if (data.serviceJump) {
      emit('bloom:service', { id: data.serviceJump });
    } else {
      scrollToTarget(target.getAttribute('href'));
    }
  });
}

async function start() {
  initActions();
  initRoll();
  initEnquiry();
  initHeader();
  const hero = initHero();
  initWorld();
  initFind();
  initCommunities();
  initEcosystem();
  initLife();
  initServices();
  initAbout();
  initFooter();
  initMagnetic();
  initTilt('[data-path]', 4);
  initCursor();
  initDock();

  // Headline splitting measures text, so wait for the web fonts (briefly).
  await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1800))]);
  initReveals();

  if (motionOK) {
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    window.addEventListener('load', () => ScrollTrigger.refresh());
    // When content above a scroll-driven section grows or shrinks (a search result opening,
    // say), measure the scroll positions again so the book and the pinned stages stay in step.
    let lastHeight = document.body.offsetHeight;
    let pending = 0;
    new ResizeObserver(() => {
      const height = document.body.offsetHeight;
      if (Math.abs(height - lastHeight) < 2) return;
      clearTimeout(pending);
      pending = setTimeout(() => {
        ScrollTrigger.refresh();
        lastHeight = document.body.offsetHeight;
      }, 200);
    }).observe(document.body);
  }

  const bloomed = await playIntro(hero);
  hero.start({ bloomed });
  document.documentElement.classList.add('is-ready');
}

start().catch((error) => {
  // Never leave the page hidden behind a failed animation.
  console.error(error);
  document.documentElement.classList.remove('motion', 'is-intro', 'is-locked');
  $('[data-intro]')?.remove();
});
