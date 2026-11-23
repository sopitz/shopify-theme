const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const {readThemeJson} = require('./read_theme_json.cjs');

const repo = path.resolve(__dirname, '..');
const schema = readThemeJson(path.join(repo, 'config/settings_schema.json'));
const pathSetting = schema.flatMap(group => group.settings || []).find(field => field.id === 'collection_title_parent_paths');
const saved = readThemeJson(path.join(repo, 'config/settings_data.json')).current;
const engine = new Liquid({root: path.join(repo, 'snippets'), extname: '.liquid', strictFilters: true});
engine.registerFilter('asset_url', name => `/assets/${name}`);
engine.registerFilter('stylesheet_tag', url => `<link rel="stylesheet" href="${url}">`);
engine.registerFilter('preload_tag', () => '');
engine.registerFilter('image_url', image => image?.src || '');
engine.registerFilter('handle', value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
engine.registerTag('section', {parse() {}, render() {return '';}});

async function display(title, paths = saved.collection_title_parent_paths) {
  return engine.renderFile('collection-display-title', {collection: {title}, settings: {collection_title_parent_paths: paths}});
}
async function layout({title = 'Schuhe kybun Schuhe', pageTitle = title, pageType = 'collection', product, currentPage = 1, currentTags} = {}) {
  const collection = {id: 42, title, handle: 'kybun-schuhe-unveraendert', url: '/de/collections/kybun-schuhe-unveraendert', description: '<p>Vorhandener Kategorietext.</p>', tags: ['category_231']};
  const original = JSON.stringify(collection);
  const context = {
    settings: {...saved, seo_title_suffix: 'upswing'}, collection, product,
    request: {page_type: pageType, locale: {iso_code: 'de'}},
    shop: {name: 'upswing', url: 'https://upswing.ch'},
    page_title: pageTitle, page_description: '', current_page: currentPage, current_tags: currentTags,
    canonical_url: `https://upswing.ch${collection.url}`, content_for_layout: '', content_for_header: '',
  };
  const dom = new JSDOM(await engine.parseAndRender(readFileSync(path.join(repo, 'layout/theme.liquid'), 'utf8'), context, {globals: context}));
  assert.equal(JSON.stringify(collection), original, 'Rendering must not modify the native collection object');
  return {dom, document: dom.window.document, collection};
}
const breadcrumb = document => [...document.querySelectorAll('script[type="application/ld+json"]')].map(script => JSON.parse(script.textContent)).find(value => value['@type'] === 'BreadcrumbList');

test('editor defaults and shipped settings contain the confirmed import paths without a template requirement', async () => {
  assert.equal(pathSetting.type, 'textarea');
  assert.equal(pathSetting.default, 'Schuhe Pflegemittel & Zubehör\nSchuhe');
  assert.equal(saved.collection_title_parent_paths, pathSetting.default);
  assert.equal(await display('Schuhe kybun Schuhe'), 'kybun Schuhe');
  assert.equal(await display('Schuhe Pflegemittel & Zubehör Socken'), 'Socken');
});

test('the longest exact prefix wins independently of configuration order and is stripped only once', async () => {
  for (const paths of ['Schuhe\nSchuhe Pflegemittel & Zubehör', 'Schuhe Pflegemittel & Zubehör\nSchuhe']) {
    assert.equal(await display('Schuhe Pflegemittel & Zubehör Socken', paths), 'Socken');
    assert.equal(await display('Schuhe Schuhe Outlet', paths), 'Schuhe Outlet');
  }
  assert.equal(await display('Schuhe Pflegemittel & Zubehör Socken', ' \r\nSchuhe\r\n Schuhe Pflegemittel & Zubehör \r\n'), 'Socken');
});

test('root names, unknown paths and case or word-boundary mismatches retain the original name', async () => {
  for (const title of ['Schuhe', 'Schuheservice', 'Schuhekybun Schuhe', 'schuhe kybun Schuhe', 'SCHUHE kybun Schuhe', 'Training kybun Schuhe', 'Outlet Schuhe kybun Schuhe', '']) {
    assert.equal(await display(title), title);
  }
  assert.equal(await display('Schuhe kybun Schuhe', ''), 'Schuhe kybun Schuhe');
  assert.equal(await display('Training Gymnastikbälle', 'Training'), 'Gymnastikbälle');
});

test('meaningful qualifiers and words later in the leaf name are preserved', async () => {
  for (const [title, expected] of [
    ['Schuhe Outlet kybun Schuhe', 'Outlet kybun Schuhe'],
    ['Schuhe kybun Schuhe %SALE%', 'kybun Schuhe %SALE%'],
    ['Schuhe Pflegemittel & Zubehör Socken Outlet', 'Socken Outlet'],
    ['Schuhe Pflegemittel & Zubehör für Schuhe', 'für Schuhe'],
  ]) assert.equal(await display(title), expected);
});

test('the helper returns plain text, with escaping or JSON serialization left to its caller', async () => {
  const title = 'Schuhe kybun & Joya <Weit> "Outlet"';
  const expected = 'kybun & Joya <Weit> "Outlet"';
  assert.equal(await display(title), expected);
  const context = {collection: {title}, settings: saved};
  const html = await engine.parseAndRender('{% capture display_name %}{% render "collection-display-title", collection: collection %}{% endcapture %}<h1>{{ display_name | escape }}</h1><script type="application/ld+json">{{ display_name | json }}</script>', context, {globals: context});
  const dom = new JSDOM(html);
  try {
    assert.equal(dom.window.document.querySelector('h1').textContent, expected);
    assert.equal(dom.window.document.querySelector('h1').childElementCount, 0);
    assert.equal(JSON.parse(dom.window.document.querySelector('script').textContent), expected);
  } finally {dom.window.close();}
});

test('collection default SEO and structured names use the display title while canonical paths stay native', async () => {
  const f = await layout({currentPage: 2, currentTags: ['Weit']});
  try {
    assert.equal(f.document.title, 'kybun Schuhe · Weit · Seite 2 · upswing');
    assert.equal(f.document.querySelector('meta[property="og:title"]').content, 'kybun Schuhe');
    assert.equal(f.document.querySelector('link[rel=canonical]').href, `https://upswing.ch${f.collection.url}`);
    const last = breadcrumb(f.document).itemListElement.at(-1);
    assert.equal(last.name, 'kybun Schuhe');
    assert.equal(last.item, `https://upswing.ch${f.collection.url}`);
    assert.equal(f.document.querySelector('meta[name=description]').content, 'Vorhandener Kategorietext.');
    assert.equal(f.collection.title, 'Schuhe kybun Schuhe');
    assert.equal(f.collection.handle, 'kybun-schuhe-unveraendert');
    assert.deepEqual(f.collection.tags, ['category_231']);
  } finally {f.dom.window.close();}
});

test('a distinct merchant SEO title remains intact and product titles are never normalized', async () => {
  const customTitle = 'kybun Schuhe kaufen – Beratung & Auswahl';
  const collectionPage = await layout({pageTitle: customTitle});
  try {
    assert.equal(collectionPage.document.title, `${customTitle} · upswing`);
    assert.equal(collectionPage.document.querySelector('meta[property="og:title"]').content, customTitle);
    assert.equal(breadcrumb(collectionPage.document).itemListElement.at(-1).name, 'kybun Schuhe');
  } finally {collectionPage.dom.window.close();}
  const productPage = await layout({pageType: 'product', pageTitle: 'Schuhe unveränderter Modellname', product: {title: 'Schuhe unveränderter Modellname', url: '/products/native-modell', description: ''}});
  try {
    assert.equal(productPage.document.title, 'Schuhe unveränderter Modellname · upswing');
    assert.deepEqual(breadcrumb(productPage.document).itemListElement.map(item => item.name), ['Startseite', 'kybun Schuhe', 'Schuhe unveränderter Modellname']);
  } finally {productPage.dom.window.close();}
});

test('visible product breadcrumbs use the display name with the original collection URL or native all-products fallback', async () => {
  const source = readFileSync(path.join(repo, 'sections/main-product.liquid'), 'utf8');
  const nav = source.match(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/)[0];
  for (const collection of [{title: 'Schuhe kybun & Joya', url: '/de/collections/unveraendert'}, null]) {
    const context = {settings: saved, collection, model_title: 'Eigenständiger Produktname', routes: {root_url: '/de/', all_products_collection_url: '/de/collections/all'}};
    const dom = new JSDOM(await engine.parseAndRender(nav, context, {globals: context}));
    try {
      const link = dom.window.document.querySelectorAll('a')[1];
      assert.equal(link.textContent, collection ? 'kybun & Joya' : 'Alle Produkte');
      assert.equal(link.getAttribute('href'), collection ? collection.url : '/de/collections/all');
      assert.equal(dom.window.document.querySelector('nav > span:last-child').textContent.trim(), 'Eigenständiger Produktname');
    } finally {dom.window.close();}
  }
});
