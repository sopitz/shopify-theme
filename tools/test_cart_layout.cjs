const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');

const root = path.resolve(__dirname, '..');
const layout = readFileSync(path.join(root, 'layout/theme.liquid'), 'utf8');
const stylesheets = [...layout.matchAll(/\{\{\s*'([^']+\.css)'\s*\|\s*asset_url\s*\|\s*stylesheet_tag\s*\}\}/g)].map(match => match[1]);

// Flat list of {maxWidth, selector, body} in load order; only max-width media blocks occur in these files.
function rules(css) {
  const found = [];
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let index = 0;
  const read = maxWidth => {
    while (index < source.length) {
      const open = source.indexOf('{', index), close = source.indexOf('}', index);
      if (close !== -1 && (open === -1 || close < open)) { index = close + 1; return; }
      if (open === -1) { index = source.length; return; }
      const prelude = source.slice(index, open).trim();
      index = open + 1;
      if (prelude.startsWith('@media')) {
        const width = prelude.match(/max-width:\s*(\d+)px/);
        read(width ? Number(width[1]) : maxWidth);
      } else {
        const end = source.indexOf('}', index);
        found.push({maxWidth, selector:prelude, body:source.slice(index, end)});
        index = end + 1;
      }
    }
  };
  read(Infinity);
  return found;
}
const all = stylesheets.flatMap(name => rules(readFileSync(path.join(root, 'assets', name), 'utf8')));
function computed(selector, property, width) {
  let value = null;
  for (const rule of all) {
    if (width > rule.maxWidth || !rule.selector.split(',').map(part => part.trim()).includes(selector)) continue;
    const declaration = rule.body.split(';').map(part => part.split(':')).find(([name]) => name.trim() === property);
    if (declaration) value = declaration.slice(1).join(':').trim();
  }
  return value;
}

test('stylesheets load from the layout in a known order', () => {
  assert.ok(stylesheets.indexOf('upswing.css') !== -1 && stylesheets.indexOf('upswing.css') < stylesheets.indexOf('commerce-components.css'));
});

test('the stacked cart column can shrink below the payment row width on phones and tablets', () => {
  for (const width of [320, 375, 414, 600, 820, 900, 960]) {
    assert.equal(computed('.cart-layout', 'grid-template-columns', width), 'minmax(0,1fr)', `${width}px`);
    assert.equal(computed('.cart-summary', 'position', width), 'static', `${width}px`);
  }
});

test('the desktop cart keeps its two columns and sticky summary', () => {
  for (const width of [961, 1101, 1280, 1600]) {
    assert.equal(computed('.cart-layout', 'grid-template-columns', width), '1.6fr 1fr', `${width}px`);
    assert.equal(computed('.cart-summary', 'position', width), 'sticky', `${width}px`);
  }
});

test('payment marks stay in one row and shrink instead of wrapping', () => {
  assert.equal(computed('.cart-summary .payment-icons', 'flex-wrap', 375), 'nowrap');
  assert.equal(computed('.cart-summary .payment-icons>li', 'min-width', 375), '0');
  assert.equal(computed('.cart-summary .payment-icons>li', 'flex', 375), '0 1 46px');
});
