const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');

const root = path.resolve(__dirname, '..');
const layout = readFileSync(path.join(root, 'layout/theme.liquid'), 'utf8');
const features = ['product-information.css', 'product-knowledge.css', 'about-pages.css',
  'contact-locations.css', 'product-media-context.css', 'quantity-stepper.css',
  'collection-guidance.css', 'collection-filters.css'];
const shared = ['upswing.css', 'theme-components.css', 'commerce-components.css',
  'need-topics.css', 'typography.css', 'mega-menu.css', 'row-alignment.css',
  'product-cards.css', 'price-discounts.css', 'color-swatches.css',
  'predictive-search.css', 'customer-reviews.css', 'sticky-header.css'];

async function render(pageType = 'index', body = '', designMode = false) {
  const liquid = new Liquid({root:path.join(root, 'snippets'), extname:'.liquid', strictFilters:true});
  liquid.registerFilter('asset_url', name => `/assets/${name}`);
  liquid.registerFilter('stylesheet_tag', url => `<link rel="stylesheet" href="${url}">`);
  liquid.registerFilter('preload_tag', url => `<link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin="anonymous">`);
  liquid.registerFilter('image_url', image => image?.src || '');
  liquid.registerFilter('handle', value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  liquid.registerTag('section', {parse() {}, render() {return '';}});
  const values = {settings:{}, request:{page_type:pageType, design_mode:designMode, locale:{iso_code:'de'}},
    shop:{name:'upswing', url:'https://upswing.ch'}, page_title:'Test', current_page:1,
    canonical_url:'https://upswing.ch/', content_for_layout:body, content_for_header:''};
  const dom = new JSDOM(await liquid.parseAndRender(layout, values, {globals:values}));
  return dom;
}
function styles(document) {
  return [...document.querySelectorAll('head link[rel="stylesheet"]')].map(link => path.basename(link.getAttribute('href')));
}
function requireStyles(document, expected, absent = []) {
  const actual = styles(document);
  for (const name of expected) assert.equal(actual.filter(value => value === name).length, 1, `${name} is available exactly once`);
  for (const name of absent) assert.ok(!actual.includes(name), `${name} is unnecessary on this page`);
}

test('the storefront home retains critical shared styles and the font preload without unrelated feature requests', async () => {
  const dom = await render('index', '<section class="needs-section"><div class="topic-grid"></div></section><article class="product-card"></article>');
  try {
    requireStyles(dom.window.document, shared, [...features, 'page-migration.css']);
    assert.ok(dom.window.document.querySelector('link[rel="preload"][as="font"][href="/assets/manrope-latin.woff2"][crossorigin="anonymous"]'));
    for (const link of dom.window.document.querySelectorAll('link[rel="stylesheet"]')) {
      assert.equal(link.hasAttribute('onload'), false);
      assert.equal(link.hasAttribute('media'), false, 'Critical header and product-card CSS stays immediately available');
    }
  } finally {dom.window.close();}
});

test('product and cart templates retain purchase, description and quantity styling', async () => {
  for (const [type, expected, absent] of [
    ['product', ['product-information.css', 'product-knowledge.css', 'product-media-context.css', 'quantity-stepper.css'], ['contact-locations.css', 'about-pages.css', 'collection-filters.css']],
    ['cart', ['quantity-stepper.css'], ['product-information.css', 'product-knowledge.css', 'product-media-context.css', 'contact-locations.css']],
  ]) {
    const dom = await render(type);
    try {requireStyles(dom.window.document, [...shared, ...expected], absent);} finally {dom.window.close();}
  }
});

test('collections retain guidance, filters and shared product-card presentation', async () => {
  const dom = await render('collection', '<section class="collection-section"><label class="collection-filter-option"></label></section>');
  try {
    requireStyles(dom.window.document, [...shared, 'collection-guidance.css', 'collection-filters.css'],
      ['contact-locations.css', 'product-media-context.css', 'product-information.css', 'product-knowledge.css']);
  } finally {dom.window.close();}
});

test('rendered contact and editorial content keeps its complete styling on its actual page', async () => {
  const dom = await render('page', '<section class="contact-location-layout"><article class="editorial-location-card"></article></section>');
  try {
    requireStyles(dom.window.document, [...shared, 'about-pages.css', 'contact-locations.css', 'page-migration.css'],
      ['product-media-context.css', 'product-information.css', 'product-knowledge.css', 'collection-filters.css']);
  } finally {dom.window.close();}
});

test('rendered feature sections retain their styles independently of the template name', async () => {
  const body = '<section data-product-media-context><div class="product-information product-knowledge"></div><div class="quantity-input"></div></section>' +
    '<article class="about-page"></article><div class="contact-location-track"></div><label class="collection-filter-option"></label><div class="collection-section"></div><section class="migrated-page"></section>';
  const dom = await render('index', body);
  try {requireStyles(dom.window.document, [...shared, ...features, 'page-migration.css']);} finally {dom.window.close();}
});

test('shared product facts retain their styles when featured outside a collection', async () => {
  const dom = await render('index', '<article class="product-card"><dl class="product-card-facts"><dt>Obermaterial</dt><dd>Textil</dd></dl></article>');
  try {
    requireStyles(dom.window.document, [...shared, 'collection-guidance.css'],
      ['collection-filters.css', 'product-media-context.css', 'contact-locations.css']);
  } finally {dom.window.close();}
});

test('the theme editor can insert feature sections without missing layout styles', async () => {
  const dom = await render('index', '', true);
  try {requireStyles(dom.window.document, [...shared, ...features, 'page-migration.css']);} finally {dom.window.close();}
});

test('about navigation styling remains global when editorial page styles are omitted', () => {
  const menu = readFileSync(path.join(root, 'assets/mega-menu.css'), 'utf8');
  const editorial = readFileSync(path.join(root, 'assets/about-pages.css'), 'utf8');
  assert.equal(editorial.split('\n').filter(line => line.startsWith('.about-menu-')).length, 0);
  const dom = new JSDOM(`<style>${menu}</style><div class="about-menu-grid"><section class="about-menu-group"><h3>Unsere Filialen</h3><ul><li><a class="about-menu-link-all">Alle Filialen</a></li></ul></section></div>`);
  try {
    const style = element => dom.window.getComputedStyle(dom.window.document.querySelector(element));
    assert.equal(style('.about-menu-grid').display, 'grid');
    assert.equal(style('.about-menu-grid').gridTemplateColumns, '1fr 1fr');
    assert.equal(style('.about-menu-group h3').fontSize, '21px');
    assert.equal(style('.about-menu-group a').minHeight, '44px');
    assert.equal(style('.about-menu-link-all').fontWeight, '600');
  } finally {dom.window.close();}
});
