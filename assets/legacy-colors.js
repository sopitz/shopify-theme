(() => {
  'use strict';
  if (window.upswingLegacyColors) { window.upswingLegacyColors.bind(); return; }
  const pending = [];
  const cache = new Map();
  const bound = new WeakSet();
  const waiting = new Map();
  let active = 0;
  const handlePattern = /^[a-z0-9][a-z0-9_-]*$/;

  function parse(value) {
    for (let depth = 0; depth < 2 && typeof value === 'string'; depth += 1) {
      try { value = JSON.parse(value); } catch { return null; }
    }
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  }

  function candidates(payload, locale) {
    payload = parse(payload);
    if (!payload) return [];
    const language = String(locale || 'de');
    const order = [...new Set(['de_CH', 'de-CH', 'de', language, language.replace(/-/g, '_'), language.split(/[-_]/)[0], ...Object.keys(payload)])];
    const groups = new Map();
    for (const key of order) {
      if (!Array.isArray(payload[key])) continue;
      for (const entry of payload[key]) {
        if (!entry || entry.type !== 'product' || typeof entry.handle !== 'string') continue;
        const handle = entry.handle.trim();
        if (!handlePattern.test(handle)) continue;
        // The legacy id groups translations only. It is never a Shopify id.
        const identity = entry.id != null ? `legacy:${String(entry.id)}` : entry.name ? `name:${String(entry.name)}` : `handle:${handle}`;
        if (!groups.has(identity)) {
          if (groups.size >= 20) continue;
          groups.set(identity, []);
        }
        const handles = groups.get(identity);
        if (!handles.includes(handle)) handles.push(handle);
      }
    }
    return [...groups.values()];
  }

  function rootURL(root) {
    try {
      const url = new URL(root || '/', location.origin);
      if (url.origin !== location.origin) return new URL('/', location.origin);
      url.search = ''; url.hash = '';
      if (!url.pathname.endsWith('/')) url.pathname += '/';
      return url;
    } catch { return new URL('/', location.origin); }
  }

  function pump() {
    while (active < 3 && pending.length) {
      const job = pending.shift(); active += 1;
      job().finally(() => { active -= 1; pump(); });
    }
  }

  function fetchProduct(handle, root) {
    const url = new URL(`products/${encodeURIComponent(handle)}`, rootURL(root));
    url.searchParams.set('section_id', 'product-color-data');
    const key = url.href;
    if (cache.has(key)) return cache.get(key);
    const result = new Promise(resolve => {
      pending.push(async () => {
        try {
          const response = await fetch(url.href, {credentials:'same-origin', redirect:'error', cache:'force-cache'});
          if (!response.ok) { resolve(null); return; }
          const html = new DOMParser().parseFromString(await response.text(), 'text/html');
          const payload = html.querySelector('script[type="application/json"][data-product-color-payload]');
          if (!payload) { resolve(null); return; }
          const product = JSON.parse(payload.textContent);
          if (!product || String(product.handle) !== handle || !product.id || typeof product.title !== 'string') { resolve(null); return; }
          const color = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(product.color || '') ? product.color : null;
          resolve({id:product.id, handle, title:product.title, image:product.image || null, options:product.options || [], variants:product.variants || [], productTitle:product.productTitle || product.title, url:new URL(`products/${encodeURIComponent(handle)}`, rootURL(root)).pathname, color});
        } catch { resolve(null); }
      });
      pump();
    });
    cache.set(key, result);
    return result;
  }

  function swatch(product, selected, card) {
    const link = document.createElement('a');
    link.className = `swatch swatch--labeled${product.color ? '' : ' swatch--text'}${selected ? ' is-selected' : ''}`;
    link.href = product.url;
    link.title = product.title;
    link.setAttribute('aria-label', product.title);
    if (selected) link.setAttribute('aria-current', 'page');
    if (product.color) link.style.setProperty('--swatch-color', product.color);
    if (product.image) {
      link.dataset.cardSwatch = product.image;
    }
    const label = document.createElement('span'); label.className = 'swatch-label';
    label.textContent = product.title; link.append(label);
    return link;
  }

  async function hydrate(script) {
    if (!script.isConnected || script.dataset.legacyState) return;
    script.dataset.legacyState = 'loading';
    let data;
    try { data = JSON.parse(script.textContent); } catch { script.dataset.legacyState = 'invalid'; return; }
    if (!data.current?.handle || !handlePattern.test(data.current.handle)) { script.dataset.legacyState = 'invalid'; return; }
    const card = script.dataset.legacyMode === 'card';
    const host = card ? script.closest('.product-card') : script.closest('[data-product-section]');
    if (!host) { script.dataset.legacyState = 'invalid'; return; }
    if (script.hasAttribute('data-legacy-server-resolved')) { script.dataset.legacyState = 'ready'; return; }
    const resolved = [data.current];
    const seen = new Set([String(data.current.id), `handle:${data.current.handle}`]);
    const matches = await Promise.all(candidates(data.payload, data.locale).map(async handles => {
      for (const handle of handles) {
        const product = handle === data.current.handle ? data.current : await fetchProduct(handle, data.root);
        if (!product) continue;
        return product;
      }
      return null;
    }));
    for (const product of matches) {
      if (!product) continue;
      const id = String(product.id);
      if (!seen.has(id) && !seen.has(`handle:${product.handle}`)) {
        seen.add(id); seen.add(`handle:${product.handle}`); resolved.push(product);
      }
    }
    if (!script.isConnected || !host.isConnected) return;
    script.dataset.legacyState = 'ready';
    if (resolved.length < 2) return;
    let list = card ? host.querySelector('.product-card-content > .swatches') : script.closest('.model-colors')?.querySelector('.swatches');
    if (!list) {
      const content = host.querySelector('.product-card-content');
      const actions = content?.querySelector('.product-card-actions');
      if (!content || !actions) return;
      list = document.createElement('div'); list.className = 'swatches';
      list.setAttribute('aria-label', `Farben für ${data.current.productTitle || data.current.title}`);
      content.insertBefore(list, actions);
    }
    list.replaceChildren(...resolved.map((product, index) => swatch(product, index === 0, card)));
    if (card) {
      const count = document.createElement('span'); count.className = 'swatch-count';
      count.textContent = `${resolved.length} Farben`; list.append(count);
    } else {
      const wrapper = script.closest('.model-colors');
      if (wrapper) wrapper.hidden = false;
    }
    host.dispatchEvent(new CustomEvent('upswing:colors-ready', {bubbles:true, detail:{productHandle:data.current.handle, colors:resolved, source:'custom_fields.custom_rel_farbe'}}));
  }

  const intersection = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      const scripts = waiting.get(entry.target) || [];
      waiting.delete(entry.target); intersection.unobserve(entry.target);
      scripts.forEach(hydrate);
    }
  }, {rootMargin:'160px'}) : null;

  function checkVisible() {
    for (const [element, scripts] of waiting) {
      if (!element.isConnected) { waiting.delete(element); continue; }
      const rect = element.getBoundingClientRect();
      if (rect.bottom >= -160 && rect.top <= window.innerHeight + 160) {
        waiting.delete(element); scripts.forEach(hydrate);
      }
    }
  }

  function bind() {
    for (const script of document.querySelectorAll('script[data-legacy-color-data]')) {
      if (bound.has(script)) continue;
      bound.add(script);
      if (script.dataset.legacyMode !== 'card' || script.hasAttribute('data-legacy-server-resolved')) { hydrate(script); continue; }
      const card = script.closest('.product-card');
      if (!card) continue;
      waiting.set(card, [...(waiting.get(card) || []), script]);
      if (intersection) intersection.observe(card);
    }
    for (const [element] of waiting) if (!element.isConnected) { intersection?.unobserve(element); waiting.delete(element); }
    if (!intersection) checkVisible();
  }

  window.upswingLegacyColors = {bind,fetchProduct};
  if (!intersection) {
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; checkVisible(); }); };
    window.addEventListener('scroll', schedule, {passive:true});
    window.addEventListener('resize', schedule);
  }
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true; queueMicrotask(() => { scheduled = false; bind(); });
  });
  function init() { bind(); observer.observe(document.body, {childList:true, subtree:true}); }
  document.addEventListener('shopify:section:load', bind);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
