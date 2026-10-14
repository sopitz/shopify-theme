/* Native Shopify forms remain the source of truth for purchasing. */
document.documentElement.classList.replace('no-js', 'js');
(() => {
  const bind = (scope = document) => {
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
      const update = () => {
        const positions = [...new Set(optionControls.map(control => control.dataset.optionPosition))];
        const selected = positions.sort((a, b) => Number(a) - Number(b)).map(position => {
          const controls = optionControls.filter(control => control.dataset.optionPosition === position);
          return controls.find(control => control.tagName === 'SELECT' || control.checked);
        });
        if (Number(form.dataset.highVariants) > 250) {
          if (selected.some(control => !control)) return;
          const optionIds = selected.map(control => control.tagName === 'SELECT' ? control.selectedOptions[0].dataset.optionValueId : control.dataset.optionValueId);
          if (optionIds.every(Boolean)) { const url = new URL(window.location.href); url.searchParams.delete('variant'); url.searchParams.set('option_values', optionIds.join(',')); window.location.assign(url); }
          return;
        }
        const variant = variants.find(item => item.options.every((value, index) => value === selected[index]?.value));
        const add = form.querySelector('.enhanced-add-button') || form.querySelector('[type="submit"]');
        const label = form.querySelector('[data-add-label]');
        if (add) add.disabled = !variant?.available;
        if (label) label.textContent = !variant ? 'Diese Kombination ist nicht verfügbar' : variant.available ? 'In den Warenkorb' : 'Zurzeit nicht verfügbar';
        if (!variant) {
          idField.value = ''; idField.disabled = true;
          const availability = container.querySelector('[data-product-availability]');
          if (availability) availability.textContent = 'Diese Kombination ist nicht verfügbar';
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
        const availability = container.querySelector('[data-product-availability]');
        if (availability) availability.textContent = variant.available ? 'Online verfügbar' : 'Zurzeit nicht verfügbar';
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
})();
