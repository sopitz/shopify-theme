const assert = require('node:assert/strict');
const {readFileSync, readdirSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');
const {Liquid} = require('liquidjs');
const {readThemeJson} = require('./read_theme_json.cjs');

const root = path.resolve(__dirname, '..');
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const sources = Object.fromEntries(['need-navigation', 'main-guide', 'b2b-banner', 'main-b2b'].map(name => [name, readFileSync(path.join(root, 'sections', `${name}.liquid`), 'utf8')]));
const image = (src, alt='') => ({src, alt});
function collection() {
  return {id:301, title:'Aktuelles Sortiment & Auswahl', url:'/de/collections/aktuell', description:'<p>Aktuelle <strong>Collection</strong> &amp; Auswahl.</p>', image:image('/shopify/collection.jpg'), metafields:{upswing:{}}};
}
function page() {
  return {id:401, title:'Aktuelles Thema & Wissen', url:'/de/pages/thema', content:'<p>Aktueller <strong>Seiteninhalt</strong> &amp; Wissen.</p>', metafields:{upswing:{}}};
}
function block(settings, id='binding') {
  return {settings, shopify_attributes:`data-editor-block="${id}"`};
}
async function render(name, {blocks=[], settings={}, editor=false}={}) {
  const engine = new Liquid({root:path.join(root, 'snippets'), extname:'.liquid', strictFilters:true});
  engine.registerFilter('image_url', selected => {
    assert.ok(selected?.src, 'image output must receive the selected resource image or an explicit editorial image');
    return selected.src;
  });
  engine.registerFilter('image_tag', (url, ...attributes) => `<img src="${escape(url)}" alt="${escape(Object.fromEntries(attributes).alt)}">`);
  engine.registerFilter('asset_url', name => `/assets/${name}`);
  engine.registerFilter('default_errors', value => escape(value));
  engine.registerFilter('placeholder_svg_tag', () => '<svg data-placeholder></svg>');
  const source = sources[name].replace(/\{% schema %\}[\s\S]*?\{% endschema %\}/, '')
    .replace(/{%-?\s*form\s[^%]+%}/g, '<form>')
    .replace(/{%-?\s*endform\s*-?%}/g, '</form>');
  const markup = await engine.parseAndRender(source, {
    section:{id:name, settings:{heading:'Auswahl', eyebrow:'WISSEN', description:'Einführung.', advice_heading:'Persönliche Beratung', advice_text:'Wir helfen Ihnen.', ...settings}, blocks},
    request:{design_mode:editor}, routes:{root_url:'/de/', all_products_collection_url:'/de/collections/all'},
  });
  return new JSDOM(markup).window.document;
}

test('need page cards follow the selected Page title, URL, content and live teaser image after an edit', async () => {
  const selected = page();
  selected.metafields.upswing.teaser_image = {type:'file_reference', value:{media_type:'image', preview_image:image('/shopify/page-teaser.jpg', 'Aktuelles Seitenbild')}};
  const blocks = [block({target_type:'page', page:selected, title:'Alter Titel', description:'Alter kopierter Text', url:'/collections/obsolete'})];
  let document = await render('need-navigation', {blocks});
  let card = document.querySelector('a.topic-card');
  assert.equal(card.getAttribute('href'), selected.url);
  assert.equal(card.querySelector('h3').textContent, selected.title);
  assert.equal(card.querySelector('.topic-description').textContent, 'Aktueller Seiteninhalt & Wissen.');
  assert.equal(card.querySelector('img').getAttribute('src'), '/shopify/page-teaser.jpg');
  assert.equal(card.querySelector('img').alt, 'Aktuelles Seitenbild');
  selected.title = 'Geändertes Thema';
  selected.url = '/de/pages/thema-geaendert';
  selected.content = '<p>Geänderter Inhalt direkt aus Shopify.</p>';
  selected.metafields.upswing.teaser_image.value.preview_image = image('/shopify/page-current.jpg');
  document = await render('need-navigation', {blocks});
  card = document.querySelector('a.topic-card');
  assert.equal(card.getAttribute('href'), selected.url);
  assert.equal(card.querySelector('h3').textContent, selected.title);
  assert.equal(card.querySelector('.topic-description').textContent, 'Geänderter Inhalt direkt aus Shopify.');
  assert.equal(card.querySelector('img').getAttribute('src'), '/shopify/page-current.jpg');
  assert.equal(card.querySelector('img').alt, selected.title);
  assert.doesNotMatch(document.body.innerHTML, /Alter Titel|Alter kopierter Text|obsolete/);
});

test('a Page can use an explicit editorial image while its text and link remain bound to the Page', async () => {
  const selected = page();
  selected.metafields.upswing.teaser_image = {type:'file_reference', value:{preview_image:image('/shopify/page-teaser.jpg')}};
  const document = await render('need-navigation', {blocks:[block({target_type:'page', page:selected, image:image('/merchant/editorial.jpg', 'Redaktionelles Bild'), topic_label:'WISSEN', link_label:'Thema lesen'})]});
  const card = document.querySelector('a.topic-card');
  assert.equal(card.getAttribute('href'), selected.url);
  assert.equal(card.querySelector('.topic-title').textContent, selected.title);
  assert.equal(card.querySelector('img').getAttribute('src'), '/merchant/editorial.jpg');
  assert.equal(card.querySelector('img').alt, 'Redaktionelles Bild');
  assert.equal(card.querySelector('.topic-label').textContent, 'WISSEN');
  assert.equal(card.querySelector('.text-link').textContent.trim(), 'Thema lesen');
});

test('need Collection cards use current Shopify data and ignore copied text, URL, editorial image and Page', async () => {
  const selected = collection();
  const blocks = [block({target_type:'collection', collection:selected, page:page(), title:'Alter Collectiontitel', description:'Alte Collectionbeschreibung', url:'/collections/obsolete', image:image('/merchant/page-only.jpg'), fallback_image:'copied-photo.jpg'})];
  let document = await render('need-navigation', {blocks});
  let card = document.querySelector('a.topic-card');
  assert.equal(card.getAttribute('href'), selected.url);
  assert.equal(card.querySelector('.topic-title').textContent, selected.title);
  assert.equal(card.querySelector('.topic-description').textContent, 'Aktuelle Collection & Auswahl.');
  assert.equal(card.querySelector('img').getAttribute('src'), selected.image.src);
  Object.assign(selected, {title:'Umbenannte Collection', url:'/de/collections/umbenannt', description:'<p>Neue Auswahl &amp; Inhalt.</p>', image:image('/shopify/collection-current.jpg', 'Neues Collectionbild')});
  document = await render('need-navigation', {blocks});
  card = document.querySelector('a.topic-card');
  assert.equal(card.getAttribute('href'), selected.url);
  assert.equal(card.querySelector('.topic-title').textContent, selected.title);
  assert.equal(card.querySelector('.topic-description').textContent, 'Neue Auswahl & Inhalt.');
  assert.equal(card.querySelector('img').getAttribute('src'), selected.image.src);
  assert.equal(card.querySelector('img').alt, 'Neues Collectionbild');
  assert.doesNotMatch(document.body.innerHTML, /Alter Collectiontitel|Alte Collectionbeschreibung|obsolete|page-only|copied-photo|Aktuelles Thema/);
});

test('a Collection without its own image or description cannot borrow copied Page or block content', async () => {
  const selected = collection();
  selected.image = null;
  selected.description = '';
  const selectedPage = page();
  selectedPage.metafields.upswing.teaser_image = {type:'file_reference', value:{preview_image:image('/shopify/page-teaser.jpg')}};
  const document = await render('need-navigation', {blocks:[block({target_type:'collection', collection:selected, page:selectedPage, image:image('/old-image.jpg'), description:'Alter Ersatztext'})]});
  const card = document.querySelector('a.topic-card');
  assert.ok(card);
  assert.equal(card.querySelector('img, .topic-description'), null);
  assert.ok(card.querySelector('[data-placeholder]'));
  assert.doesNotMatch(card.textContent, /Seiteninhalt|Alter Ersatztext/);
});

test('deleted and unresolved Collection targets never fall back to a valid Page or copied link', async () => {
  for (const selected of [null, '', 'deleted-handle', {title:'Gelöscht', url:'/collections/deleted'}]) {
    const blocks = [block({target_type:'collection', collection:selected, page:page(), title:'Alt', url:'/collections/old', image:image('/old-image.jpg')})];
    const storefront = await render('need-navigation', {blocks});
    assert.equal(storefront.querySelector('section, a, img'), null);
    const editor = await render('need-navigation', {blocks, editor:true});
    assert.equal(editor.querySelector('a, img'), null);
    assert.equal(editor.querySelectorAll('[data-editor-block]').length, 1);
    assert.match(editor.body.textContent, /Themenziel auswählen/);
  }
});

test('blank and unresolved Page cards remain hidden on the storefront and have editor onboarding', async () => {
  for (const selected of [null, '', 'deleted-page', {title:'Unresolved', url:'/pages/old'}]) {
    const blocks = [block({target_type:'page', page:selected, collection:collection(), image:image('/old-image.jpg'), url:'/old-link'})];
    const storefront = await render('need-navigation', {blocks});
    assert.equal(storefront.querySelector('section, a, img'), null);
    const editor = await render('need-navigation', {blocks, editor:true});
    assert.equal(editor.querySelector('a, img'), null);
    assert.match(editor.body.textContent, /Themenziel auswählen/);
  }
  const storefront = await render('need-navigation');
  assert.equal(storefront.querySelector('section'), null);
  const editor = await render('need-navigation', {editor:true});
  assert.match(editor.body.textContent, /Themen-Seiten oder Collections auswählen/);
});

test('guide cards track their current Collection title, URL and description without copied overrides', async () => {
  const selected = collection();
  const blocks = [block({collection:selected, title:'Alter Titel', description:'Alter Text', url:'/collections/old', icon:'shoe', label:'Auswahl entdecken'})];
  let document = await render('main-guide', {blocks});
  let card = document.querySelector('a.need-card');
  assert.equal(card.getAttribute('href'), selected.url);
  assert.equal(card.querySelector('h2').textContent, selected.title);
  assert.equal(card.querySelector('p').textContent, 'Aktuelle Collection & Auswahl.');
  assert.equal(card.querySelector('.text-link').textContent, 'Auswahl entdecken');
  Object.assign(selected, {title:'Neue Guide-Auswahl', url:'/de/collections/guide-current', description:'<p>Neu gepflegter &amp; richtiger Inhalt.</p>'});
  document = await render('main-guide', {blocks});
  card = document.querySelector('a.need-card');
  assert.equal(card.getAttribute('href'), selected.url);
  assert.equal(card.querySelector('h2').textContent, selected.title);
  assert.equal(card.querySelector('p').textContent, 'Neu gepflegter & richtiger Inhalt.');
  assert.doesNotMatch(document.body.innerHTML, /Alter Titel|Alter Text|\/collections\/old/);
});

test('guide missing links never create catalog fallbacks, while editorial advice remains available', async () => {
  for (const selected of [null, '', 'deleted-handle', {id:300, title:'Missing URL'}, {title:'Missing ID', url:'/collections/old'}]) {
    const blocks = [block({collection:selected, title:'Alt', description:'Alttext', url:'/collections/kybun-schuhe'})];
    const storefront = await render('main-guide', {blocks});
    assert.equal(storefront.querySelector('.need-card, .guide-grid, a[href*="/collections/"], a[href*="/products/"]'), null);
    assert.ok(storefront.querySelector('a[href="/pages/kontakt"]'));
    const editor = await render('main-guide', {blocks, editor:true});
    assert.equal(editor.querySelector('a.need-card, a[href*="/collections/"]'), null);
    assert.match(editor.body.textContent, /Collection auswählen/);
  }
  const storefront = await render('main-guide');
  assert.equal(storefront.querySelector('.need-card, .guide-grid'), null);
  const editor = await render('main-guide', {editor:true});
  assert.match(editor.body.textContent, /Collections für den Produktberater auswählen/);
});

for (const [name, mediaSelector] of [['b2b-banner', '.b2b-media'], ['main-b2b', '.advice-media']]) {
  test(`${name}: missing imagery stays neutral and explicit merchant imagery is respected`, async () => {
    const schema = JSON.parse(sources[name].match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)[1]);
    const settings = Object.fromEntries(schema.settings.filter(item => item.id && Object.hasOwn(item, 'default')).map(item => [item.id, item.default]));
    let document = await render(name, {settings});
    let media = document.querySelector(mediaSelector);
    assert.ok(media.querySelector('[data-placeholder]'), 'unconfigured imagery renders a neutral placeholder');
    assert.equal(media.querySelector('img'), null, 'a theme product photograph cannot substitute for an unconfigured image');
    assert.doesNotMatch(document.body.innerHTML, /kybun|joya|stehmatte|workplace\.jpg/i, 'default business content must not imply a specific product or brand');
    settings.image = image('/merchant/business-upload.jpg', 'Unser Arbeitsplatz');
    document = await render(name, {settings});
    media = document.querySelector(mediaSelector);
    assert.equal(media.querySelectorAll('img').length, 1);
    assert.equal(media.querySelector('img').getAttribute('src'), settings.image.src);
    assert.equal(media.querySelector('[data-placeholder]'), null);
    settings.image = image('/merchant/business-current.jpg');
    document = await render(name, {settings});
    assert.equal(document.querySelector(`${mediaSelector} img`).getAttribute('src'), settings.image.src, 'changing the uploaded image immediately changes the rendered media');
  });
}

const retired = new Set([
  'use_original_fallback', 'fallback_asset', 'fallback_image', 'shipping_note',
  'delivery_stock_days', 'delivery_standard_days', 'delivery_standard_vendors', 'delivery_extended_days', 'delivery_extended_vendors',
  'shipping_threshold',
]);
const catalogTypes = new Set(['product', 'collection', 'product_list', 'collection_list']);
const editorialTypes = new Set(['main-page', 'main-about-page', 'main-article', 'main-blog', 'main-b2b']);
function empty(value) { return value == null || value === '' || (Array.isArray(value) && value.length === 0); }
function checkSettings(values={}, definitions=[], location, editorial=false) {
  const schema = new Map(definitions.filter(item => item.id).map(item => [item.id, item]));
  for (const [id, value] of Object.entries(values)) {
    assert.equal(retired.has(id), false, `${location}/${id}: retired catalog/menu/delivery/shipping setting must be deleted`);
    if (catalogTypes.has(schema.get(id)?.type)) assert.ok(empty(value) || (location === 'templates/index.json/sections/kybun/settings' && id === 'collection' && value === 'kybun-schuhe'), `${location}/${id}: distributed theme must not seed a product or collection handle`);
    if (!editorial && typeof value === 'string') {
      const target = value.match(/\/(products|collections)\/([^/?#"'\s]+)/);
      assert.ok(!target || (target[1] === 'collections' && target[2] === 'all'), `${location}/${id}: fixed catalog URL cannot replace a selected Shopify entity`);
      assert.ok(!/versand/i.test(value) || !/(?:CHF\s*\d|\d+\s*CHF)/i.test(value), `${location}/${id}: no shipped numeric shipping claims`);
    }
  }
}

test('distributed configuration permits only the verified home kybun collection and has no retired fallback promises', () => {
  const schemas = new Map();
  for (const filename of readdirSync(path.join(root, 'sections')).filter(name => name.endsWith('.liquid'))) {
    const source = readFileSync(path.join(root, 'sections', filename), 'utf8');
    const match = source.match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/);
    if (match) schemas.set(filename.replace(/\.liquid$/, ''), JSON.parse(match[1]));
  }
  const globalDefinitions = readThemeJson(path.join(root, 'config/settings_schema.json')).flatMap(group => group.settings || []);
  function checkInstance(instance, location) {
    const schema = schemas.get(instance.type);
    assert.ok(schema, `${location}: section schema exists`);
    const editorial = editorialTypes.has(instance.type);
    checkSettings(instance.settings, schema.settings, `${location}/settings`, editorial);
    for (const [id, child] of Object.entries(instance.blocks || {})) {
      const definition = schema.blocks?.find(item => item.type === child.type);
      checkSettings(child.settings, definition?.settings, `${location}/blocks/${id}/settings`, editorial);
    }
  }
  const settingsData = readThemeJson(path.join(root, 'config/settings_data.json'));
  for (const [name, profile] of Object.entries({current:settingsData.current, ...settingsData.presets})) {
    checkSettings(Object.fromEntries(Object.entries(profile || {}).filter(([id]) => id !== 'sections')), globalDefinitions, `settings_data/${name}`);
    for (const [id, instance] of Object.entries(profile?.sections || {})) checkInstance(instance, `settings_data/${name}/sections/${id}`);
  }
  for (const filename of readdirSync(path.join(root, 'templates')).filter(name => name.endsWith('.json'))) {
    const template = readThemeJson(path.join(root, 'templates', filename));
    for (const [id, instance] of Object.entries(template.sections || {})) checkInstance(instance, `templates/${filename}/sections/${id}`);
  }
  function checkDefaults(definitions=[], location, editorial=false) {
    for (const definition of definitions) {
      if (definition.id && Object.hasOwn(definition, 'default')) checkSettings({[definition.id]:definition.default}, definitions, location, editorial);
      if (definition.id) assert.equal(retired.has(definition.id), false, `${location}/${definition.id}: retired setting cannot be reintroduced`);
    }
  }
  checkDefaults(globalDefinitions, 'settings_schema/defaults');
  for (const [name, schema] of schemas) {
    checkDefaults(schema.settings, `sections/${name}/defaults`, editorialTypes.has(name));
    for (const definition of schema.blocks || []) checkDefaults(definition.settings, `sections/${name}/blocks/${definition.type}/defaults`, editorialTypes.has(name));
    for (const [index, preset] of (schema.presets || []).entries()) checkInstance({type:name, ...preset}, `sections/${name}/presets/${index}`);
  }
});
