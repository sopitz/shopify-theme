/* Progressive enhancement of Shopify's locale-aware Predictive Search section. */
(() => {
  const requestURL = (endpoint, query, origin) => {
    const url = new URL(endpoint, origin);
    if (url.origin !== new URL(origin).origin || !['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid search endpoint');
    url.searchParams.set('q', query.trim());
    url.searchParams.set('section_id', 'predictive-search');
    url.searchParams.set('resources[type]', 'product,query,collection,page,article');
    url.searchParams.set('resources[limit]', '8');
    url.searchParams.set('resources[limit_scope]', 'all');
    url.searchParams.set('resources[options][unavailable_products]', 'last');
    return url.href;
  };
  const optionIndex = (current, direction, total) => {
    if (!total) return -1;
    if (current < 0) return direction < 0 ? total - 1 : 0;
    return (current + direction + total) % total;
  };
  const safeResourceURL = (value, origin, image = false) => {
    try {
      const url = new URL(value, origin);
      if (!['https:', 'http:'].includes(url.protocol)) return false;
      return image ? url.protocol === 'https:' || url.origin === new URL(origin).origin : url.origin === new URL(origin).origin;
    } catch (_) { return false; }
  };
  const safeResults = (markup, origin, ownerDocument) => {
    const parsed = new DOMParser().parseFromString(markup, 'text/html');
    const results = parsed.querySelector('#shopify-section-predictive-search [data-predictive-results]');
    if (!results) throw new Error('Missing predictive search section');
    results.querySelectorAll('script,style,iframe,object,embed,form,input,button').forEach(node => node.remove());
    [results, ...results.querySelectorAll('*')].forEach(node => {
      [...node.attributes].forEach(attribute => {
        const name = attribute.name.toLowerCase();
        if (name.startsWith('on') || ['style', 'srcdoc', 'srcset'].includes(name)) node.removeAttribute(attribute.name);
      });
      if (node.hasAttribute('href') && !safeResourceURL(node.getAttribute('href'), origin)) node.removeAttribute('href');
      if (node.hasAttribute('src') && !safeResourceURL(node.getAttribute('src'), origin, true)) node.removeAttribute('src');
    });
    return ownerDocument.importNode(results, true);
  };

  class PredictiveSearch extends HTMLElement {
    connectedCallback() {
      if (this.lifetime) return;
      this.input = this.querySelector('[data-predictive-input]');
      this.panel = this.querySelector('[data-predictive-panel]');
      this.status = this.querySelector('[data-predictive-status]');
      this.form = this.querySelector('form');
      if (!this.input || !this.panel || !this.form || !this.dataset.searchUrl) return;
      this.lifetime = new AbortController();
      this.revision = 0;
      this.timer = 0;
      this.cache = new Map();
      this.currentQuery = '';
      this.options = [];
      this.activeIndex = -1;
      this.isComposing = false;
      this.input.setAttribute('role', 'combobox');
      this.input.setAttribute('aria-autocomplete', 'list');
      this.input.setAttribute('aria-haspopup', 'listbox');
      this.input.setAttribute('aria-expanded', 'false');
      this.input.setAttribute('aria-controls', this.panel.id);
      const listen = (target, event, callback) => target.addEventListener(event, callback, { signal: this.lifetime.signal });
      listen(this.input, 'input', () => { if (!this.isComposing) this.schedule(); });
      listen(this.input, 'compositionstart', () => { this.isComposing = true; this.cancel(); this.close(); });
      listen(this.input, 'compositionend', () => { this.isComposing = false; this.schedule(); });
      listen(this.input, 'focus', () => this.schedule());
      listen(this.input, 'keydown', event => this.onKeyDown(event));
      listen(this.form, 'submit', () => { this.cancel(); this.close(); });
      listen(this, 'focusout', () => {
        window.clearTimeout(this.focusTimer);
        this.focusTimer = window.setTimeout(() => {
          if (!this.contains(document.activeElement)) { this.cancel(); this.close(); }
        }, 0);
      });
      listen(this, 'keydown', event => {
        if (event.key === 'Escape' && !this.panel.hidden) {
          event.preventDefault();
          event.stopPropagation();
          this.input.focus(); this.cancel(); this.close();
        }
      });
      listen(this.panel, 'pointermove', event => {
        const option = event.target.closest('[data-predictive-option]');
        if (option && this.panel.contains(option)) this.select(this.options.indexOf(option), false);
      });
      listen(this.panel, 'click', event => {
        if (event.target.closest('a[href]')) { this.cancel(); this.close(); }
      });
      listen(document, 'pointerdown', event => {
        if (!this.contains(event.target)) { this.cancel(); this.close(); }
      });
    }

    disconnectedCallback() {
      this.cancel();
      window.clearTimeout(this.focusTimer);
      this.lifetime?.abort();
      this.lifetime = null;
    }

    announce(message) { if (this.status) this.status.textContent = message || ''; }
    cancel() {
      window.clearTimeout(this.timer);
      this.request?.abort();
      this.request = null;
      this.revision = (this.revision || 0) + 1;
      this.input?.removeAttribute('aria-busy');
    }

    schedule() {
      this.cancel();
      const query = this.input.value.trim();
      this.close();
      if (query.length < 2 || this.isComposing) return;
      const revision = this.revision;
      this.timer = window.setTimeout(() => this.load(query, revision), 240);
    }

    async load(query, revision) {
      if (revision !== this.revision || !this.contains(document.activeElement)) return;
      const cacheKey = query.toLocaleLowerCase();
      this.input.setAttribute('aria-busy', 'true');
      this.announce(this.dataset.loadingLabel);
      const request = new AbortController();
      this.request = request;
      try {
        let markup = this.cache.get(cacheKey);
        if (!markup) {
          const response = await fetch(requestURL(this.dataset.searchUrl, query, window.location.origin), { signal: request.signal, credentials: 'same-origin', headers: { Accept: 'text/html' } });
          if (!response.ok) throw new Error(`Search unavailable: ${response.status}`);
          markup = await response.text();
        }
        if (revision !== this.revision || request.signal.aborted || this.input.value.trim() !== query || !this.contains(document.activeElement)) return;
        const results = safeResults(markup, window.location.origin, document);
        this.panel.replaceChildren(results);
        this.options = [...this.panel.querySelectorAll('[data-predictive-option]')].filter(option => option.querySelector('a[href]'));
        if (!this.options.length) throw new Error('Missing search result links');
        this.options.forEach((option, index) => { option.id = `${this.panel.id}-Option-${index}`; });
        results.id = `${this.panel.id}-Listbox`;
        this.input.setAttribute('aria-controls', results.id);
        this.currentQuery = query;
        this.cache.set(cacheKey, markup);
        if (this.cache.size > 10) this.cache.delete(this.cache.keys().next().value);
        this.open();
        const count = Number(results.dataset.resultCount) || 0;
        this.announce(count ? `${count} ${this.dataset.resultsLabel || 'Suchvorschläge verfügbar.'}` : 'Keine direkten Suchvorschläge. Im gesamten Shop suchen.');
      } catch (error) {
        if (revision !== this.revision || request.signal.aborted) return;
        this.close();
        this.announce(this.dataset.errorLabel);
      } finally {
        if (revision === this.revision) { this.input.removeAttribute('aria-busy'); this.request = null; }
      }
    }

    open() { this.panel.hidden = false; this.input.setAttribute('aria-expanded', 'true'); this.activeIndex = -1; }
    close() {
      if (!this.panel || !this.input) return;
      this.panel.hidden = true;
      this.input.setAttribute('aria-expanded', 'false');
      this.input.removeAttribute('aria-activedescendant');
      this.options?.forEach(option => option.setAttribute('aria-selected', 'false'));
      this.activeIndex = -1;
      this.announce('');
    }
    select(index, scroll = true) {
      this.options.forEach((option, position) => option.setAttribute('aria-selected', String(position === index)));
      this.activeIndex = index;
      const option = this.options[index];
      if (!option) { this.input.removeAttribute('aria-activedescendant'); return; }
      this.input.setAttribute('aria-activedescendant', option.id);
      if (scroll) option.scrollIntoView({ block: 'nearest' });
    }
    onKeyDown(event) {
      if (this.isComposing || event.isComposing) return;
      if (event.key === 'Escape' && !this.panel.hidden) {
        event.preventDefault(); event.stopPropagation(); this.cancel(); this.close(); return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (this.panel.hidden || !this.options.length) return;
        event.preventDefault();
        this.select(optionIndex(this.activeIndex, event.key === 'ArrowUp' ? -1 : 1, this.options.length));
      } else if (event.key === 'Enter' && !this.panel.hidden && this.activeIndex >= 0) {
        const link = this.options[this.activeIndex]?.querySelector('a[href]');
        if (link) { event.preventDefault(); link.click(); }
      }
    }
  }

  if (typeof module === 'object' && module.exports) module.exports = { requestURL, optionIndex, safeResourceURL, safeResults, PredictiveSearch };
  if (typeof customElements !== 'undefined' && !customElements.get('upswing-predictive-search')) customElements.define('upswing-predictive-search', PredictiveSearch);
})();
