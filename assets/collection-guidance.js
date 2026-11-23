/* Keep native collection filters compact on small screens and open on desktop. */
(() => {
  if (window.upswingCollectionGuidance) {
    window.upswingCollectionGuidance.bind(document);
    return;
  }
  const controllers = new WeakMap();
  const enhancedNativeFaqs = new WeakSet();
  const nativeFaqHeadingsWithin = scope => {
    const selector = '.collection-description h2[id^="CollectionNativeFaq-"]';
    const headings = [];
    if (scope instanceof Element && scope.matches(selector)) headings.push(scope);
    if (scope.querySelectorAll) headings.push(...scope.querySelectorAll(selector));
    return headings;
  };
  const visibleText = node => node.nodeType === 8 ? '' : node.textContent.replace(/[\s\u00a0]+/g, ' ').trim();
  const nextNativeFaqNode = node => {
    let next = node.nextSibling;
    while (next && (next.nodeType === 8 || (next.nodeType === 3 && !visibleText(next)))) next = next.nextSibling;
    return next;
  };
  const nativeFaqRow = paragraph => {
    if (!paragraph || paragraph.tagName !== 'P') return null;
    const nodes = [...paragraph.childNodes];
    const first = nodes.findIndex(node => node.nodeType !== 3 || visibleText(node));
    const question = nodes[first];
    if (!question || question.nodeType !== 1 || question.tagName !== 'STRONG' || !/\?$/.test(visibleText(question))) return null;
    let separator = first + 1;
    while (nodes[separator]?.nodeType === 3 && !visibleText(nodes[separator])) separator++;
    if (nodes[separator]?.nodeType !== 1 || nodes[separator].tagName !== 'BR') return null;
    const answer = nodes.slice(separator + 1);
    if (!answer.some(node => visibleText(node))) return null;
    return {paragraph, question, answer};
  };
  const enhanceNativeFaq = heading => {
    if (enhancedNativeFaqs.has(heading)) return;
    const rows = [];
    let next = nextNativeFaqNode(heading);
    let row;
    while ((row = nativeFaqRow(next))) {
      rows.push(row);
      next = nextNativeFaqNode(next);
    }
    if (!rows.length) return;
    const list = document.createElement('div');
    list.className = 'collection-faq-list';
    heading.after(list);
    for (const {paragraph, question, answer} of rows) {
      const details = document.createElement('details');
      details.className = 'collection-faq-item';
      const summary = document.createElement('summary');
      const marker = document.createElement('span');
      marker.className = 'collection-faq-marker';
      marker.setAttribute('aria-hidden', 'true');
      summary.append(question, marker);
      const body = document.createElement('div');
      body.className = 'rte';
      body.append(...answer);
      details.append(summary, body);
      list.append(details);
      paragraph.remove();
    }
    enhancedNativeFaqs.add(heading);
  };
  const rootsWithin = scope => {
    const roots = [];
    if (scope instanceof Element && scope.matches('details[data-collection-filters]')) roots.push(scope);
    if (scope.querySelectorAll) roots.push(...scope.querySelectorAll('details[data-collection-filters]'));
    return roots;
  };
  const bind = (scope = document) => {
    rootsWithin(scope).forEach(disclosure => {
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
    nativeFaqHeadingsWithin(scope).forEach(enhanceNativeFaq);
  };
  const unbind = scope => rootsWithin(scope).forEach(root => controllers.get(root)?.destroy());
  window.upswingCollectionGuidance = {bind};
  bind(document);
  document.addEventListener('DOMContentLoaded', () => bind(document), {once: true});
  document.addEventListener('shopify:section:load', event => bind(event.target));
  document.addEventListener('shopify:section:unload', event => unbind(event.target));
})();
