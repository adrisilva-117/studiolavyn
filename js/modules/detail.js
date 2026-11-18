// Detail pages: clicking any [data-zoom="id"] (or visiting #/id) fades in the matching
// <template data-shot="id"> as a full-screen page. Back, Escape or the browser's Back closes it.
// Pan: in-page links (#section) pull back, re-frame and push in on the new section.
//
// Routing uses the URL hash (#/id), so browser Back / Forward and deep links work.

const OPEN_MS = 320;
const CLOSE_MS = 240;
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const shotIdFromHash = () => (location.hash.startsWith('#/') ? decodeURIComponent(location.hash.slice(2)) : null);

export function initDetail() {
  const stage = document.querySelector('[data-stage]');
  const shot = document.querySelector('[data-shot-view]');
  if (!stage || !shot) return;

  const shotBody = shot.querySelector('.shot-body');
  const root = document.documentElement;

  let current = null; // { id, returnFocus }
  let busy = false;
  let lastClicked = null; // the link that opened the page, to return focus to it

  const triggerFor = (id) => document.querySelector(`[data-zoom="${CSS.escape(id)}"]`);
  const templateFor = (id) => document.querySelector(`template[data-shot="${CSS.escape(id)}"]`);

  async function open(id) {
    const tpl = templateFor(id);
    if (!tpl || busy || current) return;
    busy = true;

    shotBody.replaceChildren(tpl.content.cloneNode(true));
    const heading = shotBody.querySelector('h1, h2');
    if (heading) { heading.id = 'shot-title'; heading.tabIndex = -1; }
    shot.scrollTop = 0;

    root.classList.add('is-shooting');
    shot.hidden = false;
    const motion = !prefersReducedMotion();
    await shot.animate(
      motion
        ? [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }]
        : [{ opacity: 0 }, { opacity: 1 }],
      { duration: motion ? OPEN_MS : 150, easing: EASE_OUT }
    ).finished;

    stage.inert = true;
    stage.style.visibility = 'hidden';
    const trigger = triggerFor(id);
    const returnFocus = lastClicked && stage.contains(lastClicked) ? lastClicked : trigger;
    lastClicked = null;
    current = { id, returnFocus };
    heading?.focus({ preventScroll: true });
    busy = false;
    sync();
  }

  async function close() {
    if (!current || busy) return;
    busy = true;
    const { returnFocus } = current;

    stage.style.visibility = '';
    stage.inert = false;
    const fade = shot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_MS, easing: 'ease-in', fill: 'forwards' });
    await fade.finished;
    shot.hidden = true;
    fade.cancel();
    shotBody.replaceChildren();

    root.classList.remove('is-shooting');
    returnFocus?.focus({ preventScroll: true });
    current = null;
    busy = false;
    sync();
  }

  // Make the screen match the URL. Called on navigation and after every transition,
  // so clicks that land mid-animation are applied once it finishes.
  async function sync() {
    if (busy) return;
    const id = shotIdFromHash();
    if (current && current.id !== id) await close();
    else if (!current && id && templateFor(id)) {
      // Deep link: put the page behind it at the right spot for when it closes.
      if (!lastClicked) triggerFor(id)?.scrollIntoView({ block: 'center', behavior: 'instant' });
      await open(id);
    }
  }

  // Leave the page: go back in history if we pushed it, otherwise just clear the hash.
  function exit() {
    if (busy || !current) return;
    if (history.state?.shot) history.back();
    else {
      history.replaceState(null, '', location.pathname + location.search);
      sync();
    }
  }

  // ---- Wiring ----
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#/"]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (busy || root.classList.contains('is-panning')) return;
    const id = decodeURIComponent(link.getAttribute('href').slice(2));
    if (current?.id === id) return;
    lastClicked = link;
    // Page-to-page (e.g. "Let's talk" inside a service) replaces the entry,
    // so Back / Escape always returns to the main page rather than the previous detail page.
    // (Keep state null after a deep link so Back still means "close", not "leave the site".)
    const state = { shot: id };
    const url = `#/${encodeURIComponent(id)}`;
    if (current) history.replaceState(history.state?.shot ? state : null, '', url);
    else history.pushState(state, '', url);
    sync();
  });

  shot.querySelector('[data-shot-close]')?.addEventListener('click', exit);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !current) return;
    // Don't throw away what someone is typing: Escape in a filled-in form field does nothing.
    if (e.target.closest?.('input, textarea, select') && e.target.value) return;
    exit();
  });
  window.addEventListener('popstate', sync);

  initPans(stage);

  // Deep link (e.g. someone shares yoursite.com/#/work-ciao-bella)
  if (shotIdFromHash()) requestAnimationFrame(() => requestAnimationFrame(sync));
}

// ---- Pan between sections: pull back, re-frame, push in ----
function initPans(stage) {
  let panning = false;

  document.addEventListener('click', async (e) => {
    const link = e.target.closest('a[href^="#"]:not([href^="#/"]):not([data-no-pan])');
    if (!link || e.metaKey || e.ctrlKey) return;
    // Placeholder href="#" links: do nothing (otherwise the hash change would close a detail page)
    if (link.getAttribute('href') === '#') { e.preventDefault(); return; }
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    const root = document.documentElement;
    if (panning || root.classList.contains('is-shooting')) return;

    const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const y = target.id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - header;

    if (prefersReducedMotion()) {
      window.scrollTo({ top: y, behavior: 'instant' });
      focusSection(target);
      return;
    }

    panning = true;
    root.classList.add('is-panning');
    stage.getAnimations().forEach((a) => a.cancel());
    const centerOrigin = () => {
      const s = stage.getBoundingClientRect();
      return `${window.innerWidth / 2 - s.left}px ${window.innerHeight / 2 - s.top}px`;
    };

    stage.style.transformOrigin = centerOrigin();
    const out = stage.animate(
      [
        { transform: 'none', filter: 'blur(0px)' },
        { transform: 'scale(0.9)', filter: 'blur(6px)' },
      ],
      { duration: 340, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' }
    );
    await out.finished;

    window.scrollTo({ top: y, behavior: 'instant' });
    stage.style.transformOrigin = centerOrigin();
    const back = stage.animate(
      [
        { transform: 'scale(0.9)', filter: 'blur(6px)' },
        { transform: 'scale(1.015)', filter: 'blur(0px)', offset: 0.75 },
        { transform: 'none', filter: 'blur(0px)' },
      ],
      { duration: 600, easing: EASE_OUT }
    );
    out.cancel();
    await back.finished;

    stage.style.transformOrigin = '';
    focusSection(target);
    panning = false;
    root.classList.remove('is-panning');
  });
}

function focusSection(el) {
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}
