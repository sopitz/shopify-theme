const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');
const {Liquid} = require('liquidjs');

const root = path.resolve(__dirname, '..');
const sections = ['category-grid', 'brand-strip', 'featured-products'];
const sources = Object.fromEntries(sections.map(name => [name, readFileSync(path.join(root, 'sections', `${name}.liquid`), 'utf8')]));
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function product(id) {
  return {id, handle:`product-${id}`, title:`Produkt ${id}`, url:`/products/product-${id}`, description:'<p>Aktuelle Produktbeschreibung.</p>', available:true, price:12000, price_min:12000, price_max:12000, images:[], options_with_values:[], metafields:{upswing:{}, custom_fields:{}}};
}
function collection(id, products = []) {
  return {id, title:`Kollektion ${id}`, url:`/collections/collection-${id}`, description:'<p>Aktuelle <strong>Kollektionsbeschreibung</strong>.</p>', image:{src:`/collection-${id}.jpg`}, products, products_count:products.length, metafields:{upswing:{}}};
}
function block(settings, id = 'binding') {
  return {settings, shopify_attributes:`data-editor-block="${id}"`};
}
async function render(name, {blocks = [], settings = {}, editor = false} = {}) {
  const engine = new Liquid({root:path.join(root, 'snippets'), extname:'.liquid', strictFilters:true});
  engine.registerFilter('image_url', image => {
    assert.ok(image?.src, 'image output must receive an actual selected resource image');
    return image.src;
  });
  engine.registerFilter('image_tag', (url, ...attributes) => `<img src="${escape(url)}" alt="${escape(Object.fromEntries(attributes).alt)}">`);
  engine.registerFilter('placeholder_svg_tag', () => '<svg data-placeholder></svg>');
  engine.registerFilter('money_with_currency', value => `CHF ${(Number(value) / 100).toFixed(2)}`);
  engine.registerFilter('metafield_tag', field => escape(field?.value));
  const markup = await engine.parseAndRender(sources[name].replace(/\{% schema %\}[\s\S]*?\{% endschema %\}/, ''), {
    section:{id:name, settings:{heading:'Auswahl', eyebrow:'SHOP', description:'Ausgewählte Produkte.', link_label:'Kollektion entdecken', product_count:2, ...settings}, blocks},
    request:{design_mode:editor}, routes:{all_products_collection_url:'/collections/all', root_url:'/'},
  });
  return new JSDOM(markup).window.document;
}

test('category schema retains collection bindings and brands add explicit page and logo choices', () => {
  const category = JSON.parse(sources['category-grid'].match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)[1]);
  assert.deepEqual(category.blocks[0].settings.map(({id, type}) => ({id, type})), [{id:'collection', type:'collection'}]);
  const brands = JSON.parse(sources['brand-strip'].match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)[1]);
  assert.equal(brands.blocks[0].settings.find(item => item.id === 'target_type').default, 'collection');
  assert.ok(brands.max_blocks >= 12);
  assert.deepEqual(brands.blocks[0].settings.filter(item => ['page','logo'].includes(item.id)).map(({id,type})=>({id,type})), [{id:'page',type:'page'},{id:'logo',type:'image_picker'}]);
});

test('category cards track the selected collection after its title, description, URL and image change', async () => {
  const selected = collection(1);
  const blocks = [block({collection:selected, title:'Alter Titel', description:'Alter Text', url:'/old-target', image:{src:'/old-image.jpg'}, fallback_image:'old-image.jpg'})];
  let document = await render('category-grid', {blocks});
  assert.equal(document.querySelector('.category-card').getAttribute('href'), selected.url);
  assert.equal(document.querySelector('.category-content h3').textContent, selected.title);
  assert.equal(document.querySelector('.category-content p').textContent, 'Aktuelle Kollektionsbeschreibung.');
  assert.equal(document.querySelector('.category-media img').getAttribute('src'), selected.image.src);
  Object.assign(selected, {title:'Aktueller Titel & Auswahl', description:'<p>Geänderter &amp; aktueller Text.</p>', url:'/collections/current', image:{src:'/current.jpg'}});
  document = await render('category-grid', {blocks});
  assert.equal(document.querySelector('.category-card').getAttribute('href'), selected.url);
  assert.equal(document.querySelector('.category-content h3').textContent, selected.title);
  assert.equal(document.querySelector('.category-content p').textContent, 'Geänderter & aktueller Text.');
  assert.equal(document.querySelector('.category-media img').getAttribute('src'), selected.image.src);
  assert.equal(document.querySelector('.category-media img').alt, selected.title);
  assert.doesNotMatch(document.body.textContent, /Alter Titel|Alter Text/);
});

test('a real collection without its own image never borrows a product, uploaded override or theme photograph', async () => {
  const selected = collection(2, [{featured_image:{src:'/unrelated-product.jpg'}}]);
  selected.image = null;
  selected.description = '';
  const document = await render('category-grid', {blocks:[block({collection:selected, image:{src:'/manual.jpg'}, fallback_image:'category-shoes.jpg'})]});
  assert.ok(document.querySelector('.category-card'));
  assert.equal(document.querySelector('.category-media img, .category-media svg'), null);
  assert.equal(document.querySelector('.category-content p'), null);
});

for (const name of ['category-grid', 'brand-strip']) {
  test(`${name}: deleted, unresolved and unbound collection references cannot render storefront links`, async () => {
    const blocks = [block({collection:null}, 'missing'), block({collection:'deleted-handle'}, 'deleted'), block({collection:{title:'Orphan', url:'/old-target'}}, 'orphan')];
    const storefront = await render(name, {blocks});
    assert.equal(storefront.querySelector('section'), null);
    assert.equal(storefront.querySelector('a, img'), null);
    const editor = await render(name, {blocks, editor:true});
    assert.ok(editor.querySelector('section'));
    assert.equal(editor.querySelectorAll('[data-editor-block]').length, blocks.length);
    assert.equal(editor.querySelector('a, img'), null);
    assert.match(editor.body.textContent, /Kollektion verknüpfen|Marken-Seite oder Kollektion verknüpfen/);
  });
}

test('brand links use current collection data and the optional live image metafield, never a fixed logo', async () => {
  const selected = collection(3);
  selected.metafields.upswing.brand_logo = {type:'file_reference', value:{media_type:'image', preview_image:{src:'/live-logo.jpg'}}};
  const blocks = [block({collection:selected, name:'Alter Name', url:'/old-target', image:{src:'/old-logo.jpg'}, fallback_image:'old-logo.jpg'})];
  let document = await render('brand-strip', {blocks});
  assert.equal(document.querySelector('.brand-logo').getAttribute('href'), selected.url);
  assert.equal(document.querySelector('.brand-logo img').getAttribute('src'), '/live-logo.jpg');
  selected.title = 'Aktuelle Marke & Name';
  selected.url = '/collections/current-brand';
  delete selected.metafields.upswing.brand_logo;
  document = await render('brand-strip', {blocks});
  assert.equal(document.querySelector('.brand-logo').getAttribute('href'), selected.url);
  assert.equal(document.querySelector('.brand-logo img').getAttribute('src'), selected.image.src);
  assert.equal(document.querySelector('.brand-logo img').alt, selected.title);
  selected.image = null;
  document = await render('brand-strip', {blocks});
  assert.equal(document.querySelector('img'), null);
  assert.equal(document.querySelector('.brand-name').textContent, selected.title);
  assert.doesNotMatch(document.body.innerHTML, /Alter Name|old-logo|old-target/);
});

test('a non-image brand file cannot be passed to the Shopify image filter', async () => {
  const selected = collection(4);
  selected.metafields.upswing.brand_logo = {type:'file_reference', value:{media_type:'generic_file', preview_image:{src:'/document-preview.jpg'}}};
  const document = await render('brand-strip', {blocks:[block({collection:selected})]});
  assert.equal(document.querySelector('.brand-logo img').getAttribute('src'), selected.image.src);
});

test('featured products follow live product changes and skip deleted bindings without a substitute catalogue link', async () => {
  const selected = product(1);
  const blocks = [block({product:null}, 'missing'), block({product:selected}, 'selected'), block({product:'deleted-handle'}, 'deleted')];
  let document = await render('featured-products', {blocks});
  assert.equal(document.querySelectorAll('[data-product-card]').length, 1);
  assert.equal(document.querySelector('.product-title').textContent, selected.title);
  assert.equal(document.querySelector('.section-heading a'), null);
  selected.title = 'Aktueller Produktname';
  selected.url = '/products/current';
  document = await render('featured-products', {blocks});
  assert.equal(document.querySelector('.product-title').textContent, selected.title);
  assert.equal(document.querySelector('.product-title a').getAttribute('href'), selected.url);
  const editor = await render('featured-products', {blocks, editor:true});
  assert.equal(editor.querySelectorAll('[data-editor-block]').length, blocks.length);
  assert.equal(editor.querySelectorAll('[data-product-card]').length, 1);
  assert.match(editor.body.textContent, /Produkt verknüpfen/);
});

test('unbound product blocks keep their explicit source and cannot silently switch to a selected collection', async () => {
  const selectedCollection = collection(5, [product(2)]);
  const blocks = [block({product:null})];
  const document = await render('featured-products', {blocks, settings:{collection:selectedCollection}});
  assert.equal(document.querySelector('section, a, [data-product-card]'), null);
  const editor = await render('featured-products', {blocks, settings:{collection:selectedCollection}, editor:true});
  assert.match(editor.body.textContent, /Produkt verknüpfen/);
  assert.equal(editor.querySelector('a, [data-product-card]'), null);
});

test('featured collection mode respects the chosen collection, product limit and current collection URL', async () => {
  const products = [product(3), product(4), product(5)];
  const selected = collection(6, products);
  let document = await render('featured-products', {settings:{collection:selected, product_count:2}});
  assert.deepEqual([...document.querySelectorAll('.product-title')].map(node => node.textContent), products.slice(0, 2).map(item => item.title));
  assert.equal(document.querySelector('.section-heading a').getAttribute('href'), selected.url);
  selected.url = '/collections/current-products';
  selected.products[0].title = 'Aktuelle Auswahl';
  document = await render('featured-products', {settings:{collection:selected, product_count:2}});
  assert.equal(document.querySelector('.section-heading a').getAttribute('href'), selected.url);
  assert.equal(document.querySelector('.product-title').textContent, selected.products[0].title);
});

test('empty or deleted featured collection has no storefront section or all-products escape link', async () => {
  for (const selected of [null, 'deleted-handle', collection(7), {title:'Unresolved', products:[product(6)]}]) {
    const document = await render('featured-products', {settings:{collection:selected}});
    assert.equal(document.querySelector('section, a, [data-product-card]'), null);
    const editor = await render('featured-products', {settings:{collection:selected}, editor:true});
    assert.match(editor.body.textContent, /Produkte verknüpfen/);
    assert.equal(editor.querySelector('a, [data-product-card], img'), null);
  }
});

test('sections with no catalogue bindings give setup instructions only in the editor', async () => {
  for (const name of sections) {
    const storefront = await render(name);
    assert.equal(storefront.querySelector('section, a'), null);
    const editor = await render(name, {editor:true});
    assert.ok(editor.querySelector('section'));
    assert.match(editor.body.textContent, /wählen|Wählen/);
    assert.equal(editor.querySelector('a, img, svg'), null);
  }
});

test('page brands keep their selected page and logo, and deleted pages cannot borrow a collection', async () => {
  const page = {id:90, title:'Unsere Marke', url:'/pages/our-brand'};
  const settings = {target_type:'page', page, logo:{src:'/shopify/original-logo.png'}, collection:collection(99)};
  let document = await render('brand-strip', {blocks:[block(settings)]});
  assert.equal(document.querySelector('a').getAttribute('href'), page.url);
  assert.equal(document.querySelector('img').getAttribute('src'), settings.logo.src);
  assert.equal(document.querySelector('img').alt, page.title);
  page.url = '/pages/renamed-brand'; page.title = 'Neuer Markenname';
  document = await render('brand-strip', {blocks:[block(settings)]});
  assert.equal(document.querySelector('a').getAttribute('href'), page.url);
  assert.equal(document.querySelector('img').alt, page.title);
  settings.logo = null;
  document = await render('brand-strip', {blocks:[block(settings)]});
  assert.equal(document.querySelector('img'), null);
  assert.equal(document.querySelector('.brand-name').textContent, page.title);
  for (const missing of [null, 'deleted-page', {title:'Deleted', url:'/pages/deleted'}]) {
    settings.page = missing;
    document = await render('brand-strip', {blocks:[block(settings)]});
    assert.equal(document.querySelector('section, a, img'), null);
  }
});

test('random collection provides a complete no-JS selection and unique sampled cards after enhancement', async () => {
  const products = Array.from({length:8}, (_, i) => product(100 + i));
  const selected = collection(100, products);
  const document = await render('featured-products', {settings:{collection:selected, randomize:true, product_count:4, link_position:'bottom'}});
  const grid = document.querySelector('[data-featured-random]');
  assert.equal(grid.querySelectorAll('[data-product-card]').length, 4);
  assert.equal(grid.querySelectorAll('template').length, 4);
  assert.equal(document.querySelector('.section-heading a'), null);
  assert.equal(document.querySelector('.featured-products-action a').getAttribute('href'), selected.url);
  const dom = new JSDOM(document.body.innerHTML, {runScripts:'outside-only'});
  dom.window.Math.random = () => 0;
  dom.window.eval(readFileSync(path.join(root, 'assets/featured-products.js'), 'utf8'));
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  const handles = () => [...dom.window.document.querySelectorAll('[data-product-handle]')].map(card=>card.dataset.productHandle);
  assert.equal(handles().length, 4);
  assert.equal(new Set(handles()).size, 4);
  assert.notDeepEqual(handles(), products.slice(0,4).map(product=>product.handle));
  assert.equal(dom.window.document.querySelector('template'), null);
  const initial = handles();
  dom.window.document.body.dispatchEvent(new dom.window.Event('shopify:section:load', {bubbles:true}));
  assert.deepEqual(handles(), initial, 'existing sections must not reshuffle on editor rebind');
  const replacement = dom.window.document.createElement('section');
  replacement.innerHTML = document.body.innerHTML;
  dom.window.document.body.replaceChildren(replacement);
  replacement.dispatchEvent(new dom.window.Event('shopify:section:load', {bubbles:true}));
  assert.equal(handles().length, 4);
  assert.equal(replacement.querySelector('template'), null);
});

test('home setup preserves the original twelve brand pages and adds a separate kybun collection row', () => {
  const template = JSON.parse(readFileSync(path.join(root, 'templates/index.json'), 'utf8'));
  assert.deepEqual(template.sections.brands.block_order, ['kybun','joya','leguano','kingnature','anders','venenengel','elten','bellabambi','bellicon','blackroll','theraband','pepup']);
  for (const id of template.sections.brands.block_order) {
    const settings = template.sections.brands.blocks[id].settings;
    assert.equal(settings.target_type, 'page');
    assert.equal(settings.page, id);
    assert.match(settings.logo, /^shopify:\/\/shop_images\/.+\.png$/);
  }
  assert.equal(template.sections.kybun.settings.collection, 'kybun-schuhe');
  assert.equal(template.sections.kybun.settings.product_count, 4);
  assert.equal(template.sections.kybun.settings.randomize, true);
  assert.equal(template.sections.featured.blocks.product0.settings.product, undefined, 'the existing recommendations are preserved');
  assert.ok(template.order.indexOf('kybun') < template.order.indexOf('brands'));
});
