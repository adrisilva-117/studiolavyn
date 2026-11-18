// Light/dark toggle. Defaults to OS preference; remembers explicit choice.
const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: dark)');

function current() {
  return root.dataset.theme || (media.matches ? 'dark' : 'light');
}

function save(theme) {
  try { localStorage.setItem('theme', theme); } catch (_) {}
}

export function initTheme() {
  const button = document.querySelector('.theme-toggle');
  if (!button) return;

  button.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    save(next);
  });
}
