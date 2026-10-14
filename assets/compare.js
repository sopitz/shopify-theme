/* An optional, entirely local comparison list. Purchasing stays on the product page. */
(() => {
  'use strict';
  if (window.__upswingCompareInitialized) return;
  window.__upswingCompareInitialized = true;

  const limit = 3;
  const storageKey = `upswing-compare-v1:${window.location.hostname}`;
  let opener = null;
  let storageAvailable = true;
  const element = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const safeURL = (value, image = false) => {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.origin);
      if (!['https:', 'http:'].includes(url.protocol)) return '';
      if (!image && url.origin !== window.location.origin) return '';
      return url.href;
    } catch (_) { return ''; }
  };
  const sanitize = item => {
    if (!item || typeof item.handle !== 'string' || !item.handle.trim()) return null;
    const url = safeURL(item.url);
    if (!url) return null;
    return {
      handle: item.handle.slice(0, 160),
      title: String(item.title || item.handle).slice(0, 250),
      price: String(item.price || '').slice(0, 90),
      image: safeURL(item.image, true),
      url,
      description: String(item.description || '').slice(0, 300)
    };
  };
  const readStorage = () => {
    let raw;
    try { raw = window.localStorage.getItem(storageKey); }
    catch (_) { storageAvailable = false; return []; }
    try {
      const saved = JSON.parse(raw || '[]');
      if (!Array.isArray(saved)) return [];
      return saved.map(sanitize).filter(Boolean).filter((item, index, all) => all.findIndex(other => other.handle === item.handle) === index).slice(0, limit);
    } catch (_) { return []; }
  };
  let items = readStorage();
  const save = () => {
    if (!storageAvailable) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(items)); }
    catch (_) { storageAvailable = false; }
  };

  const status = element('div', 'visually-hidden');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  document.body.append(status);
  const announce = value => {
    status.textContent = '';
    window.setTimeout(() => { status.textContent = value; }, 30);
  };

  const tray = element('div', 'compare-tray');
  tray.hidden = true;
  tray.setAttribute('role', 'region');
  tray.setAttribute('aria-label', 'Gemerkte Produkte vergleichen');
  const count = element('span');
  const openButton = element('button', 'button', 'Vergleichen');
  openButton.type = 'button';
  openButton.setAttribute('aria-haspopup', 'dialog');
  openButton.setAttribute('aria-controls', 'UpswingCompareDialog');
  const clearButton = element('button', 'icon-button', '×');
  clearButton.type = 'button';
  clearButton.setAttribute('aria-label', 'Vergleichsliste leeren');
  tray.append(count, openButton, clearButton);
  document.body.append(tray);

  const dialog = element('dialog', 'modal');
  dialog.id = 'UpswingCompareDialog';
  dialog.setAttribute('aria-labelledby', 'UpswingCompareTitle');
  dialog.setAttribute('aria-describedby', 'UpswingCompareHelp');
  const head = element('div', 'modal-head');
  const title = element('h2', '', 'Ihre Auswahl im Vergleich');
  title.id = 'UpswingCompareTitle';
  const closeButton = element('button', 'icon-button', '×');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Produktvergleich schliessen');
  head.append(title, closeButton);
  const body = element('div', 'modal-body');
  const help = element('p', '', 'Vergleichen Sie bis zu drei Produkte. Gemerkte Preise dienen zur Orientierung. Den aktuellen Preis, verfügbare Farben und Grössen finden Sie auf der jeweiligen Produktseite.');
  help.id = 'UpswingCompareHelp';
  const limitNote = element('p', 'notice', 'Ihre Vergleichsliste enthält bereits drei Produkte. Entfernen Sie eines, um ein anderes aufzunehmen.');
  limitNote.setAttribute('role', 'status');
  limitNote.hidden = true;
  const tableArea = element('div');
  tableArea.style.overflowX = 'auto';
  tableArea.style.marginTop = '20px';
  body.append(help, limitNote, tableArea);
  dialog.append(head, body);
  document.body.append(dialog);

  const restoreFocus = () => {
    const target = opener && opener.isConnected && !opener.closest('[hidden]') ? opener : document.querySelector('[data-compare]');
    if (target && !target.disabled) target.focus({ preventScroll: true });
    opener = null;
  };
  const close = () => {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else { dialog.removeAttribute('open'); restoreFocus(); }
  };
  closeButton.addEventListener('click', close);
  dialog.addEventListener('close', restoreFocus);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')].filter(control => !control.disabled && !control.hidden);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });

  const renderTable = () => {
    tableArea.replaceChildren();
    if (!items.length) { tableArea.append(element('p', '', 'Es sind keine Produkte mehr für den Vergleich gemerkt.')); return; }
    const table = element('table', 'compare-table');
    const caption = element('caption', 'visually-hidden', 'Produktname, gemerkter Preis und Kurzbeschreibung von bis zu drei Produkten');
    const thead = element('thead');
    const headerRow = element('tr');
    const corner = element('th', '', 'Produkt');
    corner.scope = 'col';
    headerRow.append(corner);
    items.forEach(item => {
      const cell = element('th');
      cell.scope = 'col';
      if (item.image) {
        const image = element('img');
        image.src = item.image;
        image.alt = item.title;
        image.width = 130;
        image.height = 100;
        image.loading = 'lazy';
        cell.append(image);
      }
      const heading = element('h3', '', item.title);
      cell.append(heading);
      headerRow.append(cell);
    });
    thead.append(headerRow);
    const tbody = element('tbody');
    const addRow = (label, content) => {
      const row = element('tr');
      const heading = element('th', '', label);
      heading.scope = 'row';
      row.append(heading);
      items.forEach(item => {
        const cell = element('td');
        const value = content(item);
        if (value instanceof Node) cell.append(value);
        else cell.textContent = value;
        row.append(cell);
      });
      tbody.append(row);
    };
    addRow('Gemerkter Preis', item => item.price || 'Auf der Produktseite');
    if (items.some(item => item.description)) addRow('Kurzbeschreibung', item => item.description || 'Details auf der Produktseite');
    addRow('Details & Auswahl', item => {
      const link = element('a', 'button small', 'Produkt ansehen');
      link.href = item.url;
      link.setAttribute('aria-label', `${item.title} ansehen`);
      return link;
    });
    addRow('Vergleichsliste', item => {
      const button = element('button', 'text-link', 'Entfernen');
      button.type = 'button';
      button.setAttribute('aria-label', `${item.title} aus dem Vergleich entfernen`);
      button.addEventListener('click', () => {
        limitNote.hidden = true;
        items = items.filter(other => other.handle !== item.handle);
        save(); render(); announce(`${item.title} aus dem Vergleich entfernt.`);
        if (!items.length) close();
        else closeButton.focus();
      });
      return button;
    });
    table.append(caption, thead, tbody);
    tableArea.append(table);
  };
  const render = () => {
    tray.hidden = items.length === 0;
    count.textContent = `${items.length} von ${limit} Produkten gemerkt`;
    openButton.setAttribute('aria-label', `${items.length} Produkte vergleichen`);
    document.querySelectorAll('[data-compare]').forEach(button => {
      const selected = items.some(item => item.handle === button.dataset.compare);
      const title = button.dataset.productTitle || button.dataset.compare;
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', selected ? `${title} aus dem Vergleich entfernen` : `${title} zum Vergleich merken`);
      button.classList.toggle('active', selected);
    });
    if (dialog.open) renderTable();
  };
  const itemFromButton = button => sanitize({
    handle: button.dataset.compare,
    title: button.dataset.productTitle,
    price: button.dataset.productPrice,
    image: button.dataset.productImage,
    url: button.dataset.productUrl,
    description: button.dataset.productDescription
  });
  const bind = (scope = document) => {
    let updated = false;
    scope.querySelectorAll('[data-compare]').forEach(button => {
      const fresh = itemFromButton(button);
      const existingIndex = items.findIndex(item => item.handle === fresh?.handle);
      if (fresh && existingIndex >= 0) { items[existingIndex] = fresh; updated = true; }
      if (button.dataset.compareBound) return;
      button.dataset.compareBound = 'true';
      button.addEventListener('click', () => {
        const item = itemFromButton(button);
        if (!item) return;
        if (items.some(other => other.handle === item.handle)) {
          items = items.filter(other => other.handle !== item.handle);
          announce(`${item.title} aus dem Vergleich entfernt.`);
        } else if (items.length >= limit) {
          announce('Sie können bis zu drei Produkte vergleichen. Entfernen Sie zuerst ein gemerktes Produkt.');
          limitNote.hidden = false;
          opener = button;
          renderTable();
          if (!dialog.open) {
            if (typeof dialog.showModal === 'function') dialog.showModal();
            else { dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('open', ''); }
          }
          closeButton.focus();
          return;
        } else {
          items.push(item);
          announce(`${item.title} zum Vergleich gemerkt. ${items.length} von ${limit} Produkten.`);
        }
        save(); render();
      });
    });
    if (updated) save();
    render();
  };
  openButton.addEventListener('click', () => {
    opener = openButton;
    limitNote.hidden = true;
    renderTable();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else { dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('open', ''); }
    closeButton.focus();
  });
  clearButton.addEventListener('click', () => {
    items = [];
    save(); render(); announce('Vergleichsliste geleert.');
    document.querySelector('[data-compare]')?.focus({ preventScroll: true });
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey) return;
    items = readStorage(); render();
  });
  document.addEventListener('shopify:section:load', event => bind(event.target));
  bind();
})();
