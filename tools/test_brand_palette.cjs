const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const schema = JSON.parse(readFileSync(path.join(root, 'config/settings_schema.json')));
const defaults = Object.fromEntries(schema.flatMap(group => group.settings || []).filter(field => field.type === 'color').map(field => [field.id, field.default]));
const current = JSON.parse(readFileSync(path.join(root, 'config/settings_data.json'))).current;
const base = readFileSync(path.join(root, 'assets/upswing.css'), 'utf8');

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return channels.reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
}
function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

for (const [name, palette] of [['editor defaults', defaults], ['shipped configuration', current]]) {
  test(`${name}: primary button text and links meet normal-text contrast`, () => {
    assert.ok(contrast(palette.color_forest, '#ffffff') >= 4.5, 'White primary-button labels must remain readable');
    for (const surface of ['#ffffff', palette.color_cream, palette.color_sage]) {
      assert.ok(contrast(palette.color_link, surface) >= 4.5, 'Links and focus must remain readable on every light surface');
      assert.ok(contrast(palette.color_text, surface) >= 7, 'Body text must retain strong contrast');
      assert.ok(contrast(palette.color_accent, surface) >= 3, 'Logo-coloured icons and large accents need non-text contrast');
    }
  });
}

test('secondary copy and dark-panel copy retain readable contrast in the shared palette', () => {
  const token = name => base.match(new RegExp(`--${name}:(#[a-f0-9]{6})[;}]`, 'i'))[1];
  for (const surface of ['#ffffff', defaults.color_cream, defaults.color_sage]) {
    assert.ok(contrast(token('muted'), surface) >= 4.5);
  }
  assert.ok(contrast(token('on-dark-muted'), defaults.color_text) >= 7);
  assert.ok(contrast('#ffffff', defaults.color_text) >= 7);
});

test('merchant palette settings reach storefront, password and gift-card documents', async () => {
  const engine = new Liquid({root:path.join(root, 'snippets'), extname:'.liquid', strictFilters:true});
  engine.registerFilter('asset_url', name => `/assets/${name}`);
  engine.registerFilter('stylesheet_tag', url => `<link rel="stylesheet" href="${url}">`);
  engine.registerFilter('preload_tag', () => '');
  engine.registerFilter('image_url', image => image?.src || '');
  engine.registerFilter('format_code', value => String(value || ''));
  engine.registerFilter('handle', value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  engine.registerFilter('money_with_currency', value => `CHF ${value || 0}`);
  engine.registerTag('section', {parse() {}, render() {return '';}});
  const settings = {color_forest:'#234567', color_cream:'#f1f2f3', color_sage:'#ddeeff', color_text:'#121212', color_accent:'#0099cc', color_link:'#345678'};
  for (const filename of ['layout/theme.liquid', 'layout/password.liquid', 'templates/gift_card.liquid']) {
    const source = readFileSync(path.join(root, filename), 'utf8').replace('{% layout none %}', '');
    const context = {settings, request:{locale:{iso_code:'de'}}, shop:{name:'Testshop'}, gift_card:{enabled:false}, current_page:1};
    const document = new JSDOM(await engine.parseAndRender(source, context, {globals:context})).window.document;
    assert.equal(document.querySelector('meta[name="theme-color"]').content, settings.color_accent, filename);
    const style = document.querySelector('style').textContent;
    for (const [key, value] of Object.entries(settings)) {
      assert.ok(style.includes(`--${key.replaceAll('_','-')}:${value};`), `${filename}: ${key}`);
    }
    assert.equal(document.querySelectorAll('meta[name="theme-color"]').length, 1, filename);
  }
});
