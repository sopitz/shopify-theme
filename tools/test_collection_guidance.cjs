const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const {readThemeJson} = require('./read_theme_json.cjs');

const repo = path.resolve(__dirname, '..');
const source = readFileSync(path.join(repo, 'sections/main-collection.liquid'), 'utf8');
const schema = JSON.parse(source.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
const defaults = Object.fromEntries(schema.settings.filter(field => 'default' in field).map(field => [field.id, field.default]));
const nativeDefinition = name => readThemeJson(path.join(repo, `templates/collection${name ? `.${name}` : ''}.json`)).sections.main;
const editorDefinition = () => {const definition = structuredClone(nativeDefinition('kybun')); definition.settings.content_source = 'editor'; return definition;};
const originalDescription = '<h2>Unveränderte Kategoriedetails</h2><p><strong>Vollständiger Originaltext</strong> mit &amp; und <em>Formatierung</em>.</p><ul><li>Eine vorhandene Eigenschaft.</li></ul><p><a href="/pages/kontakt">Vorhandener Beratungslink</a></p>';
const normalizedDescription = JSDOM.fragment(`<div>${originalDescription}</div>`).firstChild.innerHTML;
const engine = new Liquid({root: path.join(repo, 'snippets'), extname: '.liquid', strictFilters: true});
engine.registerFilter('default_pagination', () => '<span class="current">1</span>');
engine.registerFilter('money_with_currency', value => `CHF ${(Number(value || 0) / 100).toFixed(2)}`);

async function render(definition, overrides = {}) {
  const blocks = (definition.block_order || []).map(id => ({id, ...definition.blocks[id]}));
  const context = {
    section: {id: 'GuidanceQA', settings: {...defaults, ...definition.settings}, blocks},
    routes: {root_url: '/'}, cart: {currency: {iso_code: 'CHF'}}, settings: {},
    paginate: {pages: 1, page_param: 'page', current_page: 1},
    collection: {
      title: 'kybun Schuhe', url: '/collections/kybun-schuhe', description: originalDescription,
      products: [], products_count: 0, filters: [], sort_options: [], default_sort_by: 'manual',
      ...overrides,
    },
  };
  const localSource = source.replace(/{% schema %}[\s\S]*?{% endschema %}/, '')
    .replace(/{%-?\s*paginate\s+[^%]+%-?}/g, '').replace(/{%-?\s*endpaginate\s*-?%}/g, '');
  return new JSDOM(await engine.parseAndRender(localSource, context, {globals: context}));
}

function assertOriginalOnce(document, inDetails) {
  const copies = document.querySelectorAll('.collection-description');
  assert.equal(copies.length, 1);
  assert.equal(copies[0].innerHTML, normalizedDescription);
  assert.equal(document.body.textContent.split('Vollständiger Originaltext').length - 1, 1);
  assert.equal(Boolean(copies[0].closest('details')), inDetails);
  assert.equal(document.querySelector('.collection-header .collection-description'), null);
}
function assertJumpTargets(document) {
  for (const link of document.querySelectorAll('.collection-shortcuts a[href^="#"]')) {
    const id = link.getAttribute('href').slice(1);
    assert.ok(document.getElementById(id), `Missing destination for ${link.getAttribute('href')}`);
  }
}

test('explicit editor mode renders optional guidance, FAQs and existing jump destinations', async () => {
  const definition = editorDefinition();
  const dom = await render(definition);
  try {
    const document = dom.window.document;
    assert.ok(document.querySelector('.collection-intro'));
    assert.equal(document.querySelectorAll('.collection-guide-card').length, Object.values(definition.blocks).filter(block => block.type === 'guide').length);
    assert.equal(document.querySelectorAll('.collection-faq-item').length, Object.values(definition.blocks).filter(block => block.type === 'faq').length);
    assert.equal(document.querySelector('.collection-buying-guide h2').textContent, definition.settings.guide_heading);
    assert.equal(document.querySelector('.collection-faq h2').textContent, definition.settings.faq_heading);
    assertJumpTargets(document);
    assert.ok(document.querySelector('.collection-results').compareDocumentPosition(document.querySelector('.collection-buying-guide')) & 4);
    assert.ok(document.querySelector('.collection-description-block').compareDocumentPosition(document.querySelector('.collection-faq')) & 4);
    assertOriginalOnce(document, false);
    assert.equal(document.querySelector('.collection-faq a[href="/pages/filialubersicht#Filialen"]').textContent, 'Filialen und Beratung ansehen');
    const configuredLinks = definition.block_order.filter(id => definition.blocks[id].type === 'faq').flatMap(id => [...JSDOM.fragment(definition.blocks[id].settings.answer).querySelectorAll('a[href]')].map(link => link.getAttribute('href')));
    assert.deepEqual([...document.querySelectorAll('.collection-faq a[href]')].map(link => link.getAttribute('href')), configuredLinks);
    assert.equal(document.querySelector('.collection-faq a[href*="/collections/"]'), null, 'An unbound optional collection cannot become a fixed catalogue link');
  } finally {dom.window.close();}
});

test('generic collection settings do not acquire kybun content or empty guidance sections', async () => {
  const dom = await render(nativeDefinition(''), {title: 'BLACKROLL', url: '/collections/blackroll'});
  try {
    const document = dom.window.document;
    assert.equal(document.querySelector('.collection-intro, .collection-buying-guide, .collection-faq'), null);
    assert.doesNotMatch(document.body.textContent, /kybun|Tropo|Strato/);
    assertOriginalOnce(document, false);
  } finally {dom.window.close();}
});

test('blank rich-text content omits its sections and links while the complete original remains visible', async () => {
  for (const blank of ['', '   ', '<p></p>', '<p><br></p>', '<p>&nbsp;</p>', '<p>&#160;</p>', '<p>&#xA0;</p>', '<p>&#xa0;</p>', '<p> </p>']) {
    const definition = editorDefinition();
    definition.settings.intro_text = blank;
    for (const block of Object.values(definition.blocks)) {
      if (block.type === 'guide') block.settings.body = blank;
      if (block.type === 'faq') block.settings.answer = blank;
    }
    const dom = await render(definition);
    try {
      const document = dom.window.document;
      assert.equal(document.querySelector('.collection-intro, .collection-buying-guide, .collection-faq'), null, `Empty rich text must not render: ${blank}`);
      const links = [...document.querySelectorAll('.collection-shortcuts a')];
      assert.deepEqual(links.map(link => link.getAttribute('href')), ['#CollectionProducts-GuidanceQA', '#CollectionDescription-GuidanceQA']);
      assertJumpTargets(document);
      assertOriginalOnce(document, false);
    } finally {dom.window.close();}
  }
});

test('an optional FAQ collection uses the resolved current URL and an escaped link label', async () => {
  const definition = editorDefinition();
  const rental = definition.blocks.rental;
  rental.settings.related_collection = {id: 42, title: 'Aktuelle Kollektion', url: '/de/collections/aktuell-benannt?view=beratung&sort_by=manual'};
  rental.settings.link_label = 'Miet-Angebot <b>ansehen</b> & vergleichen';
  const dom = await render(definition);
  try {
    const document = dom.window.document;
    const item = [...document.querySelectorAll('.collection-faq-item')].find(item => item.querySelector('summary').textContent.trim() === rental.settings.question);
    const link = item.querySelector('a');
    assert.equal(link.getAttribute('href'), rental.settings.related_collection.url);
    assert.equal(link.textContent, rental.settings.link_label);
    assert.equal(link.querySelector('b'), null);
    assert.equal(item.querySelectorAll('a').length, 1);
  } finally {dom.window.close();}
});

test('missing, deleted or unresolved FAQ collection resources omit the link without a catalogue fallback', async () => {
  for (const related of [undefined, null, 'deleted-collection-handle', {}, {url: ''}]) {
    const definition = editorDefinition();
    definition.blocks.rental.settings.related_collection = related;
    const dom = await render(definition);
    try {
      const document = dom.window.document;
      const item = [...document.querySelectorAll('.collection-faq-item')].find(item => item.querySelector('summary').textContent.trim() === definition.blocks.rental.settings.question);
      assert.ok(item, 'The useful answer remains visible without the optional collection');
      assert.equal(item.querySelector('a'), null);
      assertOriginalOnce(document, false);
    } finally {dom.window.close();}
  }
});

test('either a guide or a FAQ can stand alone without broken links or a duplicated original description', async () => {
  for (const type of ['guide', 'faq']) {
    const definition = editorDefinition();
    definition.block_order = definition.block_order.filter(id => definition.blocks[id].type === type);
    const dom = await render(definition);
    try {
      const document = dom.window.document;
      assert.equal(Boolean(document.querySelector('.collection-buying-guide')), type === 'guide');
      assert.equal(Boolean(document.querySelector('.collection-faq')), type === 'faq');
      assertJumpTargets(document);
      assertOriginalOnce(document, false);
    } finally {dom.window.close();}
  }
});

test('merchant-provided headings, questions and navigation labels remain escaped text', async () => {
  const definition = editorDefinition();
  definition.settings.guide_heading = 'Auswahl <img src=x> & Beratung';
  definition.settings.faq_heading = 'Fragen <script>unerwünscht</script>';
  definition.settings.products_link_label = 'Schuhe <b>ansehen</b>';
  definition.settings.guide_link_label = 'Sohlen <em>vergleichen</em>';
  const guide = Object.values(definition.blocks).find(block => block.type === 'guide');
  const faq = Object.values(definition.blocks).find(block => block.type === 'faq');
  guide.settings.heading = 'Sohle <em>weich</em> & stabil';
  faq.settings.question = 'Welche <b>Sohle</b> passt?';
  const dom = await render(definition);
  try {
    const document = dom.window.document;
    assert.equal(document.querySelector('.collection-buying-guide h2').textContent, definition.settings.guide_heading);
    assert.equal(document.querySelector('.collection-faq h2').textContent, definition.settings.faq_heading);
    assert.equal(document.querySelector('.collection-guide-card h3').textContent, guide.settings.heading);
    assert.equal(document.querySelector('.collection-faq-item summary').textContent.trim(), faq.settings.question);
    assert.equal(document.querySelector('.collection-shortcuts a').textContent.trim(), definition.settings.products_link_label);
    assert.equal(document.querySelector('.collection-shortcuts a[href^="#CollectionGuide-"]').textContent.trim(), definition.settings.guide_link_label);
    assert.equal(document.querySelector('.collection-guidance-heading img, .collection-faq h2 script, .collection-guide-card h3 em, .collection-faq-item summary b, .collection-shortcuts b, .collection-shortcuts em'), null);
  } finally {dom.window.close();}
});

test('the default AICO source preserves the native text once and does not add repeated editor content', async () => {
  const definition = nativeDefinition('kybun');
  const dom = await render(definition, {metafields: {custom_fields: {faq: {type:'json',value:[]},good_to_know:{type:'json',value:[]}}}});
  try {
    const document = dom.window.document;
    assert.ok(document.querySelector('.collection-intro'));
    assert.equal(document.querySelector('.collection-buying-guide,.collection-faq,.collection-description-details'), null);
    assertOriginalOnce(document, false);
    assertJumpTargets(document);
    assert.doesNotMatch(document.body.textContent, /Mehr über|Die Tropo-Sohle|Wo kann ich kybun Schuhe ausprobieren/);
  } finally {dom.window.close();}
});

test('existing native FAQ questions retain their content once and receive a working native jump destination', async () => {
  const description = '<p>Vorhandene Einleitung.</p><h2>Häufige Fragen</h2><p><strong>Welche Sohle passt?</strong><br>Die vorhandene Antwort mit <a href="/pages/beratung">Beratung</a>.</p>';
  const dom = await render(nativeDefinition('kybun'), {description});
  try {
    const document = dom.window.document;
    assert.equal(document.querySelectorAll('.collection-description').length,1);
    assert.equal(document.querySelector('.collection-faq'),null);
    assert.equal(document.body.textContent.split('Welche Sohle passt?').length - 1,1);
    assert.equal(document.querySelector('#CollectionNativeFaq-GuidanceQA').textContent,'Häufige Fragen');
    assert.ok(document.querySelector('.collection-shortcuts a[href="#CollectionNativeFaq-GuidanceQA"]'));
    assert.ok(document.querySelector('.collection-description a[href="/pages/beratung"]'));
    assertJumpTargets(document);
  } finally {dom.window.close();}
});

test('typed AICO question/answer arrays supply unique additional information on the generic collection template', async () => {
  const custom_fields = {
    faq: {type:'json',value:[
      {question:'Unveränderte Kategoriedetails',answer:'Nicht erneut ausgeben.'},
      {question:'Eine neue Frage?',answer:'<p>Eine Antwort mit <strong>Formatierung</strong>.</p>'},
      {question:'Eine neue Frage?',answer:'<p>Eine Antwort mit <strong>Formatierung</strong>.</p>'},
    ]},
    good_to_know: {type:'json',value:[{question:'Ein vorhandener Tipp',answer:'<p>Nur aus dem synchronisierten Feld.</p>'}]},
  };
  const dom = await render(nativeDefinition(''),{title:'AICO-Kollektion',metafields:{custom_fields}});
  try {
    const document=dom.window.document;
    assert.equal(document.querySelectorAll('.collection-faq-item').length,1);
    assert.equal(document.querySelector('.collection-faq-item summary').textContent.trim(),'Eine neue Frage?');
    assert.equal(document.querySelector('.collection-guide-card h3').textContent,'Ein vorhandener Tipp');
    assert.equal(document.querySelector('.collection-buying-guide h2').textContent,'Gut zu wissen');
    assert.equal(document.querySelector('.collection-faq h2').textContent,'Weitere Fragen & Antworten');
    assert.ok(document.querySelector('.collection-description-block').compareDocumentPosition(document.querySelector('.collection-faq')) & 4);
    assertJumpTargets(document);
    assertOriginalOnce(document,false);
  } finally {dom.window.close();}
});

test('empty description allows the prepared editor fallback but valid AICO arrays take priority independently', async () => {
  const definition=nativeDefinition('kybun');
  const dom=await render(definition,{description:'',metafields:{custom_fields:{faq:{type:'json',value:[{question:'Aus AICO?',answer:'Ja, bestätigt.'}]},good_to_know:{type:'json',value:[]}}}});
  try {
    const document=dom.window.document;
    assert.equal(document.querySelector('.collection-description-block'),null);
    assert.equal(document.querySelectorAll('.collection-guide-card').length,2);
    assert.equal(document.querySelectorAll('.collection-faq-item').length,1);
    assert.equal(document.querySelector('.collection-faq-item summary').textContent.trim(),'Aus AICO?');
    assertJumpTargets(document);
  } finally {dom.window.close();}
});
