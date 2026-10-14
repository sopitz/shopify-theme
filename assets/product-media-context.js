/* Shared by the Shopify product section and the local preview. */
(() => {
  const controllers = new Map();
  let pending = 0;
  let nextColorId = 0;
  let nextViewerId = 0;
  let continuation = null;
  const continuationKey = 'upswing-product-viewer-transition';
  const saveContinuation = state => {
    continuation = state;
    try { sessionStorage.setItem(continuationKey, JSON.stringify(state)); } catch (_) {}
  };
  const clearContinuation = () => {
    continuation = null;
    try { sessionStorage.removeItem(continuationKey); } catch (_) {}
  };
  const takeContinuation = () => {
    let state = continuation;
    try { state ||= JSON.parse(sessionStorage.getItem(continuationKey) || 'null'); } catch (_) {}
    clearContinuation();
    return state && Date.now() - state.at < 15000 && state.path === location.pathname ? state : null;
  };
  const focusAfterRender = selector => queueMicrotask(() => {
    const scope = document.querySelector('[data-product-viewer][open]') || document.querySelector('[data-product-media-context]');
    scope?.querySelector(selector)?.focus({preventScroll:true});
  });
  const bindPurchase = (root, preview, overview, viewerHooks) => {
    const form = overview.querySelector('[data-product-form], [data-add-form]');
    const options = preview.querySelector('[data-context-options]');
    const quantity = preview.querySelector('[data-context-quantity]');
    const add = preview.querySelector('[data-context-add]');
    const price = preview.querySelector('[data-context-price]');
    const availability = preview.querySelector('[data-context-availability]');
    const buttonPrice = document.createElement('span');
    buttonPrice.className = 'product-context-button-price';
    if (add) add.append(buttonPrice);
    if (availability) { availability.setAttribute('role', 'status'); availability.setAttribute('aria-live', 'polite'); }
    const error = preview.querySelector('[data-context-error]');
    const originalAdd = form?.querySelector('.enhanced-add-button, #pdp-add') || form?.querySelector('button[type="submit"]');
    const originalQuantity = form?.querySelector('input[name="quantity"]');
    if (!form || !options || !quantity || !add || !originalAdd || !originalQuantity) return {destroy() {}};
    const lifetime = new AbortController();
    const listen = (target, type, callback) => target.addEventListener(type, callback, {signal:lifetime.signal});
    const mirrors = [];
    let pendingSync = false, localError = '', navigating = false;
    const setText = (element, text) => { if (element && element.textContent !== text) element.textContent = text; };
    const clearError = () => { localError = ''; if (error) { error.hidden = true; setText(error, ''); } };
    const makeSelect = (labelText, entries, selected, onChange) => {
      const label = document.createElement('label');
      label.className = 'product-context-option';
      const caption = document.createElement('span'); caption.textContent = labelText;
      const select = document.createElement('select');
      select.setAttribute('data-context-option', '');
      if (!entries.some(entry => entry.value === selected())) {
        const placeholder = document.createElement('option');
        placeholder.value = ''; placeholder.textContent = 'Bitte wählen'; placeholder.disabled = true;
        select.append(placeholder);
      }
      entries.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.value; option.textContent = entry.label; option.disabled = !!entry.disabled;
        select.append(option);
      });
      label.append(caption, select); options.append(label);
      mirrors.push({select, selected, entries});
      listen(select, 'change', () => {
        clearError();
        if (Number(form.dataset.highVariants) > 250) viewerHooks.prepare?.('option', location.href);
        onChange(select.value); scheduleSync();
      });
    };
    const copySwatch = original => {
      const dot = original?.querySelector('.color-dot, .variant-color-dot');
      const originalImage = original?.querySelector('img');
      const fill = dot ? getComputedStyle(dot).backgroundColor : original?.style.getPropertyValue('--swatch-color');
      if (!dot && !originalImage && !fill) return null;
      const swatch = document.createElement('span');
      swatch.className = 'product-context-swatch'; swatch.setAttribute('aria-hidden', 'true');
      if (originalImage) {
        const image = document.createElement('img');
        image.src = originalImage.currentSrc || originalImage.src; image.alt = '';
        swatch.classList.add('has-image'); swatch.append(image);
      } else {
        swatch.style.backgroundColor = fill;
        if (dot) {
          const size = getComputedStyle(dot);
          swatch.style.width = size.width; swatch.style.height = size.height; swatch.style.flexBasis = size.width;
        }
      }
      return swatch;
    };
    const makeColorDropdown = (entries, selected, onChange) => {
      const container = document.createElement('div'); container.className = 'product-context-option product-context-color';
      const caption = document.createElement('span'); caption.textContent = 'Farbe';
      const trigger = document.createElement('button');
      trigger.type = 'button'; trigger.className = 'product-context-color-trigger';
      trigger.setAttribute('data-context-color-toggle', ''); trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false');
      const content = document.createElement('span'); content.className = 'product-context-color-value';
      const arrow = document.createElement('span'); arrow.className = 'product-context-color-arrow'; arrow.setAttribute('aria-hidden', 'true');
      trigger.append(content, arrow);
      const panel = document.createElement('div'); panel.className = 'product-context-color-panel';
      panel.id = `ProductContextColors-${++nextColorId}`; panel.hidden = true;
      panel.setAttribute('role', 'listbox'); panel.setAttribute('aria-label', 'Farbe wählen');
      trigger.setAttribute('aria-controls', panel.id);
      const buttons = entries.map(entry => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'product-context-color-choice';
        if (entry.swatch?.tagName === 'A') button.dataset.colorTarget = entry.swatch.href;
        button.setAttribute('role', 'option'); button.setAttribute('aria-selected', 'false'); button.tabIndex = -1;
        const swatch = copySwatch(entry.swatch); if (swatch) button.append(swatch);
        const text = document.createElement('span'); text.textContent = entry.label; button.append(text);
        panel.append(button); return button;
      });
      container.append(caption, trigger, panel); options.append(container);
      const close = (restoreFocus = false) => {
        panel.hidden = true; trigger.setAttribute('aria-expanded', 'false');
        if (panel.parentElement !== container) container.append(panel);
        buttons.forEach(button => { button.tabIndex = -1; });
        if (restoreFocus) trigger.focus({preventScroll:true});
      };
      const focusOption = index => {
        buttons.forEach((button, position) => { button.tabIndex = index === position ? 0 : -1; });
        const button = buttons[index];
        button?.focus({preventScroll:true});
        if (button) {
          const top = button.offsetTop, bottom = top + button.offsetHeight;
          if (top < panel.scrollTop) panel.scrollTop = top;
          else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight;
        }
      };
      const isDisabled = entry => entry.control ? entry.control.disabled : !!entry.disabled;
      const enabledIndices = () => entries.map((entry, index) => isDisabled(entry) ? -1 : index).filter(index => index >= 0);
      const open = (last = false) => {
        const enabled = enabledIndices(); if (!enabled.length) return;
        const chosen = entries.findIndex(entry => entry.value === selected());
        const host = trigger.closest('dialog[open]') || document.body;
        host.append(panel); panel.hidden = false; trigger.setAttribute('aria-expanded', 'true');
        const bounds = trigger.getBoundingClientRect(), width = window.visualViewport?.width || innerWidth;
        const headerBottom = (host.matches?.('dialog') ? host.querySelector('.product-viewer-toolbar') : document.querySelector('.site-header'))?.getBoundingClientRect().bottom || 0;
        const below = (window.visualViewport?.height || innerHeight) - bounds.bottom - 16;
        const above = bounds.top - headerBottom - 16;
        const opensAbove = below < 96 && above > below;
        panel.style.minWidth = Math.min(bounds.width, width - 32) + 'px';
        panel.style.maxWidth = Math.min(Math.max(260, bounds.width), width - 32) + 'px';
        panel.style.maxHeight = Math.max(48, Math.min(280, opensAbove ? above : below)) + 'px';
        panel.style.left = Math.max(16, Math.min(bounds.left, width - panel.offsetWidth - 16)) + 'px';
        panel.style.top = (opensAbove ? Math.max(headerBottom + 8, bounds.top - panel.offsetHeight - 8) : bounds.bottom + 8) + 'px';
        focusOption(last ? enabled.at(-1) : enabled.includes(chosen) ? chosen : enabled[0]);
      };
      listen(trigger, 'click', () => { if (panel.hidden) open(); else close(true); });
      listen(trigger, 'keydown', event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(event.key === 'ArrowUp'); }
        if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); event.stopPropagation(); close(true); }
      });
      buttons.forEach(button => listen(button, 'pointerdown', event => { if (event.button === 0) event.preventDefault(); }));
      buttons.forEach((button, index) => listen(button, 'click', () => {
        const entry = entries[index]; if (isDisabled(entry)) return;
        const changed = selected() !== entry.value;
        close(true); clearError(); if (changed) onChange(entry.value); scheduleSync();
        if (!root.isConnected) focusAfterRender('[data-context-color-toggle]');
      }));
      let typed = '', typedAt = 0;
      listen(panel, 'keydown', event => {
        const enabled = enabledIndices();
        const current = buttons.indexOf(document.activeElement);
        let next;
        if (event.key === 'ArrowDown') next = enabled[(enabled.indexOf(current) + 1) % enabled.length];
        if (event.key === 'ArrowUp') next = enabled[(enabled.indexOf(current) - 1 + enabled.length) % enabled.length];
        if (event.key === 'Home') next = enabled[0];
        if (event.key === 'End') next = enabled.at(-1);
        if (next !== undefined) { event.preventDefault(); focusOption(next); }
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
        if (event.key === 'Tab') close(true);
        if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const now = Date.now(); typed = (now - typedAt < 700 ? typed : '') + event.key.toLocaleLowerCase(); typedAt = now;
          const match = enabled.find(index => entries[index].label.toLocaleLowerCase().startsWith(typed));
          if (match !== undefined) { event.preventDefault(); focusOption(match); }
        }
      });
      listen(document, 'pointerdown', event => { if (!container.contains(event.target) && !panel.contains(event.target)) close(); });
      const closeOnBlur = () => queueMicrotask(() => { if (!container.contains(document.activeElement) && !panel.contains(document.activeElement)) close(); });
      listen(container, 'focusout', closeOnBlur); listen(panel, 'focusout', closeOnBlur);
      listen(window, 'resize', () => close());
      const syncColor = () => {
        const chosen = entries.find(entry => entry.value === selected());
        if (content.dataset.value !== selected()) {
          content.replaceChildren();
          const swatch = copySwatch(chosen?.swatch); if (swatch) content.append(swatch);
          const text = document.createElement('span'); text.textContent = chosen?.label || 'Bitte wählen'; content.append(text);
          content.dataset.value = selected();
        }
        trigger.setAttribute('aria-label', 'Farbe: ' + (chosen?.label || 'Bitte wählen'));
        buttons.forEach((button, index) => {
          const entry = entries[index], active = entry.value === selected();
          button.setAttribute('aria-selected', String(active)); button.classList.toggle('is-selected', active);
          button.disabled = isDisabled(entry);
          button.setAttribute('aria-disabled', String(button.disabled));
        });
      };
      mirrors.push({sync:syncColor, close, restoreFocus:() => entries.find(entry => entry.value === selected())?.control || entries.find(entry => entry.value === selected())?.swatch, owns:element => container.contains(element) || panel.contains(element)});
    };
    // Controls refer to the original options; no second variant catalogue or form.
    let hasSiblingColors = false;
    const addSiblingColors = () => {
      if (hasSiblingColors) return;
      const colorLinks = [...overview.querySelectorAll('.color-options > a, .model-colors .swatches > a')];
      if (colorLinks.length < 2) return;
      makeColorDropdown(colorLinks.map((link, index) => ({value:String(index), label:link.getAttribute('title') || link.getAttribute('aria-label') || link.textContent.trim(),swatch:link})),
        () => String(Math.max(0, colorLinks.findIndex(link => link.getAttribute('aria-current') === 'page'))),
        value => {
          const link = colorLinks[Number(value)];
          if (link) { viewerHooks.prepare?.('color', link.href); link.click(); }
        });
      // Older colour fields can resolve after the purchase controls were bound.
      // Add the colour control to the existing mirrors without rebuilding the
      // open image viewer or resetting its chosen size and quantity.
      options.prepend(options.lastElementChild);
      options.hidden = false;
      preview.classList.add('has-context-options');
      hasSiblingColors = true;
    };
    addSiblingColors();
    form.querySelectorAll('fieldset[data-option-group]').forEach(group => {
      const controls = [...group.querySelectorAll('input[type="radio"], select[data-option-select]')];
      if (!controls.length) return;
      const originalTitle = group.dataset.optionName || group.querySelector('legend')?.firstChild?.textContent.trim() || 'Ausführung';
      const title = /schuh|shoe/i.test(root.dataset.productContextKind || '') && /gr[öo]ss|size|pointure|misura/i.test(originalTitle) ? 'Schuhgrösse' : originalTitle;
      const colorOption = /^(farbe|color|colour)$/i.test(title.trim());
      if (colorOption && controls[0].tagName === 'SELECT') {
        const original = controls[0];
        makeColorDropdown([...original.options].map(option => ({value:option.value,label:option.textContent,disabled:option.disabled,swatch:option})), () => original.value,
          value => { original.value = value; original.dispatchEvent(new Event('change', {bubbles:true})); });
        return;
      }
      if (colorOption && controls[0].tagName !== 'SELECT') {
        makeColorDropdown(controls.map(control => ({value:control.value,label:control.labels?.[0]?.textContent.trim() || control.value,disabled:control.disabled,control,swatch:control.labels?.[0]})),
          () => controls.find(control => control.checked)?.value || '',
          value => { const original = controls.find(control => control.value === value); if (original && !original.disabled) { original.checked = true; original.dispatchEvent(new Event('change', {bubbles:true})); } });
        return;
      }
      if (controls[0].tagName === 'SELECT') {
        const original = controls[0];
        makeSelect(title, [...original.options].map(option => ({value:option.value,label:option.textContent,disabled:option.disabled})), () => original.value,
          value => { original.value = value; original.dispatchEvent(new Event('change', {bubbles:true})); });
      } else {
        makeSelect(title, controls.map(control => ({value:control.value, label:control.labels?.[0]?.textContent.trim() || control.value, disabled:control.disabled, control})),
          () => controls.find(control => control.checked)?.value || '',
          value => { const original = controls.find(control => control.value === value); if (original && !original.disabled) { original.checked = true; original.dispatchEvent(new Event('change', {bubbles:true})); } });
      }
    });
    const fallback = form.querySelector('select[data-variant-id]');
    if (!mirrors.length && fallback && !fallback.closest('[hidden]')) {
      makeSelect('Ausführung', [...fallback.options].map(option => ({value:option.value,label:option.textContent,disabled:option.disabled})), () => fallback.value,
        value => { fallback.value = value; fallback.dispatchEvent(new Event('change', {bubbles:true})); });
    }
    const sellingPlan = form.querySelector('select[name="selling_plan"]');
    if (sellingPlan) {
      makeSelect('Kaufoption', [...sellingPlan.options].map(option => ({value:option.value,label:option.textContent,disabled:option.disabled})), () => sellingPlan.value,
        value => { sellingPlan.value = value; sellingPlan.dispatchEvent(new Event('change', {bubbles:true})); });
    }
    options.hidden = !mirrors.length;
    preview.classList.toggle('has-context-options', !!mirrors.length);
    const originalPrice = overview.querySelector('[data-product-price], #pdp-price');
    const originalAvailability = form.querySelector('[data-product-availability], #pdp-stock');
    const originalError = form.querySelector('[data-product-error]');
    const sync = () => {
      if (lifetime.signal.aborted || !root.isConnected) return;
      mirrors.forEach(mirror => {
        if (mirror.sync) { mirror.sync(); return; }
        const {select, selected, entries} = mirror;
        if (!entries.some(entry => entry.value === selected()) && !select.querySelector('option[value=""]')) {
          const placeholder = document.createElement('option');
          placeholder.value = ''; placeholder.textContent = 'Bitte wählen'; placeholder.disabled = true;
          select.prepend(placeholder);
        }
        select.value = selected();
        entries.forEach(entry => {
          const option = [...select.options].find(item => item.value === entry.value);
          if (option && entry.control) option.disabled = entry.control.disabled;
        });
      });
      setText(price, originalPrice?.textContent.trim() || '');
      setText(buttonPrice, originalPrice?.textContent.trim() || '');
      const label = originalAdd.querySelector('[data-add-label]')?.textContent.trim() || originalAdd.textContent.trim();
      const colorPending = root.dataset.colorPending === 'true';
      setText(add.querySelector('[data-context-add-label]'), navigating || colorPending ? 'Auswahl wird geladen …' : label);
      add.disabled = navigating || colorPending || originalAdd.disabled;
      add.setAttribute('aria-busy', navigating || colorPending ? 'true' : originalAdd.getAttribute('aria-busy') || form.getAttribute('aria-busy') || 'false');
      setText(availability, /^Bitte .* wählen/.test(label) ? 'Auswahl erforderlich' : originalAvailability?.textContent.trim().replace(/\s+/g, ' ') || '');
      if (availability) {
        availability.dataset.deliveryStatus = originalAvailability?.dataset.deliveryStatus || '';
        availability.setAttribute('aria-busy',originalAvailability?.getAttribute('aria-busy') || 'false');
      }
      add.setAttribute('aria-label', [navigating ? 'Auswahl wird geladen' : label, price?.textContent, availability?.textContent].filter(Boolean).join(' · '));
      ['min','max','step'].forEach(attribute => {
        const value = originalQuantity.getAttribute(attribute);
        if (value === null) quantity.removeAttribute(attribute); else quantity.setAttribute(attribute, value);
      });
      quantity.value = originalQuantity.value;
      window.upswingQuantity?.sync(quantity);
      const formError = originalError && !originalError.hidden ? originalError.textContent.trim() : form.querySelector('.errors')?.textContent.trim();
      const message = formError || localError;
      setText(error, message || ''); if (error) error.hidden = !message;
    };
    const scheduleSync = () => {
      if (!pendingSync) { pendingSync = true; queueMicrotask(() => { pendingSync = false; sync(); }); }
    };
    listen(root, 'upswing:colors-ready', () => { addSiblingColors(); scheduleSync(); });
    const copyQuantity = () => {
      clearError(); originalQuantity.value = quantity.value;
      originalQuantity.dispatchEvent(new Event('input', {bubbles:true}));
    };
    listen(quantity, 'input', copyQuantity);
    listen(quantity, 'change', () => { copyQuantity(); originalQuantity.dispatchEvent(new Event('change', {bubbles:true})); });
    listen(form, 'input', scheduleSync);
    listen(form, 'change', event => {
      if (Number(form.dataset.highVariants) > 250 && event.target.matches('[data-option-select]')) navigating = true;
      scheduleSync();
    });
    listen(add, 'click', () => {
      if (navigating || originalAdd.disabled) return;
      if (!quantity.checkValidity() || !quantity.value) {
        localError = 'Bitte geben Sie eine gültige Anzahl ein.'; sync(); quantity.focus(); quantity.reportValidity(); return;
      }
      originalQuantity.value = quantity.value;
      const fromViewer = viewerHooks.isOpen?.();
      if (fromViewer && !form.checkValidity()) {
        viewerHooks.close?.(false); form.reportValidity(); return;
      }
      viewerHooks.prepare?.('add', location.href);
      form.requestSubmit(originalAdd);
      if (!root.isConnected) focusAfterRender(fromViewer ? '[data-product-image-open]' : '[data-context-add]');
    });
    const observer = new MutationObserver(scheduleSync);
    observer.observe(form, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','hidden','min','max','step','aria-busy']});
    [originalPrice, originalAvailability].filter(Boolean).forEach(element => observer.observe(element,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']}));
    sync();
    return {
      sync,
      releaseFocus() {
        const focused = document.activeElement;
        mirrors.forEach(mirror => mirror.close?.());
        let original;
        const colorMirror = mirrors.find(mirror => mirror.owns?.(focused));
        if (colorMirror) original = colorMirror.restoreFocus();
        else if (focused === quantity || focused?.closest('.product-context-quantity')) original = originalQuantity;
        else if (focused === add) original = originalAdd;
        else {
          const mirror = mirrors.find(mirror => mirror.select === focused);
          original = mirror?.entries.find(entry => entry.value === mirror.selected())?.control;
        }
        if (original?.tagName === 'OPTION') original = original.parentElement;
        (original || originalAdd)?.focus({preventScroll:true});
        if (preview.contains(document.activeElement) || mirrors.some(mirror => mirror.owns?.(document.activeElement))) originalQuantity.focus({preventScroll:true});
      },
      hasFocus() { return mirrors.some(mirror => mirror.owns?.(document.activeElement)); },
      close() { mirrors.forEach(mirror => mirror.close?.()); },
      destroy() { mirrors.forEach(mirror => mirror.close?.()); lifetime.abort(); observer.disconnect(); buttonPrice.remove(); }
    };
  };
  const bindViewer = (root, gallery, source, main, preview, overview, purchase, schedule) => {
    if (!main || typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return {isOpen:() => false, sync() {}, destroy() {}};
    const lifetime = new AbortController();
    const listen = (target, type, callback) => target.addEventListener(type, callback, {signal:lifetime.signal});
    const originalForm = overview.querySelector('[data-product-form], [data-add-form]');
    const model = preview.querySelector('.product-image-preview-copy strong')?.textContent.trim() || overview.querySelector('h1')?.textContent.trim() || 'Produkt';
    const contextName = preview.querySelector('.product-context-identity strong')?.textContent || model;
    const contextKind = root.dataset.productContextKind || '';
    const home = document.createComment('Product purchase bar'); preview.before(home);
    const opener = document.createElement('button');
    opener.type = 'button'; opener.className = 'product-image-open'; opener.setAttribute('data-product-image-open', '');
    opener.setAttribute('aria-label', `Bild von ${model} vergrössern`); opener.setAttribute('aria-haspopup', 'dialog');
    source.before(opener); opener.append(source);
    const hint = document.createElement('span'); hint.className = 'product-image-open-hint'; hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg> Vergrössern'; opener.append(hint);
    const dialog = document.createElement('dialog'); dialog.className = 'product-viewer'; dialog.setAttribute('data-product-viewer', '');
    const titleId = `ProductViewerTitle-${++nextViewerId}`;
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.innerHTML = `<div class="product-viewer-toolbar"><span>Produktbilder</span><span class="product-viewer-counter" aria-live="polite"></span><button class="product-viewer-close" data-viewer-close type="button" aria-label="Vollbild schliessen" autofocus><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div class="product-viewer-stage"><div class="product-viewer-image-area"><img class="product-viewer-image" data-viewer-image alt="" decoding="async"><button class="product-viewer-prev" data-viewer-prev type="button" aria-label="Vorheriges Produktbild"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m14 6-6 6 6 6"/></svg></button><button class="product-viewer-next" data-viewer-next type="button" aria-label="Nächstes Produktbild"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m10 6 6 6-6 6"/></svg></button></div><div class="product-viewer-thumbs" aria-label="Bildansichten"></div></div><div class="product-viewer-purchase"></div>`;
    const toolbarCopy = document.createElement('span'); toolbarCopy.className = 'product-context-toolbar-copy';
    const toolbarName = document.createElement('strong'); toolbarName.textContent = contextName;
    const toolbarKind = document.createElement('span'); toolbarKind.className = 'product-context-kind'; toolbarKind.textContent = contextKind; toolbarKind.hidden = !contextKind;
    toolbarCopy.append(toolbarName, toolbarKind);
    const desktopToolbarTitle = dialog.querySelector('.product-viewer-toolbar > span:first-child');
    desktopToolbarTitle.classList.add('product-viewer-desktop-title'); desktopToolbarTitle.before(toolbarCopy);
    const enlarged = dialog.querySelector('.product-viewer-image');
    const thumbs = dialog.querySelector('.product-viewer-thumbs');
    const counter = dialog.querySelector('.product-viewer-counter');
    const closeButton = dialog.querySelector('.product-viewer-close');
    const previous = dialog.querySelector('.product-viewer-prev'), next = dialog.querySelector('.product-viewer-next');
    const pane = dialog.querySelector('.product-viewer-purchase');
    const heading = document.createElement('div'); heading.className = 'product-viewer-heading';
    const eyebrow = document.createElement('span'); eyebrow.className = 'product-viewer-eyebrow'; eyebrow.textContent = 'Ihre Auswahl';
    const title = document.createElement('h2'); title.id = titleId; title.textContent = model;
    const color = document.createElement('span'); color.className = 'product-viewer-color';
    heading.append(eyebrow, title, color); preview.prepend(heading);
    root.append(dialog);
    let bodyOverflow = '', opened = false, currentIndex = 0, restoringFocus = false;
    const originalThumbs = [...gallery.querySelectorAll('[data-gallery-image], .gallery-thumb[data-image]')];
    const imageKey = value => { try { return new URL(value, location.href).pathname; } catch (_) { return value; } };
    const images = originalThumbs.map(button => ({button, image:button.querySelector('img'), key:imageKey(button.dataset.galleryImage || button.querySelector('img')?.src || '')}));
    const preload = window.upswingGalleryImagePreload?.create();
    const warmImages = () => {
      if (images.length < 2) return;
      const index = Math.max(0, images.findIndex(item => item.key === imageKey(source.getAttribute('src') || source.currentSrc)));
      preload?.warm([1, -1, 2].map(offset => (index + offset + images.length) % images.length).filter(position => position !== index).map(position => {
        const item = images[position];
        return item.button.dataset.galleryImage || item.image?.currentSrc || item.image?.src;
      }));
    };
    const thumbButtons = images.map((item, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'product-viewer-thumb'; button.setAttribute('data-viewer-thumbnail', '');
      button.setAttribute('aria-label', `Produktbild ${index + 1} ansehen`);
      const image = document.createElement('img'); image.src = item.image?.currentSrc || item.image?.src || source.src; image.alt = ''; image.loading = 'lazy';
      button.append(image); thumbs.append(button); listen(button, 'click', () => selectImage(index)); return button;
    });
    const sync = () => {
      const key = imageKey(source.getAttribute('src') || source.currentSrc);
      const index = images.findIndex(item => item.key === key);
      currentIndex = Math.max(0, index);
      const selected = images[index];
      const src = selected?.button.dataset.galleryImage || source.getAttribute('src') || source.currentSrc;
      if (src && enlarged.getAttribute('src') !== src) enlarged.src = src;
      enlarged.alt = source.alt;
      const label = preview.querySelector('[data-context-color]')?.textContent.trim() || '';
      color.textContent = label; color.hidden = !label;
      counter.textContent = images.length > 1 ? `${currentIndex + 1} / ${images.length}` : '1 / 1';
      thumbButtons.forEach((button, position) => {
        const active = position === currentIndex; button.classList.toggle('is-selected', active); button.setAttribute('aria-pressed', String(active));
      });
      previous.hidden = next.hidden = images.length < 2;
      thumbs.hidden = images.length < 2;
      if (opened) warmImages();
    };
    const selectImage = index => {
      if (!images.length) return;
      const target = (index + images.length) % images.length;
      images[target].button.click(); sync();
    };
    const finishClose = (restoreFocus = true) => {
      if (!opened) return;
      opened = false; preload?.clear(); purchase.close?.();
      home.after(preview); root.classList.remove('is-viewer-open');
      preview.setAttribute('aria-label', 'Produktauswahl und Warenkorb beim Lesen');
      document.body.style.overflow = bodyOverflow;
      schedule();
      if (restoreFocus && opener.isConnected) {
        restoringFocus = true; opener.focus({preventScroll:true}); restoringFocus = false;
      }
    };
    const close = (restoreFocus = true) => {
      if (!opened) return;
      if (dialog.open) dialog.close();
      finishClose(restoreFocus);
    };
    const open = () => {
      if (opened || !root.isConnected) return;
      purchase.close?.(); bodyOverflow = document.body.style.overflow;
      pane.append(preview); preview.hidden = false; preview.inert = false; preview.setAttribute('aria-hidden', 'false');
      preview.setAttribute('aria-label', 'Produktauswahl in der Vollbildansicht');
      root.classList.add('is-viewer-open'); opened = true; document.body.style.overflow = 'hidden';
      sync(); purchase.sync?.(); dialog.showModal(); closeButton.focus({preventScroll:true});
    };
    const prepare = (action, url, allowClosed = false) => {
      if ((!opened && !allowClosed) || !originalForm) return;
      const selections = [...originalForm.querySelectorAll('fieldset[data-option-group]')].map(group => {
        const control = group.querySelector('input:checked, select[data-option-select]');
        const name = group.dataset.optionName || group.querySelector('legend')?.firstChild?.textContent.trim();
        return {name, label:control?.tagName === 'SELECT' ? control.selectedOptions[0]?.textContent.trim() : control?.labels?.[0]?.textContent.trim()};
      }).filter(item => item.label && !/^(farbe|color|colour)$/i.test(item.name));
      saveContinuation({at:Date.now(),path:new URL(url, location.href).pathname,action,viewer:opened,index:action === 'color' ? 0 : currentIndex,selections,quantity:originalForm.querySelector('[name="quantity"]')?.value});
    };
    const resume = state => {
      if (!root.isConnected || !originalForm) return;
      let missingSelection = false, missingSize = false;
      if (Number(originalForm.dataset.highVariants) <= 250 || !originalForm.dataset.highVariants) {
        state.selections?.forEach(selection => {
          const group = [...originalForm.querySelectorAll('fieldset[data-option-group]')].find(group => (group.dataset.optionName || group.querySelector('legend')?.firstChild?.textContent.trim()) === selection.name);
          const control = group && [...group.querySelectorAll('input[type="radio"], select[data-option-select]')].find(control => control.tagName === 'SELECT' || control.labels?.[0]?.textContent.trim() === selection.label);
          const clearSelection = () => {
            missingSelection = true;
            missingSize ||= /gr(?:ö|o)(?:ss|ß)|size|pointure|misura/i.test(selection.name || '');
            group?.querySelectorAll('input[type="radio"], select[data-option-select]').forEach(input => {
              if (input.tagName === 'SELECT') {
                if (!input.querySelector('option[value=""]')) {
                  const placeholder = document.createElement('option');
                  placeholder.value = ''; placeholder.textContent = 'Bitte wählen'; placeholder.disabled = true;
                  input.prepend(placeholder);
                }
                input.value = '';
              } else input.checked = false;
            });
            const selectedLabel = group?.querySelector('[data-option-selected]');
            if (selectedLabel) selectedLabel.textContent = '';
            group?.querySelector('[data-option-select]')?.dispatchEvent(new Event('change', {bubbles:true}));
          };
          if (!control || control.disabled) { clearSelection(); return; }
          if (control.tagName === 'SELECT') {
            const option = [...control.options].find(option => option.textContent.trim() === selection.label && !option.disabled);
            if (!option) { clearSelection(); return; }
            control.value = option.value;
          } else control.checked = true;
          control.dispatchEvent(new Event('change', {bubbles:true}));
        });
      }
      if (missingSelection) {
        // A different colour can have a different size range. Never leave its
        // first variant purchasable in place of the size the customer chose.
        originalForm.querySelectorAll('[name="id"]').forEach(control => { control.value = ''; control.disabled = true; });
        const add = originalForm.querySelector('.enhanced-add-button, button[type="submit"]');
        if (add) add.disabled = true;
        const label = originalForm.querySelector('[data-add-label]');
        if (label) label.textContent = missingSize ? 'Bitte Schuhgrösse neu wählen' : 'Bitte Auswahl neu wählen';
        const sku = root.querySelector('[data-product-sku]');
        if (sku) sku.textContent = '';
        const skuRow = root.querySelector('[data-product-sku-row]');
        if (skuRow) skuRow.hidden = true;
        const availability = originalForm.querySelector('[data-product-availability]');
        if (availability) {
          availability.textContent = missingSize ? 'Die bisherige Schuhgrösse ist in dieser Farbe nicht verfügbar.' : 'Bitte wählen Sie eine passende Ausführung.';
          availability.dataset.deliveryStatus = 'unavailable'; availability.removeAttribute('data-delivery-variant');
          availability.setAttribute('aria-busy', 'false');
        }
      }
      const quantity = originalForm.querySelector('[name="quantity"]');
      if (quantity && state.quantity) {
        quantity.value = state.quantity;
        if (!quantity.checkValidity()) quantity.value = quantity.min || '1';
        quantity.dispatchEvent(new Event('input', {bubbles:true}));
      }
      if (state.index && images[state.index]) selectImage(state.index);
      purchase.sync?.();
      if (state.viewer === false) { schedule(); return; }
      const formError = originalForm.querySelector('[data-product-error]:not([hidden]), .errors')?.textContent.trim();
      if (state.action === 'add' && !formError) {
        // The original submission has succeeded and replaced the product view.
        // Keep its selection, but return to the page and its existing cart confirmation.
        schedule(); opener.focus({preventScroll:true}); return;
      }
      open();
    };
    listen(opener, 'click', open); listen(closeButton, 'click', () => close());
    listen(opener, 'pointerenter', warmImages); listen(opener, 'focus', () => { if (!restoringFocus) warmImages(); });
    listen(opener, 'pointerleave', () => { if (!opened) preload?.clear(); });
    listen(opener, 'blur', () => { if (!opened) preload?.clear(); });
    listen(dialog, 'cancel', event => { event.preventDefault(); close(); });
    listen(dialog, 'close', () => finishClose());
    listen(previous, 'click', () => selectImage(currentIndex - 1)); listen(next, 'click', () => selectImage(currentIndex + 1));
    listen(dialog, 'keydown', event => {
      if (event.defaultPrevented || event.target.closest('.product-viewer-purchase, .product-context-color-panel') || event.target.matches('input, select, textarea')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); selectImage(currentIndex + (event.key === 'ArrowLeft' ? -1 : 1)); }
    });
    return {isOpen:() => opened, open, close, sync, prepare, resume, destroy() {
      close(false); preload?.destroy(); lifetime.abort(); dialog.remove(); heading.remove(); home.remove();
      if (opener.isConnected) { opener.before(source); opener.remove(); }
    }};
  };
  const bind = () => {
    for (const [root, controller] of controllers) {
      if (!root.isConnected) { controller.destroy(); controllers.delete(root); }
    }
    document.querySelectorAll('[data-product-media-context]').forEach(root => {
      if (controllers.has(root)) return;
      const gallery = root.querySelector('[data-product-gallery-sticky]');
      const source = gallery?.querySelector('[data-product-image]');
      const overview = root.querySelector('[data-product-overview]');
      const primaryAdd = overview?.querySelector('.enhanced-add-button, #pdp-add') || overview?.querySelector('form button[type="submit"]');
      const preview = root.querySelector('[data-product-image-preview]');
      const image = preview?.querySelector('[data-context-image]');
      const button = preview?.querySelector('[data-image-preview-top]');
      const reading = root.querySelector('.product-policies') || root.querySelector('#ProductInformation');
      if (!gallery || !source || !overview || !preview || !image || !button || !reading) return;
      const header = document.querySelector('.site-header');
      const main = gallery.querySelector('.product-gallery-main');
      const color = preview.querySelector('[data-context-color]');
      const identity = document.createElement('div'); identity.className = 'product-context-identity';
      const modelName = preview.querySelector('.product-image-preview-copy strong')?.textContent.trim() || overview.querySelector('h1')?.textContent.trim() || 'Produkt';
      const brandName = root.dataset.productContextBrand || '';
      const identityName = document.createElement('strong');
      identityName.textContent = brandName && !modelName.toLocaleLowerCase().startsWith(brandName.toLocaleLowerCase()) ? brandName + ' ' + modelName : modelName;
      const identityKind = document.createElement('span'); identityKind.className = 'product-context-kind'; identityKind.textContent = root.dataset.productContextKind || ''; identityKind.hidden = !identityKind.textContent;
      identity.append(identityName, identityKind); preview.prepend(identity);
      let frame = 0, headerHeight = 150;
      const viewerHooks = {};
      const purchase = bindPurchase(root, preview, overview, viewerHooks);
      let viewer;
      root.classList.toggle('has-extra-media', !!root.querySelector('.product-extra-media'));
      gallery.tabIndex = -1;
      gallery.setAttribute('role', 'group');
      gallery.setAttribute('aria-label', 'Produktbilder');
      const syncImage = () => {
        const src = !source.complete ? source.getAttribute('src') : source.currentSrc || source.getAttribute('src');
        if (src && image.getAttribute('src') !== src) image.setAttribute('src', src);
        image.removeAttribute('srcset');
        image.removeAttribute('sizes');
        image.alt = source.alt;
        const nativeColor = [...root.querySelectorAll('[data-option-select]')].find(control =>
          /^options\[\s*(farbe|color|colour)\s*\]$/i.test(control.name) && (control.checked || control.tagName === 'SELECT'));
        if (color && nativeColor) { color.textContent = nativeColor.value; color.hidden = !nativeColor.value; }
        viewer?.sync();
      };
      const update = () => {
        frame = 0;
        if (viewer?.isOpen()) return;
        headerHeight = Math.max(0, Math.ceil(header?.getBoundingClientRect().bottom || 0));
        const offset = headerHeight + 12;
        root.style.setProperty('--product-media-offset', offset + 'px');
        const bounds = preview.parentElement.getBoundingClientRect();
        const containerStyle = getComputedStyle(preview.parentElement);
        const insetLeft = (parseFloat(containerStyle.paddingLeft) || 0) + (parseFloat(containerStyle.borderLeftWidth) || 0);
        const insetRight = (parseFloat(containerStyle.paddingRight) || 0) + (parseFloat(containerStyle.borderRightWidth) || 0);
        root.style.setProperty('--product-context-left', (bounds.left + insetLeft) + 'px');
        root.style.setProperty('--product-context-width', Math.max(0, bounds.width - insetLeft - insetRight) + 'px');
        const previewHeight = Math.ceil(preview.offsetHeight);
        const tooTall = (window.visualViewport?.height || window.innerHeight) - offset - previewHeight < 180;
        root.classList.toggle('is-context-too-tall', tooTall);
        root.style.setProperty('--product-context-available-height', Math.max(44, (window.visualViewport?.height || window.innerHeight) - offset - 12) + 'px');
        if (main && window.innerWidth > 900) {
          const overhead = gallery.offsetHeight - main.offsetHeight;
          const available = window.innerHeight - offset - overhead - 22;
          root.classList.toggle('is-gallery-too-tall', available < 200);
          root.style.setProperty('--product-gallery-main-max-height', Math.max(200, Math.floor(available)) + 'px');
        }
        const purchaseGone = (primaryAdd || overview).getBoundingClientRect().bottom <= headerHeight;
        let focused = preview.contains(document.activeElement) || purchase.hasFocus?.();
        if (!purchaseGone && focused) { purchase.releaseFocus?.(); focused = false; }
        const mobileDock = window.matchMedia('(max-width:600px)').matches;
        const active = purchaseGone && (mobileDock ||
          (reading.getBoundingClientRect().bottom > offset + previewHeight || focused) && (!tooTall || focused));
        preview.classList.toggle('is-active', active);
        preview.inert = !active;
        preview.setAttribute('aria-hidden', String(!active));
        if (!active) purchase.close?.();
        // Reserve the footer space before a direct jump to the end of the page.
        document.documentElement.style.setProperty('--product-mobile-dock-height', (mobileDock ? previewHeight : 0) + 'px');
        document.documentElement.style.setProperty('--product-page-scroll-offset', (offset + (active && !mobileDock ? previewHeight : 0) + 16) + 'px');
        root.style.setProperty('--product-context-anchor-clearance', (!mobileDock && !active && !tooTall ? previewHeight : 0) + 'px');
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
      const returnToGallery = () => {
        const target = root.querySelector('.product-gallery');
        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
        gallery.focus({preventScroll:true});
        window.scrollTo({top:Math.max(0, top),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      };
      const resize = new ResizeObserver(schedule);
      resize.observe(root); resize.observe(gallery); resize.observe(preview);
      if (primaryAdd) resize.observe(primaryAdd);
      if (header) resize.observe(header);
      const mutation = new MutationObserver(() => { syncImage(); schedule(); });
      mutation.observe(source,{attributes:true,attributeFilter:['src','srcset','alt']});
      source.addEventListener('load', syncImage);
      root.addEventListener('change', syncImage);
      preview.addEventListener('focusout', schedule);
      button.addEventListener('click', returnToGallery);
      window.addEventListener('scroll', schedule, {passive:true});
      window.addEventListener('resize', schedule, {passive:true});
      window.visualViewport?.addEventListener('resize', schedule, {passive:true});
      window.visualViewport?.addEventListener('scroll', schedule, {passive:true});
      preview.hidden = false;
      viewer = bindViewer(root, gallery, source, main, preview, overview, purchase, schedule);
      Object.assign(viewerHooks, {isOpen:viewer.isOpen, close:viewer.close, prepare:viewer.prepare});
      syncImage(); update();
      controllers.set(root,{prepareColor:url => viewer.prepare?.('color', url, true),destroy:() => {
        viewer.destroy(); purchase.destroy();
        identity.remove();
        resize.disconnect(); mutation.disconnect(); cancelAnimationFrame(frame);
        source.removeEventListener('load', syncImage); root.removeEventListener('change', syncImage);
        preview.removeEventListener('focusout', schedule); button.removeEventListener('click', returnToGallery);
        window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
        window.visualViewport?.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('scroll', schedule);
      }});
      window.upswingQuantity?.bind();
      const state = takeContinuation();
      if (state) queueMicrotask(() => viewer.resume?.(state));
    });
    if (!controllers.size) {
      document.documentElement.style.removeProperty('--product-page-scroll-offset');
      document.documentElement.style.removeProperty('--product-mobile-dock-height');
      if (!location.pathname.startsWith('/products/')) clearContinuation();
    }
  };
  const scheduleBind = () => {
    if (!pending) pending = requestAnimationFrame(() => { pending = 0; bind(); });
  };
  window.upswingProductMedia = {bind,prepareColor:(root,url) => controllers.get(root)?.prepareColor(url)};
  const start = () => {
    bind();
    new MutationObserver(scheduleBind).observe(document.body,{childList:true,subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
  document.addEventListener('shopify:section:load', scheduleBind);
  document.addEventListener('shopify:section:unload', scheduleBind);
})();
