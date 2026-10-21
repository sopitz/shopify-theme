(() => {
  if (customElements.get('upswing-reviews')) return;

  const requests = new Map();

  // Share one request between header, service strip, cart and footer. A removed
  // editor section must not cancel a request that other placements still need.
  function summaryRequest(id) {
    if (requests.has(id)) return requests.get(id);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const request = fetch(`https://app.reviewsplugin.com/embed/${encodeURIComponent(id)}/json`, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    }).then(response => {
      if (!response.ok) throw new Error('Reviews unavailable');
      return response.json();
    }).then(data => {
      const businesses = Array.isArray(data?.bizs) ? data.bizs : [];
      const summary = businesses.find(business => business?.id === 'summary') || (businesses.length === 1 ? businesses[0] : null);
      if (!summary || !Array.isArray(summary.platform) || !summary.platform.includes('google')) throw new Error('No Google summary');
      const rating = Number(summary.rating);
      const count = Number(summary.total);
      if (!Number.isFinite(rating) || rating <= 0 || rating > 5 || !Number.isSafeInteger(count) || count < 1) throw new Error('Invalid summary');
      return {rating, count, brand: data.brand};
    }).catch(() => {
      requests.delete(id);
      return null;
    }).finally(() => clearTimeout(timeout));
    requests.set(id, request);
    return request;
  }

  // Reuse the shop's existing ReviewsPlugin summary, including all locations.
  // The filtered review list is not a source for the aggregate rating or count.
  class UpswingReviews extends HTMLElement {
    connectedCallback() {
      if (this.loaded || this.observer || this.loading) return;
      this.generation = (this.generation || 0) + 1;
      if (!('IntersectionObserver' in window)) return void this.load();
      this.observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        this.observer.disconnect();
        this.observer = null;
        this.load();
      }, {rootMargin: '300px 0px'});
      this.observer.observe(this);
    }

    disconnectedCallback() {
      this.observer?.disconnect();
      this.observer = null;
      this.generation = (this.generation || 0) + 1;
      this.loading = false;
    }

    async load() {
      const id = (this.dataset.widgetId || '').trim();
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || this.loaded || this.loading) return;
      this.loading = true;
      const generation = this.generation;
      try {
        const data = await summaryRequest(id);
        if (!data || !this.isConnected || this.generation !== generation) return;
        const {rating, count} = data;
        const score = rating.toLocaleString('de-CH', {minimumFractionDigits: 1, maximumFractionDigits: 1}).replace('.', ',');
        const countText = `${count.toLocaleString('de-CH')} ${count === 1 ? 'Bewertung' : 'Bewertungen'} auf Google`;
        this.querySelector('[data-review-score]').textContent = score;
        this.querySelector('[data-review-label]').textContent = `${score} von 5 Sternen`;
        this.querySelector('[data-review-stars]').style.width = `${rating / 5 * 100}%`;
        this.querySelector('[data-review-count]').textContent = countText;
        this.querySelector('[data-review-count]').hidden = false;
        this.querySelector('[data-review-rating]').hidden = false;
        const fallback = this.querySelector('[data-review-fallback]');
        if (fallback) fallback.hidden = true;
        // Keep attribution whenever the provider requires it.
        this.querySelector('[data-review-attribution]').hidden = data.brand === false;
        this.loaded = true;
      } catch {
        // Keep the useful Google link if the service is unavailable or blocked.
      } finally {
        if (this.generation === generation) this.loading = false;
      }
    }
  }

  customElements.define('upswing-reviews', UpswingReviews);
})();
