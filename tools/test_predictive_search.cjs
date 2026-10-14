/* Portable behavioural checks, no browser package or store credentials required. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

class Element {
  constructor() { this.attrs = new Map(); this.dataset = {}; this.children = []; this.listeners = new Map(); this.hidden = true; this.value = ''; this.id = ''; this.textContent = ''; }
  get attributes() { return [...this.attrs].map(([name, value]) => ({ name, value })); }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  hasAttribute(name) { return this.attrs.has(name); }
  removeAttribute(name) { this.attrs.delete(name); }
  addEventListener(type, callback, options = {}) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(callback); this.listeners.set(type, listeners);
    options.signal?.addEventListener('abort', () => this.listeners.set(type, (this.listeners.get(type) || []).filter(entry => entry !== callback)), { once: true });
  }
  emit(type, detail = {}) { for (const callback of this.listeners.get(type) || []) callback({ target: this, ...detail }); }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  querySelector(selector) {
    if (this.selectors?.[selector]) return this.selectors[selector];
    if (selector === 'a[href]') return this.children.find(child => child.hasAttribute('href')) || null;
    return null;
  }
  querySelectorAll(selector) {
    if (this.selectorAll?.[selector]) return this.selectorAll[selector];
    if (selector === '[data-predictive-option]') return this.children.flatMap(child => child.options || []);
    if (selector === '*') return this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
    return [];
  }
  replaceChildren(...children) { this.children = children; }
  scrollIntoView() { this.scrolled = true; }
  click() { this.clicked = true; }
  remove() { this.removed = true; }
}

function fixture() {
  const document = new Element();
  document.activeElement = null;
  document.importNode = node => node;
  let nextTimer = 0;
  const timers = new Map();
  const deferred = [];
  const parsings = new Map();
  const window = { location: { origin: 'https://upswing.ch' }, setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); } };
  const sandbox = {
    HTMLElement: Element, document, window, AbortController, URL, Map, module: { exports: {} },
    DOMParser: class { parseFromString(markup) { return { querySelector: () => parsings.get(markup) || null }; } },
    fetch(url, options) { return new Promise((resolve, reject) => deferred.push({ url, options, resolve, reject })); }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/predictive-search.js'), 'utf8'), sandbox);
  const api = sandbox.module.exports;
  const widget = new api.PredictiveSearch();
  const input = new Element(), panel = new Element(), status = new Element(), form = new Element();
  panel.id = 'Search-Header-Results';
  widget.children = [input, panel, form, status];
  widget.selectors = { '[data-predictive-input]': input, '[data-predictive-panel]': panel, '[data-predictive-status]': status, form };
  widget.dataset = { searchUrl: '/fr/search/suggest', loadingLabel: 'Laden', resultsLabel: 'Suchvorschläge verfügbar.', errorLabel: 'Weiter mit Enter suchen.' };
  widget.connectedCallback();
  document.activeElement = input;
  return {
    api, widget, input, panel, status, form, document, deferred, timers,
    flushTimers() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); },
    result(markup, count = 2) {
      const result = new Element(); result.dataset.resultCount = String(count);
      result.options = Array.from({ length: count || 1 }, (_, index) => {
        const option = new Element(), link = new Element(); link.setAttribute('href', `/fr/products/shoe-${index}`); option.children = [link]; return option;
      });
      result.children = result.options;
      parsings.set(markup, result);
      return result;
    },
    async resolve(index, markup, status = 200) {
      deferred[index].resolve({ ok: status === 200, status, text: async () => markup });
      await new Promise(resolve => setImmediate(resolve));
    }
  };
}

test('uses locale route, encoded query and documented API parameters only', () => {
  const { api } = fixture();
  const url = new URL(api.requestURL('/fr/search/suggest', ' Aarau & <blue> ', 'https://upswing.ch'));
  assert.equal(url.pathname, '/fr/search/suggest');
  assert.equal(url.searchParams.get('q'), 'Aarau & <blue>');
  assert.equal(url.searchParams.get('section_id'), 'predictive-search');
  assert.equal(url.searchParams.get('resources[limit_scope]'), 'all');
  assert.equal(url.searchParams.has('filter.p.m.upswing.model_primary'), false);
  assert.throws(() => api.requestURL('https://other.example/search', 'shoe', 'https://upswing.ch'));
});

test('debounces typing and leaves short/empty search as a regular form', async () => {
  const f = fixture();
  f.input.value = 'a'; f.input.emit('input'); f.flushTimers();
  assert.equal(f.deferred.length, 0);
  f.input.value = 'aar'; f.input.emit('input');
  f.input.value = 'aarau'; f.input.emit('input');
  assert.equal(f.timers.size, 1);
  f.flushTimers(); assert.equal(f.deferred.length, 1);
  assert.equal(new URL(f.deferred[0].url).searchParams.get('q'), 'aarau');
  f.input.value = ''; f.input.emit('input');
  assert.equal(f.deferred[0].options.signal.aborted, true);
  f.result('late'); await f.resolve(0, 'late');
  assert.equal(f.panel.hidden, true);
});

test('late older requests cannot overwrite newer search results', async () => {
  const f = fixture();
  f.input.value = 'aar'; f.input.emit('input'); f.flushTimers();
  f.input.value = 'aarau'; f.input.emit('input'); f.flushTimers();
  assert.equal(f.deferred[0].options.signal.aborted, true);
  const newest = f.result('new', 3); f.result('old', 1);
  await f.resolve(1, 'new'); await f.resolve(0, 'old');
  assert.equal(f.panel.children[0], newest);
  assert.equal(f.input.getAttribute('aria-expanded'), 'true');
  assert.match(f.status.textContent, /^3 /);
});

test('keyboard navigation wraps, Enter follows a result, Escape closes', async () => {
  const f = fixture(); f.input.value = 'aarau'; f.input.emit('input'); f.flushTimers();
  const results = f.result('results', 2); await f.resolve(0, 'results');
  let prevented = 0;
  const key = value => f.input.emit('keydown', { key: value, preventDefault() { prevented++; }, stopPropagation() {} });
  key('ArrowUp'); assert.equal(f.widget.activeIndex, 1);
  key('ArrowDown'); assert.equal(f.widget.activeIndex, 0);
  assert.equal(f.input.getAttribute('aria-activedescendant'), results.options[0].id);
  key('Enter'); assert.equal(results.options[0].children[0].clicked, true);
  key('Escape'); assert.equal(f.panel.hidden, true);
  assert.equal(f.input.getAttribute('aria-activedescendant'), null);
  assert.equal(prevented, 4);
  key('Enter'); assert.equal(prevented, 4); // Native form submission is not intercepted.
});

test('focus loss and network errors keep native search usable without reopening', async () => {
  const f = fixture(); f.input.value = 'aarau'; f.input.emit('input'); f.flushTimers();
  f.document.activeElement = new Element(); f.widget.emit('focusout'); f.flushTimers();
  f.result('blur'); await f.resolve(0, 'blur'); assert.equal(f.panel.hidden, true);
  f.document.activeElement = f.input; f.input.emit('focus'); f.flushTimers();
  await f.resolve(1, '', 429);
  assert.equal(f.panel.hidden, true); assert.equal(f.input.hasAttribute('aria-busy'), false);
  assert.equal(f.status.textContent, 'Weiter mit Enter suchen.');
});

test('IME composition is not searched until complete; disconnect aborts and removes listeners', () => {
  const f = fixture(); f.input.value = 'あ'; f.input.emit('compositionstart'); f.input.emit('input'); f.flushTimers();
  assert.equal(f.deferred.length, 0);
  f.input.value = 'ああ'; f.input.emit('compositionend'); f.flushTimers();
  assert.equal(f.deferred.length, 1);
  f.widget.disconnectedCallback();
  assert.equal(f.deferred[0].options.signal.aborted, true);
  f.input.emit('input'); f.flushTimers(); assert.equal(f.deferred.length, 1);
});

test('server result import rejects scripts/event handlers and unsafe links', () => {
  const f = fixture(), result = f.result('unsafe', 1);
  const script = new Element();
  result.selectorAll = { 'script,style,iframe,object,embed,form,input,button': [script] };
  const link = result.options[0].children[0];
  link.setAttribute('href', 'javascript:alert(1)'); link.setAttribute('onclick', 'alert(1)');
  const imported = f.api.safeResults('unsafe', 'https://upswing.ch', f.document);
  assert.equal(imported, result); assert.equal(link.hasAttribute('href'), false); assert.equal(link.hasAttribute('onclick'), false);
  assert.equal(script.removed, true);
  assert.equal(f.api.safeResourceURL('//other.example/product', 'https://upswing.ch'), false);
  assert.equal(f.api.safeResourceURL('https://cdn.shopify.com/image.jpg', 'https://upswing.ch', true), true);
  assert.equal(f.api.safeResourceURL('data:image/svg+xml,unsafe', 'https://upswing.ch', true), false);
  assert.throws(() => f.api.safeResults('missing', 'https://upswing.ch', f.document));
});

test('empty results retain a usable search-all option and successful responses are cached', async () => {
  const f = fixture(); f.input.value = 'unknown'; f.input.emit('input'); f.flushTimers();
  f.result('empty', 0); await f.resolve(0, 'empty');
  assert.equal(f.panel.hidden, false); assert.equal(f.widget.options.length, 1);
  assert.match(f.status.textContent, /Keine direkten Suchvorschläge/);
  f.widget.close(); f.input.emit('focus'); f.flushTimers();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.deferred.length, 1); assert.equal(f.panel.hidden, false);
});

test('desktop and mobile IDs remain distinct and both forms retain Shopify search action', () => {
  const repo = path.join(__dirname, '..');
  const header = fs.readFileSync(path.join(repo, 'sections/header.liquid'), 'utf8');
  const snippet = fs.readFileSync(path.join(repo, 'snippets/predictive-search-form.liquid'), 'utf8');
  assert.match(header, /id: 'HeaderSearch'/); assert.match(header, /id: 'MobileSearch'/);
  assert.match(snippet, /action="\{\{ routes\.search_url \}\}" method="get"/);
  assert.match(snippet, /routes\.predictive_search_url/);
  assert.match(snippet, /name="q"/);
  assert.match(snippet, /filter\.p\.m\.upswing\.model_primary/);
});
