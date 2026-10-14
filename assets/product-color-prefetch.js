/* Warm native product sections on colour intent, then reuse that exact response. */
(() => {
  if (window.upswingColorPrefetch) return;
  const pages = new Map(), queue = [];
  let active = 0, navigation = 0;
  const currentRoot = () => document.querySelector('[data-product-section][data-section-id]');
  const targetURL = value => {
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin || !/\/products\/[^/]+$/.test(url.pathname)) return null;
      url.hash = ''; return url;
    } catch (_) { return null; }
  };
  const selections = root => [...root.querySelectorAll('form fieldset[data-option-group]')].map(group => {
    const control = group.querySelector('input:checked, select[data-option-select]');
    return {name:(group.dataset.optionName || group.querySelector('legend')?.firstChild?.textContent || '').trim(),value:control?.value};
  });
  const signature = root => JSON.stringify(selections(root));
  const pump = () => {
    while (active < 2 && queue.length) {
      active++; queue.shift()().finally(() => {active--; pump();});
    }
  };
  const fetchSection = url => {
    const key = url.href, cached = pages.get(key);
    if (cached && Date.now() - cached.at < 60000) return cached.promise;
    const entry = {at:Date.now()};
    entry.promise = new Promise(resolve => {
      const job = async () => {
        try {
          const response = await fetch(key, {credentials:'same-origin',redirect:'error',cache:'no-cache'});
          if (!response.ok) {resolve(null); return;}
          const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
          const section = parsed.querySelector('[data-product-section][data-product-url]');
          const actual = targetURL(section?.dataset.productUrl);
          if (!section || actual?.pathname !== url.pathname) {resolve(null); return;}
          const form = section.querySelector('form[data-product-form]');
          const requestedVariant = url.searchParams.get('variant');
          if (section.dataset.sectionId !== url.searchParams.get('section_id') || !form || !form.querySelector('[data-variants]') || (requestedVariant && form.querySelector('[name="id"]')?.value !== requestedVariant)) {resolve(null); return;}
          // Apps with executable section scripts retain normal document navigation.
          if ([...section.querySelectorAll('script')].some(script => !/^(application\/json|application\/ld\+json)$/.test(script.type))) {resolve(null); return;}
          resolve(section);
        } catch (_) {resolve(null);}
      };
      job.cancel = () => resolve(null); queue.push(job);
      pump();
    });
    pages.set(key, entry);
    if (pages.size > 8) pages.delete(pages.keys().next().value);
    return entry.promise;
  };
  let imageCache = window.upswingGalleryImagePreload?.create();
  async function warm(root, value) {
    const target = targetURL(value);
    if (!root?.isConnected || !target || target.pathname === targetURL(root.dataset.productUrl)?.pathname) return null;
    if (Number(root.querySelector('form')?.dataset.highVariants) > 250) return null;
    const handle = target.pathname.split('/').pop();
    const localeRoot = target.pathname.slice(0,target.pathname.lastIndexOf('/products/') + 1);
    const data = await window.upswingLegacyColors?.fetchProduct(handle, localeRoot);
    if (!data || !root.isConnected) return null;
    const chosen = selections(root);
    const values = (data.options || []).map(name => chosen.find(item => item.name === String(name).trim())?.value);
    const variant = values.length && values.every(Boolean) ? data.variants?.find(item => item.options?.every((value,index) => value === values[index])) : null;
    if (variant) target.searchParams.set('variant',variant.id);
    target.searchParams.set('section_id',root.dataset.sectionId);
    const section = await fetchSection(target);
    if (section && root.isConnected) {
      const image = section.querySelector('[data-product-image]');
      if (image?.getAttribute('src')) imageCache?.warm([image.getAttribute('src')]);
    }
    return section ? {section,data,url:target} : null;
  }
  function intent(event) {
    const link = event.target.closest('.model-colors .swatches > a, [data-color-target]');
    // Open quick-buy dropdowns live in the body to avoid clipped menus.
    const root = event.target.closest('[data-product-section]') || (link?.closest('.product-context-color-panel') ? currentRoot() : null);
    if (!root) return;
    if (link) {warm(root,link.dataset.colorTarget || link.href); return;}
    if (event.target.closest('[data-context-color-toggle]')) {
      [...root.querySelectorAll('.model-colors .swatches > a:not([aria-current])')].slice(0,4).forEach(link => warm(root,link.href));
    }
  }
  document.addEventListener('pointerover',intent);
  document.addEventListener('focusin',intent);
  document.addEventListener('click',async event => {
    const link = event.target.closest('.model-colors .swatches > a');
    const root = link?.closest('[data-product-section]');
    const target = targetURL(link?.href);
    if (!root || !target || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || target.pathname === targetURL(root.dataset.productUrl)?.pathname || Number(root.querySelector('form')?.dataset.highVariants) > 250) return;
    event.preventDefault();
    const ticket = ++navigation;
    root.dataset.colorPending = 'true';
    root.setAttribute('aria-busy','true');
    const oldForm = root.querySelector('[data-product-form]');
    oldForm?.setAttribute('aria-busy','true');
    const oldAdd = oldForm?.querySelector('.enhanced-add-button'); if (oldAdd) oldAdd.disabled = true;
    let result, stable = false;
    for (let tries = 0; tries < 3; tries++) {
      const before = signature(root); result = await warm(root,target.href);
      if (ticket !== navigation || !root.isConnected) return;
      if (!result) break;
      if (signature(root) === before) {stable = true;break;}
    }
    if (!result || !stable) {window.upswingProductMedia?.prepareColor(root,target.href);location.assign(target.href);return;}
    window.upswingProductMedia?.prepareColor(root,target.href);
    const incoming = document.importNode(result.section,true);
    const url = new URL(result.url); url.searchParams.delete('section_id');
    history.pushState({upswingColor:true},'',url.pathname + url.search);
    root.replaceWith(incoming);
    incoming.dispatchEvent(new CustomEvent('shopify:section:load',{bubbles:true,detail:{sectionId:incoming.dataset.sectionId}}));
    window.upswingLegacyColors?.bind(); window.upswingProductMedia?.bind(); window.upswingQuantity?.bind();
    const name = incoming.querySelector('h1')?.textContent.trim();
    if (name) {document.title = name + ' · ' + (document.title.split(' · ').at(-1) || 'upswing');}
    const canonical = document.querySelector('link[rel="canonical"]'); if (canonical) canonical.href = url.origin + url.pathname;
    const description = incoming.querySelector('.product-intro')?.textContent.trim();
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content',description);
    const nextLink = [...incoming.querySelectorAll('.model-colors .swatches > a')].find(item => targetURL(item.href)?.pathname === url.pathname);
    if (!incoming.querySelector('dialog[open]')) nextLink?.focus({preventScroll:true});
  });
  document.addEventListener('submit',event => {
    if (event.target.closest('[data-product-section]')?.dataset.colorPending === 'true') event.preventDefault();
  },true);
  window.addEventListener('popstate',() => {
    const root = currentRoot();
    if (root && targetURL(root.dataset.productUrl)?.pathname !== location.pathname) location.reload();
  });
  window.addEventListener('pagehide',() => {navigation++;queue.splice(0).forEach(job => job.cancel());pages.clear();imageCache?.destroy();imageCache=null;});
  window.addEventListener('pageshow',() => {imageCache ||= window.upswingGalleryImagePreload?.create();});
  window.upswingColorPrefetch = {warm};
})();
