/* One quantity control for the product form, reading bar, gallery and cart. */
(() => {
  const controllers = new Map();
  let frame = 0, nextId = 0;
  const selector = 'input[type="number"][name="quantity"], input[type="number"][data-context-quantity], input[type="number"][name="updates[]"], input[type="number"][data-cart-quantity]';
  const enhance = input => {
    if (controllers.has(input)) { controllers.get(input).sync(); return; }
    if (!input.id) input.id = `UpswingQuantity-${++nextId}`;
    const enclosingLabel = input.closest('label');
    if (enclosingLabel) {
      const field = document.createElement('div'); field.className = enclosingLabel.className;
      const label = document.createElement('label'); label.htmlFor = input.id;
      label.textContent = enclosingLabel.querySelector('span')?.textContent.trim() || 'Anzahl';
      enclosingLabel.replaceWith(field); field.append(label, input);
    }
    let group = input.closest('.quantity-input, .quantity-stepper');
    if (!group) { group = document.createElement('div'); input.before(group); group.append(input); }
    group.classList.add('quantity-stepper'); group.setAttribute('data-quantity-stepper', '');
    const caption = input.labels?.[0]?.textContent.trim() || input.getAttribute('aria-label') || 'Anzahl';
    group.setAttribute('role', 'group'); group.setAttribute('aria-label', caption);
    const makeButton = (direction, symbol) => {
      let button = group.querySelector(`[data-quantity-${direction}], [data-action="quantity-${direction}"], [data-action="cart-${direction}"]`);
      if (!button) {
        button = document.createElement('button'); button.type = 'button';
        const icon = document.createElement('span'); icon.textContent = symbol; icon.setAttribute('aria-hidden', 'true'); button.append(icon);
        if (direction === 'minus') input.before(button); else input.after(button);
      }
      button.type = 'button'; button.setAttribute(`data-quantity-${direction}`, '');
      if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', `${caption} ${direction === 'minus' ? 'verringern' : 'erhöhen'}`);
      button.setAttribute('aria-controls', input.id); return button;
    };
    const minus = makeButton('minus', '−'), plus = makeButton('plus', '+');
    const lifetime = new AbortController();
    const listen = (target, type, callback) => target.addEventListener(type, callback, {signal:lifetime.signal});
    const cartRules = () => input.hasAttribute('data-quantity-min') && input.min === '0';
    const minimum = () => Number(input.dataset.quantityMin || input.min || 1);
    const increment = () => Number(input.dataset.quantityStep || (input.step !== 'any' ? input.step : 1) || 1);
    const candidate = direction => {
      const value = input.valueAsNumber;
      if (cartRules() && Number.isFinite(value)) {
        if (direction < 0 && value > 0 && value <= minimum()) return '0';
        if (direction > 0 && value === 0) return input.max && minimum() > Number(input.max) ? input.value : String(minimum());
        if (direction < 0 && value === 0) return '0';
      }
      const probe = input.cloneNode(false); probe.value = input.value;
      if (cartRules()) { probe.min = String(minimum()); probe.step = String(increment()); }
      if (probe.step === 'any') probe.step = '1';
      try { if (direction > 0) probe.stepUp(); else probe.stepDown(); } catch (_) { return input.value; }
      return probe.value;
    };
    const sync = () => {
      if (lifetime.signal.aborted || !input.isConnected) return;
      const locked = input.disabled || input.readOnly;
      const atMinimum = locked || candidate(-1) === input.value;
      const atMaximum = locked || candidate(1) === input.value;
      if (minus.disabled !== atMinimum) minus.disabled = atMinimum;
      if (plus.disabled !== atMaximum) plus.disabled = atMaximum;
      if (cartRules()) {
        const value = input.valueAsNumber, min = minimum(), step = increment();
        const valid = Number.isFinite(value) && (value === 0 || (value >= min && Math.abs((value - min) / step - Math.round((value - min) / step)) < 1e-7));
        input.setCustomValidity(valid ? '' : `Bitte wählen Sie 0 zum Entfernen oder mindestens ${min} in Schritten von ${step}.`);
      }
    };
    const step = (event, direction) => {
      // Adopt preview buttons: its document click handler must not step a second time.
      event.preventDefault(); event.stopPropagation();
      if (input.disabled || input.readOnly) return;
      const value = candidate(direction);
      if (value !== input.value) {
        input.value = value;
        input.dispatchEvent(new Event('input', {bubbles:true}));
        input.dispatchEvent(new Event('change', {bubbles:true}));
      }
      sync();
    };
    listen(minus, 'click', event => step(event, -1)); listen(plus, 'click', event => step(event, 1));
    listen(input, 'input', sync); listen(input, 'change', sync);
    const observer = new MutationObserver(sync);
    observer.observe(input, {attributes:true,attributeFilter:['min','max','step','disabled','readonly','value','data-quantity-min','data-quantity-step']});
    controllers.set(input, {sync,destroy() {lifetime.abort(); observer.disconnect();}}); sync();
  };
  const bind = () => {
    for (const [input, controller] of controllers) if (!input.isConnected) {controller.destroy(); controllers.delete(input);}
    document.querySelectorAll(selector).forEach(enhance);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(() => {frame = 0; bind();}); };
  window.upswingQuantity = {bind,sync:input => controllers.get(input)?.sync()};
  const start = () => {bind(); new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
  document.addEventListener('shopify:section:load', schedule); document.addEventListener('shopify:section:unload', schedule);
})();
