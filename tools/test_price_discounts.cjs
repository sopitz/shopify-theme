const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');

const root = path.resolve(__dirname, '..');
const engine = new Liquid({root: path.join(root, 'snippets'), extname: '.liquid', strictFilters: true});
engine.registerFilter('money_with_currency', value => `CHF ${(Number(value) / 100).toFixed(2)}`);
engine.registerFilter('image_url', image => image?.src || '');
engine.registerFilter('image_tag', src => `<img src="${src}" alt="">`);
engine.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
engine.registerFilter('metafield_tag', field => String(field?.value || ''));
const runtime = fs.readFileSync(path.join(root, 'assets/upswing.js'), 'utf8');

function product({price = 8000, comparison = 10000, min = price, max = price, siblings = [], overrides = {}} = {}) {
  const variant = {id: 11, price, compare_at_price: comparison, available: true};
  return {
    id: 100, handle: 'actual-offer', title: 'Aktuelles Angebot', vendor: 'Marke',
    url: '/products/actual-offer', available: true, description: '<p>Aktuelle Beschreibung.</p>',
    price: min, price_min: min, price_max: max, compare_at_price_max: 999000,
    selected_or_first_available_variant: variant, variants: [variant], images: [], options_with_values: [],
    metafields: {upswing: {model_products: {value: siblings}}, custom_fields: {}, aico: {}},
    ...overrides,
  };
}
async function render(name, values) {
  return new JSDOM(await engine.renderFile(name, values));
}

test('the normal card starting-price argument retains the matching variant comparison and labels it Statt', async () => {
  const p = product();
  const dom = await render('product-card', {product: p});
  try {
    const document = dom.window.document;
    assert.equal(document.querySelector('.price > span').textContent, 'CHF 80.00');
    assert.equal(document.querySelector('.price s').textContent, 'CHF 100.00');
    assert.equal(document.querySelector('.price-comparison-label').textContent, 'Statt ');
    assert.ok(document.querySelector('.price--sale'));
    assert.equal(document.querySelector('.product-media .product-sale-badge').textContent, '−20 %');
    assert.equal(document.querySelector('.product-sale-badge').getAttribute('aria-label'), '20 % Rabatt');
    assert.doesNotMatch(document.querySelector('.product-price').textContent, /9990/);
  } finally {dom.window.close();}
});

test('a lower sibling amount never borrows the primary product comparison or advertises its discount', async () => {
  const p = product({siblings: [{id: 101, price_min: 6000, price_max: 8000, available: true, metafields: {aico: {}, upswing: {}}}]});
  const dom = await render('product-card', {product: p});
  try {
    const document = dom.window.document;
    assert.equal(document.querySelector('.price-prefix').textContent, 'ab ');
    assert.match(document.querySelector('.product-price').textContent, /CHF 60\.00/);
    assert.equal(document.querySelector('.price s, .product-sale-badge'), null);
  } finally {dom.window.close();}
});

test('a varying-price range omits a universal discount even when its selected variant is reduced', async () => {
  const p = product({min: 8000, max: 12000});
  const dom = await render('product-card', {product: p});
  try {
    assert.ok(dom.window.document.querySelector('.price-prefix'));
    assert.equal(dom.window.document.querySelector('.price s, .product-sale-badge'), null);
  } finally {dom.window.close();}
});

test('percentage discounts round down and omit free, zero-percent, missing, inverted or invalid offers', async () => {
  const cases = [
    [20000, 30000, '−33 %'],
    [1, 3, '−66 %'],
    [29999, 30000, null],
    [0, 10000, null],
    [10000, 10000, null],
    [10000, 9000, null],
    [10000, null, null],
    [10000, 0, null],
    ['8000', 10000, null],
    [8000, '10000', null],
    [{amount: 8000}, 10000, null],
    [8000, [10000], null],
  ];
  for (const [price, comparison, expected] of cases) {
    const dom = await render('product-sale-badge', {product: product({price, comparison})});
    try {assert.equal(dom.window.document.querySelector('.product-sale-badge')?.textContent ?? null, expected, JSON.stringify([price, comparison]));}
    finally {dom.window.close();}
  }
});

test('an explicit variant controls the live price and unit measurement instead of product aggregate amounts', async () => {
  const variant = {id: 22, price: 1250, compare_at_price: 1500, unit_price: 2500, unit_price_measurement: {reference_value: 1, reference_unit: 'l'}};
  const dom = await render('price', {product: product(), variant, live: true});
  try {
    const document = dom.window.document;
    assert.equal(document.querySelector('[data-product-price]').textContent, 'CHF 12.50');
    assert.equal(document.querySelector('[data-product-compare-price]').textContent, 'CHF 15.00');
    assert.match(document.querySelector('.unit-price').textContent, /CHF 25\.00\s*\/\s*l/);
    assert.ok(document.querySelector('[data-product-price-container].price--sale'));
  } finally {dom.window.close();}
});

test('regular live markup retains hidden comparison nodes for later variant changes', async () => {
  const dom = await render('price', {product: product({comparison: null}), live: true});
  try {
    assert.equal(dom.window.document.querySelector('[data-product-compare-price]').hidden, true);
    assert.equal(dom.window.document.querySelector('[data-product-compare-wrapper]').hidden, true);
    assert.equal(dom.window.document.querySelector('.price--sale'), null);
  } finally {dom.window.close();}
});

test('variant changes update comparison amount, Statt visibility and sale styling together', () => {
  const variants = [
    {id: 1, options: ['36'], price: 8000, compare_at_price: 10000, price_formatted: 'CHF 80.00', compare_at_formatted: 'CHF 100.00', available: true},
    {id: 2, options: ['37'], price: 9000, compare_at_price: null, price_formatted: 'CHF 90.00', compare_at_formatted: '', available: true},
    {id: 3, options: ['38'], price: 12000, compare_at_price: 10000, price_formatted: 'CHF 120.00', compare_at_formatted: 'CHF 100.00', available: true},
  ];
  const dom = new JSDOM(`<!doctype html><html class="no-js"><body><section data-product-section>
    <div class="price price--sale" data-product-price-container><span data-product-price>CHF 80.00</span><span data-product-compare-wrapper>Statt <s data-product-compare-price>CHF 100.00</s></span></div>
    <form data-product-form data-high-variants="3"><script type="application/json" data-variants>${JSON.stringify(variants)}</script>
      <select data-option-select data-option-position="1"><option>36</option><option>37</option><option>38</option><option>39</option></select>
      <input name="id" value="1"><button type="submit"><span data-add-label>In den Warenkorb</span></button>
    </form></section></body></html>`, {url: 'https://upswing.test/products/actual-offer', runScripts: 'outside-only'});
  try {
    dom.window.eval(runtime);
    const document = dom.window.document;
    const select = document.querySelector('select');
    const change = value => {select.value = value; select.dispatchEvent(new dom.window.Event('change', {bubbles: true}));};
    assert.equal(document.querySelector('[data-product-compare-wrapper]').hidden, false);
    change('37');
    assert.equal(document.querySelector('[data-product-price]').textContent, 'CHF 90.00');
    assert.equal(document.querySelector('[data-product-compare-wrapper]').hidden, true);
    assert.equal(document.querySelector('.price').classList.contains('price--sale'), false);
    change('38');
    assert.equal(document.querySelector('[data-product-price]').textContent, 'CHF 120.00');
    assert.equal(document.querySelector('[data-product-compare-price]').hidden, true);
    change('36');
    assert.equal(document.querySelector('[data-product-compare-price]').textContent, 'CHF 100.00');
    assert.equal(document.querySelector('[data-product-compare-price]').hidden, false);
    assert.equal(document.querySelector('[data-product-compare-wrapper]').hidden, false);
    assert.equal(document.querySelector('.price').classList.contains('price--sale'), true);
    change('39');
    assert.equal(document.querySelector('[data-product-compare-wrapper]').hidden, true, 'Unavailable combinations cannot retain a previous sale claim');
    assert.equal(document.querySelector('[name="id"]').disabled, true);
  } finally {dom.window.close();}
});
