(() => {
  function initialize(root) {
    root.querySelectorAll('[data-featured-random]').forEach(grid => {
      if (grid.dataset.featuredInitialized) return;
      const candidates = Array.from(grid.children);
      const count = Number.parseInt(grid.dataset.featuredCount, 10);
      if (!Number.isFinite(count) || count < 1 || !candidates.length) return;
      for (let i = candidates.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      const selected = candidates.slice(0, count).map(candidate =>
        candidate.matches('template[data-featured-candidate]')
          ? candidate.content.cloneNode(true)
          : candidate
      );
      grid.replaceChildren(...selected);
      grid.dataset.featuredInitialized = 'true';
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initialize(document), {once: true});
  } else {
    initialize(document);
  }
  document.addEventListener('shopify:section:load', event => initialize(event.target));
})();
