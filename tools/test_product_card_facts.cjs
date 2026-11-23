const assert = require('node:assert/strict');
const path = require('node:path');
const {test} = require('node:test');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');

const engine = new Liquid({root: path.resolve(__dirname, '../snippets'), extname: '.liquid', strictFilters: true});
engine.registerFilter('image_url', image => image.src);
engine.registerFilter('image_tag', url => `<img src="${url}" alt="">`);
engine.registerFilter('money_with_currency', value => `CHF ${(Number(value) / 100).toFixed(2)}`);
engine.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
engine.registerFilter('metafield_tag', () => {throw new Error('Card facts must not render rich-text fields');});
const typed = (value, type = 'single_line_text_field') => ({type, value});
const product = fields => ({
  id: 1, handle: 'verified-product', title: 'Titel ohne Merkmalsableitung', vendor: 'Marke',
  url: '/products/verified-product', available: true, price: 12000, price_min: 12000, price_max: 12000,
  images: [], options_with_values: [], tags: ['cf_de_CH_Passform_2'],
  description: '<p>Der vorhandene Kurztext bleibt die Rückfallebene.</p>',
  metafields: {upswing: {}, custom_fields: {}, fixture: fields || {}},
});
const settings = {card_facts: true, card_fact_1_key: 'fixture.sole', card_fact_1_label: 'Sohle', card_fact_2_key: 'fixture.fit', card_fact_2_label: 'Passform'};
async function render(values = {}, fields) {
  return new JSDOM(await engine.renderFile('product-card', {product: product(fields), ...values}));
}
const rows = document => [...document.querySelectorAll('.product-card-facts > div')].map(row => [row.querySelector('dt').textContent, row.querySelector('dd').textContent]);

test('configured typed facts replace generic copy while labels and values stay escaped', async () => {
  const dom = await render({...settings, card_fact_1_label: 'Sohle <Details>'}, {sole: typed('Strato & <b>weich</b>'), fit: typed(['Weit', 'Standard'], 'list.single_line_text_field')});
  try {
    const document = dom.window.document;
    assert.deepEqual(rows(document), [['Sohle <Details>', 'Strato & <b>weich</b>'], ['Passform', 'Weit, Standard']]);
    assert.equal(document.querySelector('.product-copy'), null);
    assert.equal(document.querySelector('.product-card-facts b'), null);
    assert.equal(document.querySelector('.product-title').textContent, 'Titel ohne Merkmalsableitung');
    assert.equal(document.querySelector('.product-price').textContent.trim(), 'CHF 120.00');
  } finally {dom.window.close();}
});

test('other card contexts and an explicitly disabled option retain their original copy', async () => {
  for (const flag of [undefined, false]) {
    const dom = await render({...settings, card_facts: flag}, {sole: typed('Vorhandener Wert'), fit: typed('Weit')});
    try {
      assert.equal(dom.window.document.querySelector('.product-card-facts'), null);
      assert.equal(dom.window.document.querySelector('.product-copy').textContent, 'Der vorhandene Kurztext bleibt die Rückfallebene.');
    } finally {dom.window.close();}
  }
});

test('missing, unsupported and untyped fields do not produce empty facts or guessed tag values', async () => {
  const cases = [
    {}, {sole: typed('   '), fit: typed([],'list.single_line_text_field')},
    {sole: typed({label:'Objekt nie anzeigen'}, 'json'), fit: typed({label:'Falscher Skalar'})},
    {sole: typed('Richtext nicht als Einzelmerkmal', 'rich_text_field'), fit: {value:'Ohne bestätigten Typ'}},
    {sole: typed(' '), fit: typed(['',' '], 'list.single_line_text_field')},
  ];
  for (const fields of cases) {
    const dom = await render(settings, fields);
    try {
      assert.equal(dom.window.document.querySelector('.product-card-facts'), null);
      assert.ok(dom.window.document.querySelector('.product-copy'));
      assert.doesNotMatch(dom.window.document.body.textContent, /\[object Object\]|cf_de_CH_Passform_2|Objekt nie anzeigen/);
    } finally {dom.window.close();}
  }
});

test('malformed paths and blank labels are omitted rather than interpreted as other sources', async () => {
  for (const key of ['', 'sole', '.sole', 'fixture.', 'fixture.sole.extra', 'fixture.sole.']) {
    const dom = await render({...settings, card_fact_1_key: key, card_fact_2_label: ''}, {sole: typed('Kein Ersatzwert')});
    try {assert.equal(dom.window.document.querySelector('.product-card-facts'), null);} finally {dom.window.close();}
  }
});

test('one valid fact is sufficient, repeated keys are not duplicated and typed false or zero remain valid', async () => {
  const variants = [
    [{...settings}, {fit: typed('Weit')}, [['Passform','Weit']]],
    [{...settings, card_fact_2_key: 'fixture.sole'}, {sole: typed('Strato')}, [['Sohle','Strato']]],
    [{...settings}, {sole: typed(false,'boolean'), fit: typed(0,'number_integer')}, [['Sohle','Nein'],['Passform','0']]],
  ];
  for (const [options, fields, expected] of variants) {
    const dom = await render(options, fields);
    try {
      assert.deepEqual(rows(dom.window.document), expected);
      assert.equal(dom.window.document.querySelector('.product-copy'), null);
    } finally {dom.window.close();}
  }
});
