const assert = require('node:assert/strict');
const {readFileSync, readdirSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');
const {Liquid} = require('liquidjs');

const root = path.resolve(__dirname, '..');
const source = readFileSync(path.join(root, 'sections/main-cart.liquid'), 'utf8');
const schema = JSON.parse(source.match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)[1]);
const defaults = Object.fromEntries(schema.settings.filter(setting => 'default' in setting).map(setting => [setting.id, setting.default]));

function cart(total) {
  const item = {key:'1:a', url:'/products/kybun', url_to_remove:'/cart/change?line=1&quantity=0', quantity:1, image:null, options_with_values:[], properties:{}, line_level_discount_allocations:[], original_price:total, final_price:total, original_line_price:total, final_line_price:total, variant:{quantity_rule:{min:1, increment:1}}, product:{title:'kybun Schuh', vendor:'kybun', has_only_default_variant:true, metafields:{upswing:{}}}};
  return {item_count:1, items:[item], items_subtotal_price:total, total_price:total, cart_level_discount_applications:[], taxes_included:true, note:''};
}
async function render(total, settings = {}) {
  const engine = new Liquid({root:path.join(root, 'snippets'), extname:'.liquid', strictFilters:true});
  engine.registerFilter('money_with_currency', value => `CHF ${(Number(value) / 100).toFixed(2)}`);
  engine.registerFilter('image_url', image => image?.src);
  engine.registerFilter('image_tag', url => `<img src="${url}">`);
  engine.registerFilter('placeholder_svg_tag', () => '<svg data-placeholder></svg>');
  engine.registerFilter('payment_type_svg_tag', () => '<svg data-payment></svg>');
  engine.registerFilter('asset_url', name => `/assets/${name}`);
  // Shopify globals stay visible inside {% render %}; liquidjs only passes them through `globals`.
  const markup = await engine.parseAndRender(source.replace(/\{% schema %\}[\s\S]*?\{% endschema %\}/, ''), {section:{id:'main', settings:{...defaults, ...settings}}}, {globals:{
    cart:cart(total), shop:{enabled_payment_types:[]}, routes:{cart_url:'/cart', all_products_collection_url:'/collections/all'},
  }});
  return new JSDOM(markup).window.document;
}
const line = document => document.querySelector('.cart-summary .cart-free-shipping');
const text = node => node.textContent.replace(/\s+/g, ' ').trim();

test('schema defaults match the Post Economy rate of the shop', () => {
  assert.equal(defaults.free_shipping_threshold, 99);
  assert.equal(defaults.free_shipping_method, 'Post Economy');
  assert.equal(schema.settings.find(setting => setting.id === 'free_shipping_threshold').type, 'number');
});

test('below the threshold the cart names the missing amount', async () => {
  const document = await render(8700);
  assert.equal(text(line(document)), 'Noch CHF 12.00 bis zum kostenlosen Versand mit Post Economy.');
  assert.equal(line(document).classList.contains('is-reached'), false);
  assert.ok(line(document).querySelector('svg.icon'));
});

test('from the threshold on the cart promises free shipping for the configured method only', async () => {
  for (const total of [9900, 25000]) {
    const document = await render(total);
    assert.equal(text(line(document)), 'Kostenloser Versand mit Post Economy');
    assert.ok(line(document).classList.contains('is-reached'));
  }
});

test('the threshold follows the editor setting, including decimal amounts', async () => {
  assert.equal(text(line(await render(14999, {free_shipping_threshold:150}))), 'Noch CHF 0.01 bis zum kostenlosen Versand mit Post Economy.');
  assert.equal(text(line(await render(9949, {free_shipping_threshold:99.5}))), 'Noch CHF 0.01 bis zum kostenlosen Versand mit Post Economy.');
  assert.match(text(line(await render(9950, {free_shipping_threshold:99.5}))), /^Kostenloser Versand/);
});

test('blank or zero threshold hides the line and a blank method drops the suffix', async () => {
  assert.equal(line(await render(25000, {free_shipping_threshold:0})), null);
  assert.equal(line(await render(25000, {free_shipping_threshold:null})), null);
  assert.equal(text(line(await render(25000, {free_shipping_method:'  '}))), 'Kostenloser Versand');
  assert.equal(text(line(await render(5000, {free_shipping_method:''}))), 'Noch CHF 49.00 bis zum kostenlosen Versand.');
  assert.equal(text(line(await render(25000, {free_shipping_method:'<b>A-Post</b>'}))), 'Kostenloser Versand mit <b>A-Post</b>');
});

test('the line sits between the order value and the checkout note', async () => {
  const document = await render(8700);
  const summary = [...document.querySelector('.cart-summary').children].map(node => node.className);
  assert.ok(summary.indexOf('cart-free-shipping') > summary.indexOf('summary-row summary-line summary-total'));
  assert.ok(summary.indexOf('cart-free-shipping') < summary.indexOf('cart-tax-note'));
});

test('only the cart section may carry the free shipping threshold', () => {
  const owners = readdirSync(path.join(root, 'sections')).filter(name => readFileSync(path.join(root, 'sections', name), 'utf8').includes('"free_shipping_threshold"'));
  assert.deepEqual(owners, ['main-cart.liquid']);
  assert.equal(readFileSync(path.join(root, 'config/settings_schema.json'), 'utf8').includes('free_shipping_threshold'), false);
});
