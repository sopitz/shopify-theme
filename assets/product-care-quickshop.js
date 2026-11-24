(() => {
  if (document.documentElement.dataset.careQuickshopBound) return;
  document.documentElement.dataset.careQuickshopBound = 'true';

  const refreshCart = async form => {
    const url = new URL(form.dataset.cartUrl, window.location.href);
    if (url.origin !== window.location.origin) return;
    url.pathname = url.pathname.replace(/\/$/, '') + '.js';
    const response = await fetch(url, {credentials:'same-origin', headers:{Accept:'application/json'}});
    if (!response.ok) return;
    const cart = await response.json();
    if (!Number.isInteger(cart.item_count) || cart.item_count < 0) return;
    document.querySelectorAll('[data-cart-count]').forEach(badge => {
      badge.textContent = String(cart.item_count);
      badge.closest('a')?.setAttribute('aria-label', `Warenkorb mit ${cart.item_count} Artikeln`);
    });
    document.dispatchEvent(new CustomEvent('cart:refresh', {detail:{cart, source:'care-quickshop'}}));
  };

  document.addEventListener('change', event => {
    const select = event.target.closest('select[data-quickshop-variant]');
    const form = select?.closest('[data-care-quickshop]');
    if (!form || form.dataset.busy === 'true' || form.dataset.uncertain === 'true') return;
    const option = select.selectedOptions[0];
    const quantity = form.querySelector('[data-quickshop-quantity]');
    const price = form.querySelector('[data-quickshop-price]');
    const submit = form.querySelector('[data-quickshop-submit]');
    if (price) price.textContent = option?.dataset.priceText || '';
    if (quantity && option?.value) {
      quantity.min = option.dataset.min || '1';
      quantity.step = option.dataset.step || '1';
      if (option.dataset.max) quantity.max = option.dataset.max;
      else quantity.removeAttribute('max');
      quantity.value = quantity.min;
    }
    if (submit) submit.disabled = !option?.value || option.disabled || option.dataset.available !== 'true';
    form.querySelector('[data-quickshop-message]').textContent = '';
  });

  document.addEventListener('submit', async event => {
    const form = event.target.closest('[data-care-quickshop]');
    if (!form || event.defaultPrevented) return;
    event.preventDefault();
    if (form.dataset.busy === 'true' || form.dataset.uncertain === 'true' || !form.checkValidity()) return;
    const variant = form.querySelector('[data-quickshop-variant]');
    const option = variant?.tagName === 'SELECT' ? variant.selectedOptions[0] : variant;
    if (!variant?.value || option?.disabled || option?.dataset.available !== 'true') return;
    const endpoint = new URL(form.action, window.location.href);
    if (endpoint.origin !== window.location.origin || !/\/cart\/add\/?$/.test(endpoint.pathname)) return;
    endpoint.pathname = endpoint.pathname.replace(/\/$/, '') + '.js';
    const submit = form.querySelector('[data-quickshop-submit]');
    const message = form.querySelector('[data-quickshop-message]');
    const cartLink = form.querySelector('[data-quickshop-cart]');
    const quantity = form.querySelector('[data-quickshop-quantity]');
    const payload = new FormData(form);
    const variantWasDisabled = variant.disabled;
    const quantityWasDisabled = quantity?.disabled;
    if (variant.tagName === 'SELECT') variant.disabled = true;
    if (quantity) quantity.disabled = true;
    form.dataset.busy = 'true';
    form.setAttribute('aria-busy','true');
    submit.disabled = true;
    message.textContent = 'Wird hinzugefügt …';
    let responseReceived = false;
    try {
      const response = await fetch(endpoint, {method:'POST', credentials:'same-origin', headers:{Accept:'application/json'}, body:payload});
      responseReceived = true;
      if (response.ok || response.status >= 500) form.dataset.uncertain = 'true';
      const result = await response.json();
      if (!response.ok) {
        if (response.status >= 500) form.dataset.uncertain = 'true';
        throw new Error(typeof result.description === 'string' ? result.description : 'Der Artikel konnte nicht hinzugefügt werden.');
      }
      if (!result?.id && !result?.items?.length) throw new Error('Die Bestätigung fehlt.');
      delete form.dataset.uncertain;
      message.textContent = 'Zum Warenkorb hinzugefügt.';
      cartLink.hidden = false;
      // A failed count refresh must never repeat the successful purchase request.
      try { await refreshCart(form); } catch {}
    } catch (error) {
      if (!responseReceived) form.dataset.uncertain = 'true';
      if (form.dataset.uncertain === 'true') {
        message.textContent = 'Die Bestätigung fehlt. Bitte prüfe deinen Warenkorb, bevor du den Artikel erneut hinzufügst.';
        cartLink.hidden = false;
      } else message.textContent = error.message || 'Der Artikel konnte nicht hinzugefügt werden.';
    } finally {
      form.dataset.busy = 'false';
      form.removeAttribute('aria-busy');
      if (variant.tagName === 'SELECT') variant.disabled = variantWasDisabled;
      if (quantity) quantity.disabled = quantityWasDisabled;
      submit.disabled = form.dataset.uncertain === 'true';
    }
  });
})();
