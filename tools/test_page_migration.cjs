const assert = require('node:assert/strict');
const {readFileSync, readdirSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const {readThemeJson} = require('./read_theme_json.cjs');

const root = path.resolve(__dirname, '..');
// Independent public sitemap/Page inventory captured on 24 November 2026.
const publicHandles = [
  'aktionen', 'anders', 'arbeitsplatz', 'arthrose-und-gelenkschmerzen', 'b2b',
  'bellabambi', 'bellicon', 'bellicon-beratung-buchen', 'bellicon-training-ruti-zh',
  'blackroll', 'blackroll-base-beratung-buchen', 'contact', 'elten',
  'fersensporn-und-andere-fussschmerzen', 'filialubersicht', 'geschichte',
  'gesundheitsschuhe', 'joya', 'kingnature', 'kybun', 'leguano',
  'medical-partner-werden', 'offene-stellen', 'pepup', 'premium-service',
  'regeneration-im-schlaf', 'ruckenschmerzen', 'standort-basel', 'standort-ruti-zh',
  'standort-thun', 'standort-winterthur', 'standort-zurich', 'sypoba-training-in-thun',
  'themen', 'theraband', 'trainingsgeraete', 'upswing-werte',
  'venen-engel-beratung-buchen', 'venenengel', 'versandinformationen', 'vitalitaet',
];
const curatedHandles = ['filialubersicht', 'geschichte', 'offene-stellen',
  'premium-service', 'upswing-werte', 'standort-basel', 'standort-ruti-zh',
  'standort-thun', 'standort-winterthur', 'standort-zurich'];
const source = name => readFileSync(path.join(root, 'sections', `${name}.liquid`), 'utf8');
const stripSchema = text => text.replace(/{% schema %}[\s\S]*?{% endschema %}/g, '');
const schema = name => JSON.parse(source(name).match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
const defaults = name => Object.fromEntries((schema(name).settings || []).filter(field => 'default' in field).map(field => [field.id, field.default]));
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const nativeBody = '<section data-native-body><h2>Native &amp; unverändert ✅</h2><p>Eigenständiger Seiteninhalt.</p></section>';

function engine() {
  const liquid = new Liquid({root:path.join(root, 'snippets'), extname:'.liquid', strictFilters:true});
  liquid.registerFilter('asset_url', name => `/assets/${name}`);
  liquid.registerFilter('file_img_url', name => `https://upswing.ch/cdn/shop/files/${name}?width=1600`);
  liquid.registerFilter('stylesheet_tag', url => `<link rel="stylesheet" href="${escape(url)}">`);
  liquid.registerFilter('script_tag', url => `<script src="${escape(url)}"></script>`);
  liquid.registerFilter('image_url', image => image?.src || image?.url || String(image || ''));
  liquid.registerFilter('image_tag', (url, ...attributes) => `<img src="${escape(url)}" alt="${escape(Object.fromEntries(attributes).alt)}">`);
  liquid.registerFilter('placeholder_svg_tag', () => '<svg data-placeholder></svg>');
  liquid.registerFilter('money_with_currency', value => `CHF ${(Number(value) / 100).toFixed(2)}`);
  liquid.registerFilter('money', value => `CHF ${(Number(value) / 100).toFixed(2)}`);
  liquid.registerFilter('metafield_tag', field => escape(field?.value));
  liquid.registerFilter('default_errors', () => 'Formularfehler');
  liquid.registerFilter('handleize', text => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  // Local adapter keeps real form fields and control flow; it never submits.
  liquid.registerTag('form', {parse() {}, render() {return '<form data-shopify-contact>';}});
  liquid.registerTag('endform', {parse() {}, render() {return '</form>';}});
  // Routing fixtures have no catalogue pagination; the configurator owns its
  // separate complete-catalogue tests. Recognize these Shopify-only tags here.
  liquid.registerTag('paginate', {parse() {}, render() {return '';}});
  liquid.registerTag('endpaginate', {parse() {}, render() {return '';}});
  return liquid;
}

function context(handle, overrides = {}) {
  return {
    page:{id:1, handle, title:`Seite ${handle}`, url:`/pages/${handle}`, content:'', metafields:{}},
    section:{id:'PageMigrationQA', settings:{}, blocks:[]},
    settings:{contact_phone:'+41 33 222 50 50', contact_email:'info@upswing.ch'},
    request:{page_type:'page', design_mode:false}, routes:{root_url:'/', cart_add_url:'/cart/add'},
    shop:{name:'upswing', currency:'CHF'}, collections:{}, all_products:{},
    ...overrides,
  };
}

async function renderSection(name, handle, {settings = {}, blocks = [], content = '', ...extra} = {}) {
  const ctx = context(handle, extra);
  ctx.page = {...ctx.page, content};
  ctx.section = {id:'PageMigrationQA', settings:{...defaults(name), ...settings}, blocks};
  return new JSDOM(await engine().parseAndRender(stripSchema(source(name)), ctx));
}

async function family(handle, options = {}) {
  return (await engine().parseAndRender("{% render 'page-migration-family', page:page, section:section, respect_editorial:respect_editorial, include_editorial:include_editorial %}", context(handle, options))).trim();
}

test('exact captured handles have routes; native content and unknown handles never receive an arbitrary replacement', async () => {
  assert.equal(publicHandles.length, 41);
  for (const handle of publicHandles) {
    assert.ok(await family(handle, {include_editorial:true}), `missing route: ${handle}`);
    if (curatedHandles.includes(handle)) assert.equal(await family(handle), '', 'default curated branch remains separate');
    else assert.match(await family(handle), /^(brand|topic-hub|service)$/);
    assert.equal(await family(handle, {page:{handle, content:nativeBody}, include_editorial:true}), '', `native body must win: ${handle}`);
  }
  for (const handle of ['new-brand', 'KYBUN', 'kybun-extra', '', 'standort-neu']) {
    assert.equal(await family(handle, {include_editorial:true}), '');
  }
});

test('explicit editorial replacement settings and blocks prevent the empty-body fallback', async () => {
  const overrides = [
    {settings:{content_source:'editor'}, blocks:[]},
    {settings:{heading:'Eigener Aufbau'}, blocks:[]},
    {settings:{intro:'<p>Eigener Einstieg.</p>'}, blocks:[]},
    {settings:{image:{src:'/own.jpg'}}, blocks:[]},
    {settings:{eyebrow:'Eigene Dachzeile'}, blocks:[]},
    {settings:{}, blocks:[{type:'text', settings:{content:'<p>Eigener Block.</p>'}}]},
  ];
  for (const section of overrides) assert.equal(await family('kybun', {section, respect_editorial:true}), '');
  assert.equal(await family('kybun', {section:{settings:{content_source:'page'}, blocks:[]}, respect_editorial:true}), 'brand');
  // Legacy B2B/bookings defaults are not an explicit editorial replacement.
  assert.equal(await family('kybun', {section:overrides[1]}), 'brand');
});

test('all 41 empty-body public pages render their own complete route through the default template', async () => {
  const issues = [];
  for (const handle of publicHandles) {
    const dom = await renderSection('main-page', handle);
    try {
      const document = dom.window.document;
      if (document.querySelectorAll('h1').length !== 1) issues.push(`${handle}: expected one primary heading, got ${document.querySelectorAll('h1').length}`);
      if (curatedHandles.includes(handle)) {
        if (!document.querySelector('.about-page')) issues.push(`${handle}: missing existing curated design`);
      } else if (!document.querySelector('.migrated-page')) issues.push(`${handle}: missing migrated family body`);
      if (document.querySelector('.page-section')) issues.push(`${handle}: title-only default fallback`);
    } finally {dom.window.close();}
  }
  assert.deepEqual(issues, []);
});

test('unknown and populated family Pages keep native content once with no migrated source', async () => {
  for (const handle of ['kybun', 'b2b', 'contact', 'new-page']) {
    const dom = await renderSection('main-page', handle, {content:nativeBody});
    try {
      const document = dom.window.document;
      assert.equal(document.querySelectorAll('[data-native-body]').length, 1);
      assert.equal(document.querySelector('[data-native-body]').outerHTML, JSDOM.fragment(nativeBody).firstChild.outerHTML);
      assert.equal(document.querySelector('.migrated-page'), null);
      assert.equal(document.querySelectorAll('h1').length, 1);
    } finally {dom.window.close();}
  }
});

test('main-page and main-about-page render an explicit editor body instead of the migrated family', async () => {
  for (const name of ['main-page', 'main-about-page']) {
    const dom = await renderSection(name, 'kybun', {
      content:nativeBody, settings:{content_source:'editor', heading:'Mein eigener Aufbau'},
      blocks:[{type:'text', settings:{heading:'Eigener Abschnitt', content:'<p data-editor-copy>Mein eigener Inhalt.</p>'}}],
    });
    try {
      const document = dom.window.document;
      assert.equal(document.querySelector('h1').textContent, 'Mein eigener Aufbau');
      assert.equal(document.querySelectorAll('[data-editor-copy]').length, 1);
      assert.equal(document.querySelector('.migrated-page, [data-native-body]'), null);
    } finally {dom.window.close();}
  }
});

test('each existing Page template routes a known empty brand Page without an unrelated legacy body', async () => {
  const files = readdirSync(path.join(root, 'templates')).filter(file => /^page(?:\..+)?\.json$/.test(file));
  assert.equal(files.length, 16);
  for (const file of files) {
    const template = readThemeJson(path.join(root, 'templates', file));
    const main = template.sections[template.order[0]];
    const dom = await renderSection(main.type, 'kybun', {settings:main.settings || {}, blocks:(main.block_order || []).map(id => ({id, ...main.blocks[id]}))});
    try {
      const document = dom.window.document;
      assert.ok(document.querySelector('.migrated-page'), `${file}: migration body`);
      assert.equal(document.querySelectorAll('h1').length, 1, file);
      assert.equal(document.querySelector('form, .b2b-process, .consultation-bookings-grid'), null, `${file}: no unrelated legacy content`);
    } finally {dom.window.close();}
  }
});

test('contact routes keep exactly one real contact form even through a different existing suffix', async () => {
  for (const name of ['main-page', 'main-about-page', 'main-b2b', 'main-contact', 'main-guide', 'consultation-bookings']) {
    const dom = await renderSection(name, 'contact');
    try {
      const document = dom.window.document;
      assert.equal(document.querySelectorAll('form[data-shopify-contact]').length, 1, name);
      assert.equal(document.querySelectorAll('[name="contact[email]"]').length, 1, name);
      assert.equal(document.querySelector('h1').textContent, 'Seite contact', `${name}: native title wins over unrelated section defaults`);
      for (const label of document.querySelectorAll('label[for]')) assert.ok(document.getElementById(label.htmlFor), `${name}: label target ${label.htmlFor}`);
      const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
      assert.equal(ids.length, new Set(ids).size, `${name}: unique contact IDs`);
    } finally {dom.window.close();}
  }
});

test('existing curated handles keep their design even through a different legacy section type', async () => {
  for (const name of ['main-b2b', 'main-contact', 'main-guide', 'consultation-bookings']) {
    const dom = await renderSection(name, 'geschichte');
    try {
      const document = dom.window.document;
      assert.ok(document.querySelector('.about-page'), name);
      assert.equal(document.querySelectorAll('h1').length, 1, name);
      assert.equal(document.querySelector('form, .b2b-process, .consultation-bookings-grid'), null, `${name}: no unrelated legacy content`);
    } finally {dom.window.close();}
  }
});

test('legacy product/advice extras hide only for opted-in migrated Page contexts', async () => {
  const selected = {id:9, title:'Echte Kollektion', url:'/collections/native', products_count:1,
    products:[{id:8, title:'Echtes Produkt', handle:'native', url:'/products/native', price:10000, available:true, description:'<p>Aktueller Text.</p>', images:[], metafields:{}}]};
  for (const name of ['featured-products', 'advice-banner']) {
    const render = (handle, content, enabled, request = {page_type:'page', design_mode:false}) => renderSection(name, handle, {content, settings:{hide_on_migrated_page:enabled, collection:selected}, request});
    let dom = await render('kybun', '', true);
    assert.equal(dom.window.document.querySelector('section'), null, `${name}: no duplicate area`);
    dom.window.close();
    for (const args of [['kybun', nativeBody, true], ['unknown', '', true], ['kybun', '', false], ['kybun', '', true, {page_type:'index', design_mode:false}]]) {
      dom = await render(...args);
      assert.ok(dom.window.document.querySelector('section'), `${name}: preserve normal/explicit content ${JSON.stringify(args)}`);
      dom.window.close();
    }
  }
  for (const suffix of ['kybun', 'marke', 'thema']) {
    const template = readThemeJson(path.join(root, 'templates', `page.${suffix}.json`));
    assert.equal(template.sections.models.settings.hide_on_migrated_page, true);
    assert.equal(template.sections.advice.settings.hide_on_migrated_page, true);
  }
});

test('all family snippets leave unsupported handles empty', async () => {
  for (const name of ['migrated-brand-pages', 'migrated-topic-hub-pages', 'migrated-service-pages']) {
    const result = await engine().parseAndRender(`{% render '${name}', page:page, section:section %}`, context('unknown-page'));
    assert.equal(result.trim(), '', name);
  }
});
