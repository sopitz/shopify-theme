/* Native disclosure navigation. Links keep their normal browser behaviour. */
(() => {
  if (window.upswingNavigation) {
    window.upswingNavigation.bind(document);
    return;
  }
  const controllers = new WeakMap();
  const desktopViewport = window.matchMedia('(min-width: 1101px)');
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  // Warm the existing responsive elements, never a second guessed CDN URL.
  // This keeps the browser's srcset/sizes choice and its normal image cache key.
  const warmedSources = new Set();
  const imageKey = image => {
    const src = image.getAttribute('src');
    if (!src && !image.getAttribute('srcset')) return '';
    let url = '';
    try { if (src) { const parsed = new URL(src, document.baseURI); if (!/^https?:$/.test(parsed.protocol)) return ''; url = parsed.href; } }
    catch { return ''; }
    const picture = image.parentElement?.matches('picture') ? [...image.parentElement.querySelectorAll('source')].map(source => ['srcset', 'sizes', 'media', 'type'].map(name => source.getAttribute(name) || '')) : [];
    return JSON.stringify([url, ...['srcset', 'sizes', 'crossorigin', 'referrerpolicy'].map(name => image.getAttribute(name) || ''), picture]);
  };
  const rememberImage = key => {
    if (warmedSources.size >= 128) warmedSources.delete(warmedSources.values().next().value);
    warmedSources.add(key);
  };
  const createImageWarmer = (root, items, lifetime) => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const jobs = [];
    const attempted = new Set();
    const seen = key => attempted.has(key) || warmedSources.has(key);
    let destroyed = false;
    let loaded = document.readyState === 'complete';
    let running = 0;
    let idle = 0;
    let fallback = 0;
    const listen = (target, type, callback) => target?.addEventListener?.(type, callback, { signal: lifetime.signal });
    const visible = () => !document.hidden && document.visibilityState !== 'hidden' && root.isConnected;
    const automaticAllowed = () => loaded && visible() && desktopViewport.matches && fineHover.matches && !connection?.saveData && !['slow-2g', '2g', '3g'].includes(connection?.effectiveType) && !(typeof connection?.downlink === 'number' && connection.downlink > 0 && connection.downlink < 1.5);
    const cancelIdle = () => {
      if (idle) window.cancelIdleCallback?.(idle);
      window.clearTimeout(fallback);
      idle = 0; fallback = 0;
    };
    const enqueue = (panel, intent) => {
      const images = [...panel.querySelectorAll('img')];
      if (intent) images.reverse(); // Unshift the requested panel in DOM order.
      for (const image of images) {
        const key = imageKey(image);
        if (!key || seen(key)) continue;
        if (image.complete && image.naturalWidth > 0) { attempted.add(key); rememberImage(key); continue; }
        const existing = jobs.findIndex(job => job.key === key);
        if (existing >= 0) {
          if (intent) { const [job] = jobs.splice(existing, 1); job.intent = true; jobs.unshift(job); }
          continue;
        }
        const job = { image, key, intent };
        if (intent) jobs.unshift(job); else jobs.push(job);
      }
    };
    const start = job => {
      if (destroyed || !job.image.isConnected || seen(job.key)) return;
      attempted.add(job.key);
      rememberImage(job.key);
      const image = job.image;
      if (image.complete && image.naturalWidth > 0) return;
      running++;
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true; running--;
        image.removeEventListener('load', done); image.removeEventListener('error', done);
        if (!destroyed) { pumpIntent(); schedule(); }
      };
      image.addEventListener('load', done, { once: true, signal: lifetime.signal });
      image.addEventListener('error', done, { once: true, signal: lifetime.signal });
      image.setAttribute('fetchpriority', 'low');
      if (!image.hasAttribute('decoding')) image.setAttribute('decoding', 'async');
      image.setAttribute('loading', 'eager');
    };
    const pumpIntent = () => {
      if (destroyed || !visible() || !desktopViewport.matches) return;
      while (running < 4) {
        const index = jobs.findIndex(job => job.intent);
        if (index < 0) break;
        start(jobs.splice(index, 1)[0]);
      }
    };
    const schedule = () => {
      if (destroyed || idle || fallback || !automaticAllowed() || running >= 2 || !jobs.some(job => !job.intent)) return;
      const work = () => {
        idle = 0; fallback = 0;
        if (destroyed || !automaticAllowed()) return;
        while (running < 2) {
          const index = jobs.findIndex(job => !job.intent);
          if (index < 0) break;
          const job = jobs.splice(index, 1)[0];
          if (seen(job.key)) continue;
          start(job);
        }
      };
      // Optional work has no timeout that could force it into a busy frame.
      if (window.requestIdleCallback) idle = window.requestIdleCallback(work);
      else fallback = window.setTimeout(work, 1500);
    };
    const resume = () => {
      cancelIdle();
      pumpIntent();
      if (!automaticAllowed()) return;
      items.forEach(item => enqueue(item.querySelector('[data-nav-panel]'), false));
      pumpIntent(); schedule();
    };
    listen(window, 'load', () => { loaded = true; resume(); });
    listen(document, 'visibilitychange', resume);
    listen(connection, 'change', resume);
    listen(desktopViewport, 'change', resume);
    listen(fineHover, 'change', resume);
    resume();
    return {
      intent(panel) {
        if (destroyed || !visible() || !desktopViewport.matches) return;
        enqueue(panel, true); pumpIntent();
      },
      reveal(panel) {
        // Opening the menu is ordinary demand, including Save-Data.
        // Promote its actual images; queued copies cannot create new requests.
        panel.querySelectorAll('img').forEach(image => {
          const key = imageKey(image); if (key) { attempted.add(key); rememberImage(key); }
          if (image.getAttribute('fetchpriority') === 'low') image.setAttribute('fetchpriority', 'auto');
          image.setAttribute('loading', 'eager');
        });
      },
      destroy() { destroyed = true; cancelIdle(); jobs.length = 0; }
    };
  };
  const rootsWithin = scope => {
    const roots = [];
    if (scope instanceof Element && scope.matches('[data-navigation-root]')) roots.push(scope);
    if (scope.querySelectorAll) roots.push(...scope.querySelectorAll('[data-navigation-root]'));
    return roots;
  };

  const createController = root => {
    const lifetime = new AbortController();
    const listen = (target, type, callback) => target?.addEventListener(type, callback, { signal: lifetime.signal });
    const items = [...root.querySelectorAll('[data-nav-item]')].filter(item => item.querySelector('[data-nav-toggle]') && item.querySelector('[data-nav-panel]'));
    const images = createImageWarmer(root, items, lifetime);
    const mobileButton = root.querySelector('[data-navigation-mobile-toggle]');
    const mobilePanel = root.querySelector('[data-navigation-mobile-panel]');
    const toggleLabels = new WeakMap();
    let activeItem = null;
    let openTimer = 0;
    let closeTimer = 0;
    let focusTimer = 0;
    const clearHoverTimers = () => { window.clearTimeout(openTimer); window.clearTimeout(closeTimer); };
    const itemParts = item => ({ button: item.querySelector('[data-nav-toggle]'), panel: item.querySelector('[data-nav-panel]') });

    const closeDesktop = (restoreFocus = false) => {
      clearHoverTimers();
      if (!activeItem) return;
      const item = activeItem;
      const { button, panel } = itemParts(item);
      activeItem = null;
      button.setAttribute('aria-expanded', 'false');
      if (toggleLabels.has(button)) button.setAttribute('aria-label', toggleLabels.get(button));
      panel.hidden = true;
      item.classList.remove('is-open');
      root.removeAttribute('data-desktop-navigation-open');
      if (restoreFocus) button.focus();
    };
    const openDesktop = (item, focusTarget) => {
      if (!desktopViewport.matches) return;
      clearHoverTimers();
      if (activeItem && activeItem !== item) closeDesktop();
      const { button, panel } = itemParts(item);
      activeItem = item;
      button.setAttribute('aria-expanded', 'true');
      const menuTitle = item.querySelector('.mega-menu-link')?.textContent.trim() || 'Produkte';
      button.setAttribute('aria-label', `${menuTitle} – Untermenü schliessen`);
      panel.hidden = false;
      images.reveal(panel);
      item.classList.add('is-open');
      root.setAttribute('data-desktop-navigation-open', '');
      if (focusTarget) {
        const links = [...panel.querySelectorAll('a[href]')];
        (focusTarget === 'last' ? links.at(-1) : links[0])?.focus();
      }
    };
    const closeMobile = (restoreFocus = false) => {
      if (!mobileButton || !mobilePanel) return;
      mobilePanel.hidden = true;
      mobileButton.setAttribute('aria-expanded', 'false');
      mobileButton.setAttribute('aria-label', 'Menü öffnen');
      root.classList.remove('mobile-is-open');
      if (restoreFocus) mobileButton.focus();
    };
    const openMobile = () => {
      if (desktopViewport.matches || !mobileButton || !mobilePanel) return;
      closeDesktop();
      mobilePanel.hidden = false;
      mobileButton.setAttribute('aria-expanded', 'true');
      mobileButton.setAttribute('aria-label', 'Menü schliessen');
      root.classList.add('mobile-is-open');
    };

    items.forEach(item => {
      const { button, panel } = itemParts(item);
      toggleLabels.set(button, button.getAttribute('aria-label') || `${item.querySelector('.mega-menu-link')?.textContent.trim() || 'Produkte'} – Untermenü öffnen`);
      button.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
      listen(button, 'click', () => {
        if (!desktopViewport.matches) return;
        if (activeItem === item) closeDesktop(); else openDesktop(item);
      });
      listen(button, 'keydown', event => {
        if (!desktopViewport.matches) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          openDesktop(item, event.key === 'ArrowUp' ? 'last' : 'first');
        }
      });
      listen(item, 'pointerenter', event => {
        if (!desktopViewport.matches || !fineHover.matches || event.pointerType === 'touch') return;
        clearHoverTimers();
        images.intent(panel);
        if (activeItem !== item) openTimer = window.setTimeout(() => openDesktop(item), 140);
      });
      listen(item, 'focusin', () => { if (desktopViewport.matches) images.intent(panel); });
      listen(item, 'pointerleave', () => {
        if (!desktopViewport.matches || !fineHover.matches) return;
        clearHoverTimers();
        closeTimer = window.setTimeout(() => {
          if (activeItem === item && !item.contains(document.activeElement)) closeDesktop();
        }, 220);
      });
      listen(panel, 'pointerenter', () => window.clearTimeout(closeTimer));
      listen(item, 'focusout', () => {
        window.clearTimeout(focusTimer);
        focusTimer = window.setTimeout(() => {
          if (activeItem === item && !item.contains(document.activeElement)) closeDesktop();
        }, 0);
      });
      panel.querySelectorAll('[data-nav-close]').forEach(button => listen(button, 'click', () => closeDesktop(true)));
    });
    listen(mobileButton, 'click', () => {
      if (desktopViewport.matches) return;
      if (mobileButton.getAttribute('aria-expanded') === 'true') closeMobile(); else openMobile();
    });
    listen(mobileButton, 'keydown', event => {
      if (desktopViewport.matches || event.key !== 'ArrowDown') return;
      event.preventDefault();
      openMobile();
      mobilePanel?.querySelector('input, summary, a[href]')?.focus();
    });
    listen(document, 'pointerdown', event => {
      if (activeItem && !activeItem.contains(event.target)) closeDesktop();
      if (mobilePanel && !mobilePanel.hidden && !root.contains(event.target)) closeMobile();
    });
    listen(document, 'focusin', event => {
      if (activeItem && !activeItem.contains(event.target)) closeDesktop();
      if (mobilePanel && !mobilePanel.hidden && !root.contains(event.target)) closeMobile();
    });
    listen(document, 'keydown', event => {
      if (event.key !== 'Escape') return;
      if (mobilePanel && !mobilePanel.hidden) {
        event.preventDefault();
        closeMobile(root.contains(document.activeElement));
      } else if (activeItem) {
        event.preventDefault();
        closeDesktop(activeItem.contains(document.activeElement));
      }
    });
    const resetForViewport = () => { closeDesktop(); closeMobile(); };
    desktopViewport.addEventListener('change', resetForViewport);
    return {
      destroy() {
        images.destroy();
        closeDesktop(); closeMobile();
        window.clearTimeout(focusTimer);
        lifetime.abort();
        desktopViewport.removeEventListener('change', resetForViewport);
        controllers.delete(root);
      }
    };
  };
  const bind = (scope = document) => rootsWithin(scope).forEach(root => {
    if (!controllers.has(root)) controllers.set(root, createController(root));
  });
  const unbind = scope => rootsWithin(scope).forEach(root => controllers.get(root)?.destroy());
  window.upswingNavigation = { bind };
  bind(document);
  document.addEventListener('upswing:render', () => bind(document));
  document.addEventListener('DOMContentLoaded', () => bind(document), { once: true });
  document.addEventListener('shopify:section:load', event => bind(event.target));
  document.addEventListener('shopify:section:unload', event => unbind(event.target));
  const observePage = () => {
    if (!document.body) return;
    new MutationObserver(records => {
      records.forEach(record => {
        record.removedNodes.forEach(node => { if (node instanceof Element && !node.isConnected) unbind(node); });
        record.addedNodes.forEach(node => { if (node instanceof Element) bind(node); });
      });
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) observePage(); else document.addEventListener('DOMContentLoaded', observePage, { once: true });
})();
