const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const {Liquid} = require('liquidjs');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'assets/customer-reviews.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'sections/footer.liquid'), 'utf8');
const schema = JSON.parse(source.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
const defaults = Object.fromEntries(schema.settings.filter(setting => 'default' in setting).map(setting => [setting.id, setting.default]));
const reviewDefaults = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(root, 'config/settings_schema.json'), 'utf8')).find(group => group.name === 'Google-Bewertungen').settings.filter(setting => 'default' in setting).map(setting => [setting.id, setting.default]));
const tick = () => new Promise(resolve => setImmediate(resolve));
async function markup(settings = {}, {type = 'footer', globals = {}} = {}) {
  const liquid = new Liquid({root: path.join(root, 'snippets'), extname: '.liquid', strictFilters: true});
  liquid.registerFilter('asset_url', value => `/assets/${value}`);
  liquid.registerFilter('stylesheet_tag', value => `<link rel="stylesheet" href="${value}">`);
  liquid.registerFilter('payment_type_svg_tag', () => '');
  liquid.registerFilter('image_url', image => image?.src || '');
  liquid.registerFilter('image_tag', url => `<img src="${url}">`);
  liquid.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
  liquid.registerFilter('money_with_currency', value => `CHF ${(Number(value || 0) / 100).toFixed(2)}`);
  liquid.registerFilter('handleize', value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  const sectionSource = type === 'footer' ? source : fs.readFileSync(path.join(root, `sections/${type}.liquid`), 'utf8');
  const sectionSchema = JSON.parse(sectionSource.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
  const sectionDefaults = Object.fromEntries(sectionSchema.settings.filter(setting => 'default' in setting).map(setting => [setting.id, setting.default]));
  const context = {section: {id: 'preview', settings: {...sectionDefaults, ...settings}, blocks: []}, routes: {root_url: '/', cart_url: '/cart', all_products_collection_url: '/collections/all'}, shop: {name: 'upswing'}, cart: {item_count: 1, items: [], total_price: 10000, items_subtotal_price: 10000}, settings: {}, request: {design_mode: false}, ...globals};
  return liquid.parseAndRender(sectionSource.replace(/{% schema %}[\s\S]*?{% endschema %}/, ''), context, {globals: context});
}
async function fixture({observer = true, settings, html} = {}) {
  const dom = new JSDOM(html ?? await markup(settings), {url: 'https://upswing.ch/', runScripts: 'outside-only'});
  const {window} = dom, requests = [], observers = [];
  if (observer) window.IntersectionObserver = class {
    constructor(callback, options) {this.callback = callback; this.options = options; observers.push(this);}
    observe(target) {this.target = target;}
    disconnect() {this.disconnected = true;}
    fire(visible = true) {this.callback([{target: this.target, isIntersecting: visible}]);}
  };
  window.fetch = (url, init) => new Promise((resolve, reject) => requests.push({url, init, resolve, reject}));
  window.eval(script);
  return {dom, window, requests, observers, host: window.document.querySelector('upswing-reviews'),
    async reply(data, ok = true) {requests.at(-1).resolve({ok, json: async () => data}); await tick();},
    close() {dom.window.close();}};
}
const payload = (rating = '4.6', total = 222, extra = {}) => ({bizs: [{id: 'summary', rating, total, platform: ['google']}], reviews: [{rating: 5}], brand: false, ...extra});

test('footer provides a useful link without JavaScript and respects the disable switch', async () => {
  const dom = new JSDOM(await markup());
  const document = dom.window.document;
  assert.equal(document.querySelector('[data-review-rating]').hidden, true);
  assert.equal(document.querySelector('[data-review-count]').textContent, 'Kundenbewertungen auf Google');
  assert.equal(document.querySelector('.customer-reviews-link').href, 'https://share.google/rq63tyE1ku834ANfK');
  const disabled = await markup({show_reviews: false});
  assert.doesNotMatch(disabled, /upswing-reviews|customer-reviews\.(?:js|css)/);
  assert.match(disabled, /site-footer/);
  const custom = new JSDOM(await markup({reviews_url: 'https://www.google.com/maps?cid=123&hl=de'}));
  assert.equal(custom.window.document.querySelector('.customer-reviews-link').href, 'https://www.google.com/maps?cid=123&hl=de');
  dom.window.close(); custom.window.close();
});

test('loads the existing aggregate near the viewport, with accurate fractional stars and no filtered-review calculation', async () => {
  const f = await fixture();
  try {
    assert.equal(f.requests.length, 0);
    assert.equal(f.observers[0].options.rootMargin, '300px 0px');
    f.observers[0].fire(false);
    assert.equal(f.requests.length, 0);
    f.observers[0].fire();
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].url, `https://app.reviewsplugin.com/embed/${reviewDefaults.reviews_widget_id}/json`);
    assert.equal(f.requests[0].init.credentials, 'omit');
    await f.reply(payload());
    assert.equal(f.host.querySelector('[data-review-score]').textContent, '4,6');
    assert.equal(f.host.querySelector('[data-review-label]').textContent, '4,6 von 5 Sternen');
    assert.equal(f.host.querySelector('[data-review-count]').textContent, '222 Bewertungen auf Google');
    assert.equal(parseFloat(f.host.querySelector('[data-review-stars]').style.width), 92);
    assert.equal(f.host.querySelector('[data-review-rating]').hidden, false);
    assert.equal(f.host.querySelector('[data-review-attribution]').hidden, true);
    f.host.connectedCallback();
    f.window.eval(script);
    assert.equal(f.requests.length, 1);
  } finally {f.close();}
});

test('without IntersectionObserver loads immediately, formats singular and keeps required provider attribution', async () => {
  const f = await fixture({observer: false});
  try {
    await f.reply(payload('5', 1, {brand: true}));
    assert.equal(f.host.querySelector('[data-review-count]').textContent, '1 Bewertung auf Google');
    assert.equal(f.host.querySelector('[data-review-score]').textContent, '5,0');
    assert.equal(f.host.querySelector('[data-review-attribution]').hidden, false);
  } finally {f.close();}
});

test('invalid, missing or ambiguous data cannot turn into a fabricated rating', async () => {
  for (const data of [null, {}, {bizs: null}, payload(null), payload(6), payload('text'), payload(0), payload(4.6, 0), payload(4.6, 2.5), payload(4.6, -1), payload(4.6, null), {bizs: [{rating: 5, total: 10}, {rating: 4, total: 20}]}, payload(4.6, 222, {bizs: [{id: 'summary', rating: 5, total: 2, platform: ['facebook']}]})]) {
    const f = await fixture({observer: false});
    try {
      await f.reply(data);
      assert.equal(f.host.querySelector('[data-review-rating]').hidden, true, JSON.stringify(data));
      assert.equal(f.host.querySelector('[data-review-count]').textContent, 'Kundenbewertungen auf Google');
    } finally {f.close();}
  }
});

test('network errors and unsuccessful responses preserve the Google link without an error message', async () => {
  for (const failure of ['network', 'status']) {
    const f = await fixture({observer: false});
    try {
      if (failure === 'network') {f.requests[0].reject(new Error('offline')); await tick();}
      else await f.reply(payload(), false);
      assert.equal(f.host.querySelector('[data-review-rating]').hidden, true);
      assert.equal(f.host.querySelector('.customer-reviews-link').href, 'https://share.google/rq63tyE1ku834ANfK');
      assert.doesNotMatch(f.host.textContent, /error|unable|loading/i);
    } finally {f.close();}
  }
});

test('unsafe widget identifiers do not make requests and provider content cannot alter links or inject markup', async () => {
  const invalid = await fixture({observer: false, settings: {reviews_widget_id: '../../other?token=123'}});
  assert.equal(invalid.requests.length, 0); invalid.close();
  const f = await fixture({observer: false});
  try {
    await f.reply(payload(4.6, 222, {url: 'javascript:alert(1)', reviews: [{text: '<img src=x onerror=alert(1)>'}]}));
    assert.equal(f.host.querySelectorAll('img').length, 0);
    assert.equal(f.host.querySelector('.customer-reviews-link').href, 'https://share.google/rq63tyE1ku834ANfK');
  } finally {f.close();}
});

test('theme editor replacement reuses the pending request without updating the removed instance', async () => {
  const f = await fixture({observer: false});
  try {
    const fresh = f.host.cloneNode(true);
    f.host.replaceWith(fresh);
    assert.equal(f.requests[0].init.signal.aborted, false);
    assert.equal(f.requests.length, 1);
    await f.reply(payload());
    assert.equal(f.host.querySelector('[data-review-rating]').hidden, true);
    assert.equal(fresh.querySelector('[data-review-score]').textContent, '4,6');
  } finally {f.close();}
});

test('header, hero, cart and footer use the same merchant-configured source and retain independent switches', async () => {
  const globals = {settings: {reviews_widget_id: 'configured-widget', reviews_url: 'https://www.google.com/maps?cid=123'}};
  for (const type of ['header', 'home-hero', 'main-cart', 'footer']) {
    const dom = new JSDOM(await markup({}, {type, globals}));
    const host = dom.window.document.querySelector('upswing-reviews');
    assert.ok(host, type);
    assert.equal(host.dataset.widgetId, 'configured-widget', type);
    assert.equal(host.querySelector('.review-badge-link, .customer-reviews-link').href, globals.settings.reviews_url, type);
    assert.ok(host.querySelector('[data-review-rating]').hidden, type);
    const disabled = new JSDOM(await markup({show_reviews: false}, {type, globals}));
    assert.equal(disabled.window.document.querySelector('upswing-reviews'), null, type);
    dom.window.close(); disabled.window.close();
  }
  const emptyCart = new JSDOM(await markup({}, {type: 'main-cart', globals: {cart: {item_count: 0}}}));
  assert.equal(emptyCart.window.document.querySelector('.cart-review-proof'), null);
  assert.ok(emptyCart.window.document.querySelector('.cart-empty'));
  emptyCart.window.close();
});

test('all four placements share one request and display the same aggregate', async () => {
  const html = (await Promise.all(['header', 'home-hero', 'main-cart', 'footer'].map(type => markup({}, {type})))).join('');
  const f = await fixture({observer: false, html});
  try {
    assert.equal(f.requests.length, 1);
    await f.reply(payload());
    for (const host of f.window.document.querySelectorAll('upswing-reviews')) {
      assert.equal(host.querySelector('[data-review-score]').textContent, '4,6');
      assert.equal(host.querySelector('[data-review-count]').textContent, '222 Bewertungen auf Google');
      assert.equal(host.querySelector('[data-review-count]').hidden, false);
      assert.equal(host.querySelector('[data-review-rating]').hidden, false);
      if (host.querySelector('[data-review-fallback]')) assert.equal(host.querySelector('[data-review-fallback]').hidden, true);
    }
    const later = f.host.cloneNode(true);
    f.window.document.body.append(later);
    await tick();
    assert.equal(f.requests.length, 1);
    assert.equal(later.querySelector('[data-review-score]').textContent, '4,6');
  } finally {f.close();}
});
