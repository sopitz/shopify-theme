/* Keep full-size gallery images downloaded and decoded before navigation. */
(() => {
  if (window.upswingGalleryImagePreload) return;
  window.upswingGalleryImagePreload = { create(options) {
    // Retain eight decoded images unless the caller asks for a larger gallery.
    const requested = Math.floor(Number(options?.limit));
    const limit = requested > 0 ? requested : 8;
    const cache = new Map(), active = new Set();
    let queue = [], wanted = new Set(), destroyed = false;
    const key = value => {
      if (!value) return '';
      try {
        const url = new URL(value, document.baseURI);
        return /^https?:$/.test(url.protocol) ? url.href : '';
      } catch (_) { return ''; }
    };
    const trim = () => {
      for (const [url, entry] of cache) {
        if (cache.size <= limit) break;
        if (!active.has(entry) && !wanted.has(url)) cache.delete(url);
      }
    };
    const pump = () => {
      while (!destroyed && active.size < 2 && queue.length) {
        const url = queue.shift(), entry = cache.get(url);
        if (!entry || entry.image || !wanted.has(url)) continue;
        const image = new Image();
        entry.image = image;
        active.add(entry);
        image.decoding = 'async'; image.loading = 'eager'; image.fetchPriority = 'low';
        const finish = success => {
          if (destroyed) return;
          image.onload = image.onerror = null;
          active.delete(entry);
          if (!success && cache.get(url) === entry) cache.delete(url);
          trim(); pump();
        };
        image.onload = async () => {
          try { await image.decode?.(); } catch (_) { /* The browser can still render a loaded image. */ }
          finish(true);
        };
        image.onerror = () => finish(false);
        image.src = url;
      }
    };
    const clear = () => {
      queue = []; wanted = new Set();
      for (const [url, entry] of cache) if (!entry.image) cache.delete(url);
      trim();
    };
    return {
      warm(urls) {
        if (destroyed) return;
        const candidates = [...new Set(urls.map(key).filter(Boolean))].slice(0, limit);
        wanted = new Set(candidates); queue = [];
        for (const [url, entry] of cache) if (!entry.image && !wanted.has(url)) cache.delete(url);
        for (const url of candidates) {
          const entry = cache.get(url) || {};
          cache.delete(url); cache.set(url, entry);
          if (!entry.image) queue.push(url);
        }
        trim(); pump();
      },
      clear,
      destroy() {
        destroyed = true; clear();
        for (const entry of active) {
          entry.image.onload = entry.image.onerror = null;
          entry.image.removeAttribute('src');
        }
        active.clear(); cache.clear();
      }
    };
  }};
})();
