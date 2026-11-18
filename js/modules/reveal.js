// Fades elements with [data-reveal] in as they enter the viewport.
export function initReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-visible');
        observer.unobserve(el);
        // Drop the stagger delay once revealed so hover effects respond instantly
        setTimeout(() => { el.style.transitionDelay = ''; }, 1200);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  // Stagger siblings slightly for a cascading effect
  items.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
    el.style.transitionDelay = `${siblings.indexOf(el) * 80}ms`;
    observer.observe(el);
  });
}
