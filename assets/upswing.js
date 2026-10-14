/* Native Shopify forms remain the source of truth for purchasing. */
document.documentElement.classList.replace('no-js', 'js');
(() => {
  const bind = (scope = document) => {
    scope.querySelectorAll('select[data-sort-select][name="sort_by"]').forEach(select => {
      if (select.dataset.sortBound || !select.form || select.form.method.toLowerCase() !== 'get') return;
      select.dataset.sortBound = 'true';
      select.addEventListener('change', () => {
        if (!select.value || select.selectedOptions[0]?.disabled) return;
        // Sort the applied URL state; sidebar edits still wait for its Apply button.
        // Keeping that state also retains repeated filters, search and page-size options.
        const url = new URL(window.location.href);
        url.searchParams.set('sort_by', select.value);
        url.searchParams.delete('page');
        if (select.dataset.sortPageParam) url.searchParams.delete(select.dataset.sortPageParam);
        url.hash = '';
        window.location.assign(url.href);
      });
      select.closest('.sort-control')?.querySelectorAll('[data-sort-apply]').forEach(button => {
        if (button.form === select.form) button.hidden = true;
      });
    });
    scope.querySelectorAll('[data-menu-toggle]').forEach(button => {
      if (button.dataset.bound) return;
      button.dataset.bound = 'true';
      const panel = document.getElementById(button.getAttribute('aria-controls')) || document.querySelector('[data-mobile-nav]');
      if (!panel) return;
      button.addEventListener('click', () => {
        const open = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(open)); panel.hidden = !open;
      });
      panel.addEventListener('keydown', event => { if (event.key === 'Escape') { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); button.focus(); } });
    });
    scope.querySelectorAll('[data-product-form]').forEach(form => {
      if (form.dataset.bound) return;
      form.dataset.bound = 'true';
      const container = form.closest('[data-product-section]') || form.closest('.product-detail') || form.parentElement;
      const script = form.querySelector('[data-variants]') || container.querySelector('[data-variants]');
      let variants = [];
      try { variants = script ? JSON.parse(script.textContent) : []; } catch { return; }
      const idField = form.querySelector('[name="id"]');
      const optionControls = [...form.querySelectorAll('[data-option-select]')];
      const availability = container.querySelector('[data-product-availability]');
      const deliveryCache = new Map();
      const deliveryStatuses = ['fast','normal','unavailable'];
      const deliverySeedTime = Date.now();
      variants.forEach(variant => {
        if (typeof variant.delivery?.text === 'string' && variant.delivery.text.trim() && deliveryStatuses.includes(variant.delivery.status)) {
          deliveryCache.set(String(variant.id), {text:variant.delivery.text.trim(),status:variant.delivery.status,time:deliverySeedTime});
        }
      });
      // A freshly rendered selected-variant paragraph can be more complete
      // than the variant JSON. Trust it only for the form's exact selected ID.
      if (availability?.dataset.deliveryVariant === String(idField.value) && availability.textContent.trim() && deliveryStatuses.includes(availability.dataset.deliveryStatus)) {
        deliveryCache.set(String(idField.value), {text:availability.textContent.trim(),status:availability.dataset.deliveryStatus,time:deliverySeedTime});
      }
      let deliveryRequest = null;
      let deliverySequence = 0;
      const applyDelivery = (text, status, variantId = '') => {
        if (!availability) return;
        availability.textContent = text;
        availability.dataset.deliveryStatus = status;
        availability.dataset.deliveryVariant = String(variantId);
        availability.setAttribute('aria-busy', status === 'pending' ? 'true' : 'false');
        // If stock changed since the page rendered, the selected-variant
        // response is authoritative and the purchase mirror must disable too.
        if (status === 'unavailable' && variantId) {
          const add = form.querySelector('.enhanced-add-button') || form.querySelector('[type="submit"]');
          const label = form.querySelector('[data-add-label]');
          if (add) add.disabled = true;
          if (label) label.textContent = container.dataset.colorPending === 'true' ? 'Auswahl wird geladen …' : 'Zurzeit nicht verfügbar';
        }
      };
      const updateDelivery = async variant => {
        const sequence = ++deliverySequence;
        deliveryRequest?.abort(); deliveryRequest = null;
        if (!variant) { applyDelivery('Diese Kombination ist nicht verfügbar', 'unavailable'); return; }
        if (!variant.available) { applyDelivery('Aktuell nicht lieferbar', 'unavailable', variant.id); return; }
        const cached = deliveryCache.get(String(variant.id));
        if (cached && Date.now() - cached.time < 60000) {
          applyDelivery(cached.text, cached.status, variant.id); return;
        }
        // Old preview/test forms remain usable; live theme forms always have a
        // product URL and ID. Pickup availability cannot be inferred from total
        // inventory or from an unselected variant's empty store_availabilities.
        if (!form.dataset.productUrl || !form.dataset.productId) {
          applyDelivery('Online verfügbar', 'normal', variant.id); return;
        }
        applyDelivery('Lieferzeit wird geprüft …', 'pending', variant.id);
        const controller = new AbortController(); deliveryRequest = controller;
        const isCurrent = () => sequence === deliverySequence && !controller.signal.aborted && form.isConnected && String(idField.value) === String(variant.id);
        try {
          const url = new URL(form.dataset.productUrl, window.location.origin);
          if (url.origin !== window.location.origin) throw new Error('Invalid delivery URL');
          url.searchParams.set('variant', variant.id);
          url.searchParams.set('section_id', 'product-delivery');
          const response = await fetch(url, {signal:controller.signal, credentials:'same-origin', redirect:'error', headers:{Accept:'text/html'}});
          if (!response.ok) throw new Error('Delivery unavailable');
          const document = new DOMParser().parseFromString(await response.text(), 'text/html');
          const result = document.querySelector('[data-product-delivery]');
          const label = result?.querySelector('[data-product-availability]');
          if (!label || result.dataset.productId !== form.dataset.productId || result.dataset.variantId !== String(variant.id)) throw new Error('Unexpected delivery variant');
          const status = label.dataset.deliveryStatus;
          const text = label.textContent.trim();
          if (!text || !deliveryStatuses.includes(status)) throw new Error('Invalid delivery status');
          if (!isCurrent()) return;
          deliveryCache.set(String(variant.id), {text,status,time:Date.now()});
          applyDelivery(text, status, variant.id);
        } catch (error) {
          if (isCurrent() && error.name !== 'AbortError') applyDelivery('Online verfügbar · Lieferzeit konnte nicht ermittelt werden.', 'unknown', variant.id);
        } finally {
          if (deliveryRequest === controller) deliveryRequest = null;
        }
      };
      const update = () => {
        const positions = [...new Set(optionControls.map(control => control.dataset.optionPosition))];
        const selected = positions.sort((a, b) => Number(a) - Number(b)).map(position => {
          const controls = optionControls.filter(control => control.dataset.optionPosition === position);
          return controls.find(control => control.tagName === 'SELECT' || control.checked);
        });
        if (Number(form.dataset.highVariants) > 250) {
          if (selected.some(control => !control)) return;
          deliverySequence++; deliveryRequest?.abort(); deliveryRequest = null;
          const optionIds = selected.map(control => control.tagName === 'SELECT' ? control.selectedOptions[0].dataset.optionValueId : control.dataset.optionValueId);
          if (optionIds.every(Boolean)) { const url = new URL(window.location.href); url.searchParams.delete('variant'); url.searchParams.set('option_values', optionIds.join(',')); window.location.assign(url); }
          return;
        }
        const variant = variants.find(item => item.options.every((value, index) => value === selected[index]?.value));
        const add = form.querySelector('.enhanced-add-button') || form.querySelector('[type="submit"]');
        const label = form.querySelector('[data-add-label]');
        const colorPending = container.dataset.colorPending === 'true';
        if (add) { add.disabled = !variant?.available || colorPending; if (colorPending) add.setAttribute('aria-busy','true'); }
        if (label) label.textContent = colorPending ? 'Auswahl wird geladen …' : !variant ? 'Diese Kombination ist nicht verfügbar' : variant.available ? 'In den Warenkorb' : 'Zurzeit nicht verfügbar';
        if (!variant) {
          idField.value = ''; idField.disabled = true;
          updateDelivery(null);
          const sku = container.querySelector('[data-product-sku]');
          const skuRow = container.querySelector('[data-product-sku-row]');
          if (sku) sku.textContent = '';
          if (skuRow) skuRow.hidden = true;
          return;
        }
        idField.disabled = false;
        idField.value = variant.id;
        selected.forEach((control, index) => { const legend = form.querySelector(`[data-option-selected="${index + 1}"]`); if (legend && control) legend.textContent = control.value; });
        const price = container.querySelector('[data-product-price]');
        if (price) price.textContent = variant.price_formatted;
        const sku = container.querySelector('[data-product-sku]');
        const skuRow = container.querySelector('[data-product-sku-row]');
        if (sku) sku.textContent = variant.sku || '';
        if (skuRow) skuRow.hidden = !variant.sku;
        const compare = container.querySelector('[data-product-compare-price]');
        if (compare) { compare.textContent = variant.compare_at_formatted || ''; compare.hidden = !(variant.compare_at_price > variant.price); }
        updateDelivery(variant);
        const quantity = form.querySelector('[data-product-quantity]');
        if (quantity && variant.quantity_rule) {
          quantity.min = variant.quantity_rule.min || 1; quantity.step = variant.quantity_rule.increment || 1;
          if (variant.quantity_rule.max) quantity.max = variant.quantity_rule.max; else quantity.removeAttribute('max');
          quantity.value = Math.max(Number(quantity.value), Number(quantity.min));
        }
        const image = container.querySelector('[data-product-image]');
        if (image && variant.image) { image.src = variant.image; image.alt = variant.image_alt || image.alt; image.removeAttribute('srcset'); }
        const url = new URL(window.location.href); url.searchParams.set('variant', variant.id); url.searchParams.delete('option_values'); history.replaceState({}, '', url);
      };
      optionControls.forEach(control => control.addEventListener('change', update));
      if (variants.length && Number(form.dataset.highVariants) <= 250 && optionControls.length) update();
      const fallback = form.querySelector('[data-variant-fallback]');
      if (fallback && variants.length) fallback.hidden = true;
    });
    scope.querySelectorAll('[data-product-description]').forEach(article => {
      if (article.dataset.contentsBound) return;
      const nav = article.closest('.product-description-shell')?.querySelector('[data-description-nav]');
      const headings = [...article.querySelectorAll('h2,h3')];
      if (!nav || !headings.length) return;
      article.dataset.contentsBound = 'true';
      const label = document.createElement('span');
      label.className = 'description-nav-label'; label.textContent = 'Direkt zum Thema';
      nav.append(label);
      headings.forEach((heading, index) => {
        heading.id = heading.id || `ProductHeading-${index + 1}`;
        const link = document.createElement('a');
        link.href = `#${heading.id}`; link.textContent = heading.textContent.trim();
        nav.append(link);
      });
      nav.hidden = false;
    });
    scope.querySelectorAll('[data-gallery-image]').forEach(link => {
      if (link.dataset.bound) return; link.dataset.bound = 'true';
      link.addEventListener('click', event => {
        const container = link.closest('.product-gallery'); const image = container?.querySelector('[data-product-image]');
        if (!image) return; event.preventDefault(); image.src = link.dataset.galleryImage; image.alt = link.dataset.galleryAlt || image.alt; image.removeAttribute('srcset');
        container.querySelectorAll('[data-gallery-image]').forEach(item => { item.classList.toggle('active', item === link); item.classList.toggle('is-selected', item === link); });
      });
    });
    scope.querySelectorAll('[data-card-swatch]').forEach(button => {
      if (button.dataset.bound) return; button.dataset.bound = 'true';
      const preview = () => {
        const card = button.closest('.product-card'); const image = card?.querySelector('.product-media img');
        if (!image || !button.dataset.cardSwatch) return; image.src = button.dataset.cardSwatch; image.removeAttribute('srcset');
      };
      button.addEventListener('mouseenter', preview); button.addEventListener('focus', preview);
    });
  };
  bind(); document.addEventListener('shopify:section:load', event => bind(event.target));
  document.addEventListener('upswing:colors-ready', event => bind(event.target));
})();
