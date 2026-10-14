/* Native Shopify recommendations; never substitute arbitrary catalogue items. */
(() => {
  if (customElements.get('product-recommendations')) return;
  const productId = value => /^[1-9]\d*$/.test(String(value || '')) ? String(value) : '';
  const currentProductId = () => productId(document.querySelector('[data-product-section] [data-product-form][data-product-id]')?.dataset.productId);
  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      if (this._connected) return;
      this._connected = true;
      this._loadedId = '';
      this._loadingId = '';
      this._visible = false;
      this._sequence = 0;
      this._onSectionLoad = event => {
        if (!(event.target instanceof Element) || !(event.target.matches('[data-product-section]') || event.target.querySelector('[data-product-section]'))) return;
        this._setProduct(currentProductId());
      };
      document.addEventListener('shopify:section:load', this._onSectionLoad);
      this._onPageHide = () => {this._sequence++;this._request?.abort();this._request=null;this._loadingId='';this.removeAttribute('aria-busy');};
      this._onPageShow = () => {if (this.isConnected && this._visible) this._load();};
      window.addEventListener('pagehide',this._onPageHide);
      window.addEventListener('pageshow',this._onPageShow);
      this._id = productId(this.dataset.productId);
      const currentId = currentProductId();
      if (currentId && currentId !== this._id) {this._id=currentId;this.dataset.productId=currentId;this.replaceChildren();}
      if (this.querySelector('[data-recommendations-content] [data-product-card]')) this._loadedId=this._id;
      if (typeof window.IntersectionObserver === 'function') {
        this._observer = new IntersectionObserver(entries => {
          const entry = entries.find(item => item.target === this);
          if (!entry) return;
          this._visible = entry.isIntersecting;
          if (this._visible) this._load();
        },{rootMargin:'300px 0px'});
        this._observer.observe(this);
      } else {this._visible=true;this._load();}
    }
    disconnectedCallback() {
      this._connected=false;
      this._sequence++;
      this._request?.abort();this._request=null;this._loadingId='';
      this._observer?.disconnect();this._observer=null;
      document.removeEventListener('shopify:section:load',this._onSectionLoad);
      window.removeEventListener('pagehide',this._onPageHide);
      window.removeEventListener('pageshow',this._onPageShow);
    }
    _setProduct(id) {
      if (id === this._id) return;
      this._sequence++;
      this._request?.abort();this._request=null;
      this._id=id;this.dataset.productId=id;
      this._loadedId='';this._loadingId='';
      this.replaceChildren();this.removeAttribute('aria-busy');
      delete this.dataset.recommendationState;
      if (this._visible) this._load();
    }
    async _load() {
      const id=this._id;
      if (!id || !this.isConnected || this._loadedId === id || this._loadingId === id) return;
      let url;
      try {
        url=new URL(this.dataset.url,location.origin);
        if (url.origin !== location.origin || !/\/recommendations\/products$/.test(url.pathname) || !this.dataset.sectionId) return;
        url.searchParams.set('product_id',id);
        url.searchParams.set('section_id',this.dataset.sectionId);
        url.searchParams.set('limit','4');
        url.searchParams.set('intent','related');
      } catch (_) {return;}
      const controller=new AbortController();this._request=controller;this._loadingId=id;
      const sequence=++this._sequence;
      const isCurrent=()=>this.isConnected && !controller.signal.aborted && this._sequence === sequence && this._id === id;
      this.setAttribute('aria-busy','true');
      this.dataset.recommendationState='loading';
      try {
        const response=await fetch(url,{signal:controller.signal,credentials:'same-origin',redirect:'error',headers:{Accept:'text/html'}});
        if (!response.ok) throw new Error('Recommendations unavailable');
        const parsed=new DOMParser().parseFromString(await response.text(),'text/html');
        const result=[...parsed.querySelectorAll('product-recommendations[data-recommendations]')].find(element=>element.dataset.productId === id && element.dataset.sectionId === this.dataset.sectionId);
        if (!result) throw new Error('Unexpected recommendation context');
        const content=result.querySelector('[data-recommendations-content]');
        const cards=content?.querySelectorAll('[data-product-card]');
        if (content && [...content.querySelectorAll('script')].some(script=>!['application/json','application/ld+json'].includes(script.type))) throw new Error('Unsupported recommendation script');
        if (!isCurrent()) return;
        this._loadedId=id;
        if (!content || !cards?.length) {this.replaceChildren();this.dataset.recommendationState='empty';return;}
        // Native card HTML retains Shopify's recommendation tracking URLs,
        // prices, colour metafields and shared equal-height grid tracks.
        const incoming=document.importNode(content,true);
        this.replaceChildren(incoming);
        this.dataset.recommendationState='ready';
        incoming.dispatchEvent(new CustomEvent('shopify:section:load',{bubbles:true,detail:{sectionId:this.dataset.sectionId}}));
        window.upswingLegacyColors?.bind();window.upswingQuantity?.bind();
      } catch (error) {
        if (isCurrent() && error.name !== 'AbortError') {this._loadedId=id;this.replaceChildren();this.dataset.recommendationState='empty';}
      } finally {
        if (this._request === controller) {this._request=null;this._loadingId='';this.removeAttribute('aria-busy');}
      }
    }
  }
  customElements.define('product-recommendations',ProductRecommendations);
})();
