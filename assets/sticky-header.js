/* Let service messages scroll away while the useful header stays pinned. */
(() => {
  if (window.upswingStickyHeader) {
    window.upswingStickyHeader.bind(document);
    return;
  }
  const controllers = new WeakMap();
  const rootsWithin = scope => {
    const roots = [];
    if (scope instanceof Element && scope.matches('.shopify-section-header')) roots.push(scope);
    if (scope.querySelectorAll) roots.push(...scope.querySelectorAll('.shopify-section-header'));
    return roots;
  };
  const bind = (scope = document) => rootsWithin(scope).forEach(wrapper => {
    if (controllers.has(wrapper)) return;
    const header = wrapper.querySelector('[data-navigation-root]');
    const utility = header?.querySelector('[data-header-utility]');
    const core = header?.querySelector('[data-header-core]');
    if (!header || !utility || !core) return;
    let frame = 0;
    const pageStyle = document.documentElement.style;
    const measure = () => {
      frame = 0;
      if (!wrapper.isConnected) return;
      const utilityHeight = Math.ceil(utility.getBoundingClientRect().height);
      const headerRect = header.getBoundingClientRect();
      const pinnedHeight = Math.ceil(headerRect.height - utilityHeight);
      wrapper.style.setProperty('--header-utility-height', `${utilityHeight}px`);
      pageStyle.setProperty('--header-sticky-height', `${pinnedHeight}px`);
      pageStyle.setProperty('--header-visible-height', `${Math.ceil(Math.max(pinnedHeight, headerRect.bottom))}px`);
      header.toggleAttribute('data-header-stuck', headerRect.top < -0.5);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    observer?.observe(utility);
    observer?.observe(core);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    measure();
    controllers.set(wrapper, {
      destroy() {
        observer?.disconnect();
        window.cancelAnimationFrame(frame);
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        wrapper.style.removeProperty('--header-utility-height');
        header.removeAttribute('data-header-stuck');
        pageStyle.removeProperty('--header-sticky-height');
        pageStyle.removeProperty('--header-visible-height');
        controllers.delete(wrapper);
      }
    });
  });
  const unbind = scope => rootsWithin(scope).forEach(root => controllers.get(root)?.destroy());
  window.upswingStickyHeader = { bind };
  bind(document);
  document.addEventListener('DOMContentLoaded', () => bind(document), { once: true });
  document.addEventListener('shopify:section:load', event => bind(event.target));
  document.addEventListener('shopify:section:unload', event => unbind(event.target));
})();
