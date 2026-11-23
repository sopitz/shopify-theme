/* Keep native collection filters compact on small screens and open on desktop. */
(() => {
  if (window.upswingCollectionGuidance) {
    window.upswingCollectionGuidance.bind(document);
    return;
  }
  const controllers = new WeakMap();
  const rootsWithin = scope => {
    const roots = [];
    if (scope instanceof Element && scope.matches('details[data-collection-filters]')) roots.push(scope);
    if (scope.querySelectorAll) roots.push(...scope.querySelectorAll('details[data-collection-filters]'));
    return roots;
  };
  const bind = (scope = document) => rootsWithin(scope).forEach(disclosure => {
    if (controllers.has(disclosure)) return;
    const desktop = window.matchMedia('(min-width: 821px)');
    const update = () => { disclosure.open = desktop.matches; };
    desktop.addEventListener('change', update);
    update();
    controllers.set(disclosure, {
      destroy() {
        desktop.removeEventListener('change', update);
        controllers.delete(disclosure);
      }
    });
  });
  const unbind = scope => rootsWithin(scope).forEach(root => controllers.get(root)?.destroy());
  window.upswingCollectionGuidance = {bind};
  bind(document);
  document.addEventListener('DOMContentLoaded', () => bind(document), {once: true});
  document.addEventListener('shopify:section:load', event => bind(event.target));
  document.addEventListener('shopify:section:unload', event => unbind(event.target));
})();
