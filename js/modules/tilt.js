// 3D tilt + spotlight that follows the pointer on [data-tilt] elements.
const MAX_DEG = 8;

export function initTilt() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;   // 0..1
      const y = (e.clientY - r.top) / r.height;   // 0..1

      el.style.setProperty('--mx', `${x * 100}%`);
      el.style.setProperty('--my', `${y * 100}%`);
      if (!reduceMotion) {
        el.style.setProperty('--ry', `${(x - 0.5) * 2 * MAX_DEG}deg`);
        el.style.setProperty('--rx', `${(0.5 - y) * 2 * MAX_DEG}deg`);
      }
      el.classList.add('is-active');
    });

    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.classList.remove('is-active');
    });
  });
}
