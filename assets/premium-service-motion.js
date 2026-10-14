/* Small, finite service-icon animations; content remains visible without JavaScript. */
(() => {
  if (window.upswingPremiumMotion) return;
  window.upswingPremiumMotion = true;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cards = new Set();
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-premium-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12 }) : null;

  function scan() {
    for (const card of cards) {
      if (!card.isConnected) {
        observer?.unobserve(card);
        cards.delete(card);
      }
    }
    for (const card of document.querySelectorAll('[data-premium-card]')) {
      if (cards.has(card)) continue;
      cards.add(card);
      if (observer && !reduced.matches) {
        card.classList.add('premium-motion-ready');
        observer.observe(card);
      } else {
        card.classList.add('is-premium-visible');
      }
    }
  }

  function init() {
    scan();
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; scan(); });
    }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('shopify:section:load', scan);
    reduced.addEventListener('change', () => {
      if (!reduced.matches) return;
      for (const card of cards) {
        observer?.unobserve(card);
        card.classList.remove('premium-motion-ready');
        card.classList.add('is-premium-visible');
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
