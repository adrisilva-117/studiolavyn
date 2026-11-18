// Entry point: wires up each feature module.
import { initTheme } from './modules/theme.js';
import { initNav } from './modules/nav.js';
import { initReveal } from './modules/reveal.js';
import { initTilt } from './modules/tilt.js';
import { initDetail } from './modules/detail.js';
import { initContactForm } from './modules/contact-form.js';

document.documentElement.classList.add('js');

initTheme();
initNav();
initReveal();
initTilt();
initDetail();
initContactForm();

document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});
