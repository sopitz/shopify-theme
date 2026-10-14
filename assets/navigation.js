/* Native disclosure navigation. Links keep their normal browser behaviour. */
(() => {
  if (window.upswingNavigation) {
    window.upswingNavigation.bind(document);
    return;
  }
  const controllers = new WeakMap();
  const desktopViewport = window.matchMedia('(min-width: 1101px)');
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)');
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
        if (activeItem !== item) openTimer = window.setTimeout(() => openDesktop(item), 140);
      });
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
