const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');

const root = path.resolve(__dirname, '..');
const source = require('./fixtures/migrated-topic-hub-source.json');
const handles = Object.keys(source.pages);
const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
const engine = new Liquid({root: path.join(root, 'snippets'), extname: '.liquid', strictFilters: true});
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
engine.registerFilter('image_url', image => image.src);
engine.registerFilter('file_img_url', (filename, size) => `https://upswing.ch/cdn/shop/files/${encodeURIComponent(filename)}?size=${size}`);
engine.registerFilter('image_tag', (url, ...args) => `<img src="${escape(url)}" alt="${escape(Object.fromEntries(args.filter(Array.isArray)).alt || '')}">`);
engine.registerFilter('money_with_currency', value => `CHF ${(Number(value) / 100).toFixed(2)}`);
engine.registerFilter('placeholder_svg_tag', () => '<svg aria-hidden="true"></svg>');
engine.registerFilter('metafield_tag', field => `<p>${escape(field.value || '')}</p>`);

function product(index = 1, price = 12345) {
  const image = {id: index, src: `/current/product-${index}.jpg`, alt: `Aktuelles Produkt ${index}`};
  return {id: index, handle: `current-product-${index}`, title: `Aktuelles Produkt ${index}`, url: `/products/current-product-${index}`, available: true,
    price, price_min: price, price_max: price, featured_image: image, featured_media: {preview_image: image}, images: [image], options_with_values: [], tags: [],
    selected_or_first_available_variant: {price}, metafields: {upswing: {}, aico: {}, custom_fields: {}}, description: '<p>Aktuelle Produktinformation.</p>'};
}
const locationHandles = ['standort-thun', 'standort-ruti-zh', 'standort-zurich', 'standort-winterthur', 'standort-basel'];
function resources({withProducts = false} = {}) {
  const collections = Object.fromEntries(source.bindings.collections.map((handle, i) => [handle, {id: 100 + i, title: `Aktuelle Kollektion ${i}`, url: `/de/collections/${handle}-aktuell`, products_count: withProducts ? 2 : 0, products: withProducts ? [product(1), product(2)] : []}]));
  const pages = Object.fromEntries([...source.bindings.pages, ...locationHandles].map((handle, i) => [handle, {id: 300 + i, title: handle, url: `/de/pages/${handle}-aktuell`}]));
  const all_products = Object.fromEntries(source.bindings.products.map((handle, i) => [handle, {...product(20 + i), url: `/de/products/${handle}-aktuell`}]));
  return {collections, pages, all_products};
}
async function render(handle, data = resources(), snippet = 'migrated-topic-hub-pages', extra = {}) {
  const context = {page: {id: 77, handle, title: 'Nicht als Ersatztext verwenden', content: ''}, section: {id: 'MigrationQA'}, settings: {}, request: {design_mode: false}, routes: {root_url: '/'}, ...data, ...extra};
  return new JSDOM(await engine.renderFile(snippet, context, {globals: context}));
}

test('all ten audited topic/hub handles render a complete page with one H1 and unrelated handles stay blank', async () => {
  assert.equal(handles.length, 10);
  for (const handle of handles) {
    const dom = await render(handle);
    try {
      assert.equal(dom.window.document.querySelectorAll('.migrated-page').length, 1, handle);
      assert.equal(dom.window.document.querySelector('.migrated-page').dataset.migratedTopicHub, handle);
      assert.equal(dom.window.document.querySelectorAll('h1').length, 1, handle);
      assert.doesNotMatch(dom.window.document.body.textContent, /Nicht als Ersatztext/);
    } finally {dom.window.close();}
  }
  for (const handle of ['unbekannt', 'kybun', 'contact', '']) {
    const dom = await render(handle);
    try {assert.equal(dom.window.document.body.innerHTML.trim(), '');} finally {dom.window.close();}
  }
});

test('the complete audited editorial copy remains in source order without old theme wrappers or scripts', async () => {
  for (const handle of handles.filter(handle => handle !== 'themen')) {
    const dom = await render(handle, resources({withProducts: true}));
    try {
      const document = dom.window.document;
      const text = normalize(document.body.textContent);
      let position = 0;
      for (const original of source.pages[handle].source_texts) {
        const found = text.indexOf(normalize(original), position);
        assert.ok(found >= 0, `${handle}: missing or reordered original copy ${original.slice(0, 100)}`);
        position = found + normalize(original).length;
      }
      assert.equal(document.querySelector('script, style, noscript, rte-formatter, product-card, carousel-component, [id^="shopify-section-"]'), null, handle);
      assert.doesNotMatch(document.body.innerHTML, /custom-section-content|upswing-landing-card|random-product-grid__/);
    } finally {dom.window.close();}
  }
});

test('all original editorial photo identities are preserved with dimensions and no invented stock photo', async () => {
  for (const handle of handles.filter(handle => handle !== 'themen')) {
    const dom = await render(handle);
    try {
      const images = [...dom.window.document.querySelectorAll('img')];
      const paths = images.map(image => new URL(image.getAttribute('src')).pathname);
      for (const originalPath of source.pages[handle].source_images) assert.ok(paths.includes(originalPath), `${handle}: missing original image ${originalPath}`);
      for (const image of images) {
        assert.ok(Number(image.getAttribute('width')) > 0, `${handle}: missing intrinsic width`);
        assert.ok(Number(image.getAttribute('height')) > 0, `${handle}: missing intrinsic height`);
        assert.ok(['lazy', 'eager'].includes(image.getAttribute('loading')));
      }
    } finally {dom.window.close();}
  }
});

test('the deliberate Themen index links the four actual topic Pages and uses their source hero photos', async () => {
  const data = resources();
  const topicHandles = handles.slice(0, 4);
  for (const [i, handle] of topicHandles.entries()) data.pages[handle] = {id: 800 + i, title: handle, url: `/de/pages/${handle}`};
  const dom = await render('themen', data);
  try {
    const links = [...dom.window.document.querySelectorAll('.migration-grid a.migration-card')];
    assert.equal(links.length, 4);
    assert.deepEqual(links.map(link => link.getAttribute('href')), topicHandles.map(handle => data.pages[handle].url));
    assert.ok(links.every(link => link.querySelector('img') && link.querySelector('h2')));
    assert.doesNotMatch(dom.window.document.body.textContent, /Schmerzlinderung|heilt|garantiert/);
  } finally {dom.window.close();}
});

test('catalogue groups use current native product cards, prices and URLs, including all three action collections', async () => {
  for (const handle of handles.filter(handle => source.pages[handle].catalogue_groups.length)) {
    const data = resources({withProducts: true});
    const dom = await render(handle, data);
    try {
      const document = dom.window.document;
      assert.equal(document.querySelectorAll('.migration-products').length, source.pages[handle].catalogue_groups.length, handle);
      assert.ok(document.querySelector('.product-card[data-product-handle="current-product-1"]'));
      assert.ok(document.body.textContent.includes('CHF 123.45'));
      for (const group of source.pages[handle].catalogue_groups) {
        assert.ok([...document.querySelectorAll('.migration-products h2')].some(heading => heading.textContent === group.heading), `${handle}: ${group.heading}`);
        assert.ok(document.querySelector(`.migration-products a[href="${data.collections[group.collection].url}"]`));
      }
      assert.doesNotMatch(document.body.textContent, /CHF 330\.00|CHF 219\.90|Tiffany STX black II/);
    } finally {dom.window.close();}
  }
});

test('removed or empty catalogue resources omit product sections while preserving all editorial content and photos', async () => {
  for (const handle of ['ruckenschmerzen', 'arthrose-und-gelenkschmerzen', 'gesundheitsschuhe', 'trainingsgeraete', 'arbeitsplatz', 'vitalitaet', 'aktionen']) {
    const dom = await render(handle, {collections: {}, pages: {}, all_products: {}});
    try {
      assert.equal(dom.window.document.querySelector('.migration-products, .product-card'), null);
      assert.equal(dom.window.document.querySelector('a[href*="/collections/"], a[href*="/products/"], a[href*="/pages/"]'), null);
      assert.ok(dom.window.document.querySelector('h1'));
      if (source.pages[handle].source_images.length) assert.ok(dom.window.document.querySelector('img'));
      for (const copy of source.pages[handle].source_texts) assert.ok(normalize(dom.window.document.body.textContent).includes(normalize(copy)), `${handle}: native data loss must not erase editorial copy`);
    } finally {dom.window.close();}
  }
});

test('shared location cards preserve every original address and use current valid Page destinations', async () => {
  const data = resources();
  const dom = await render('ruckenschmerzen', data);
  try {
    const section = dom.window.document.querySelector('.migration-locations');
    assert.equal(section.querySelectorAll('.migration-card').length, 5);
    for (const address of ['Aarestrasse 14', 'Ferrachstrasse 4', 'Stampfenbachstrasse 42', 'Unterer Graben 3', 'Aeschenvorstadt 55']) assert.ok(section.textContent.includes(address));
    assert.deepEqual([...section.querySelectorAll('a')].map(link => link.getAttribute('href')), locationHandles.map(handle => data.pages[handle].url));
    assert.equal(section.querySelectorAll('img').length, 5);
  } finally {dom.window.close();}
});

test('verified editorial product links follow current URLs and image links retain a useful accessible name', async () => {
  const data = resources();
  const dom = await render('ruckenschmerzen', data);
  try {
    const duoball = data.all_products['blackroll-duoball-schwarz-12cm'];
    const link = dom.window.document.querySelector(`a[href="${duoball.url}"]`);
    assert.ok(link.querySelector('img'));
    assert.equal(link.getAttribute('aria-label'), 'Weitere Produkte für deinen Rücken');
    assert.equal(dom.window.document.querySelectorAll(`a[href="${duoball.url}"]`).length, 1);
  } finally {dom.window.close();}
});

test('the shared product renderer limits visible cards and keeps a native random pool inactive before JavaScript', async () => {
  const products = Array.from({length: 7}, (_, i) => product(i + 1));
  const data = {collections: {verified: {id: 1, title: 'Aktuelles Sortiment', url: '/collections/aktuell', products_count: products.length, products}}, pages: {}, all_products: {}};
  const dom = await render('', data, 'migrated-catalogue-products', {collection_handle: 'verified', heading: 'Originale Überschrift', limit: 4, randomize: true});
  try {
    const grid = dom.window.document.querySelector('[data-featured-random]');
    assert.equal(grid.dataset.featuredCount, '4');
    assert.equal(grid.querySelectorAll('.product-card').length, 4);
    assert.equal(grid.querySelectorAll('template[data-featured-candidate]').length, 3);
    assert.ok([...grid.querySelectorAll('template')].every(template => template.content.querySelector('.product-card')));
    assert.equal(dom.window.document.querySelector('.migration-products h2').textContent, 'Originale Überschrift');
  } finally {dom.window.close();}
});

test('editorial resource links retain source fragments and missing or unsafe targets cannot become active links', async () => {
  const data = {pages: {beratung: {id: 1, url: '/de/pages/beratung-neu'}}, collections: {}, all_products: {}};
  let dom = await render('', data, 'migrated-topic-link', {target_url: '/pages/beratung?from=thema#Termin', label: 'Beratung'});
  try {assert.equal(dom.window.document.querySelector('a').getAttribute('href'), '/de/pages/beratung-neu?from=thema#Termin');} finally {dom.window.close();}
  for (const target_url of ['/products/entfernt', '/collections/entfernt', 'javascript:alert(1)']) {
    dom = await render('', data, 'migrated-topic-link', {target_url, label: 'Originaltext'});
    try {assert.equal(dom.window.document.querySelector('a'), null); assert.equal(dom.window.document.body.textContent, 'Originaltext');} finally {dom.window.close();}
  }
});

test('the complete topic/hub render stays within the native all_products lookup budget', async () => {
  const expected = {
    'fersensporn-und-andere-fussschmerzen': ['anders-wadendehner-4-stufig-verstellbar'],
    ruckenschmerzen: ['blackroll-duoball-schwarz-12cm', 'upswing-2-in-1-multi-loop-band-medium'],
    'arthrose-und-gelenkschmerzen': ['kingnature-msm-vida', 'kingnature-boswellia-vida'],
  };
  for (const handle of handles) {
    const data = resources({withProducts: true});
    const lookedUp = new Set();
    data.all_products = new Proxy(data.all_products, {
      get(target, property, receiver) {
        if (typeof property === 'string' && Object.hasOwn(target, property)) lookedUp.add(property);
        return Reflect.get(target, property, receiver);
      },
    });
    const dom = await render(handle, data);
    try {
      assert.deepEqual([...lookedUp].sort(), [...(expected[handle] || [])].sort(), handle);
      assert.ok(lookedUp.size <= 20, `${handle}: Shopify all_products limit`);
    } finally {dom.window.close();}
  }
});
