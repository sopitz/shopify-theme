const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');
const {Liquid} = require('liquidjs');

const repo = path.resolve(__dirname, '..');
const engine = new Liquid({root: path.join(repo, 'snippets'), extname: '.liquid', strictFilters: true});
engine.registerFilter('image_url', image => image.src);
engine.registerFilter('image_tag', url => `<img src="${url}" alt="">`);
engine.registerFilter('money_with_currency', value => `CHF ${(Number(value) / 100).toFixed(2)}`);
engine.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
engine.registerFilter('metafield_tag', () => '');

function product(id, description = '') {
  return {
    id, handle: `alignment-${id}`, title: id === 1 ? 'Ein langer Produktname mit unterschiedlichen Zeilenumbrüchen' : 'Kurzer Name',
    url: `/products/alignment-${id}`, vendor: 'Marke', available: true,
    price: 12000, price_min: 12000, price_max: 12000, description,
    featured_image: {id, src: `/image-${id}.jpg`}, images: [{id, src: `/image-${id}.jpg`}],
    options_with_values: [], metafields: {upswing: {}, custom_fields: {}, fixture: {}},
  };
}

async function fixture(subgrid = true, wrapped = false) {
  const products = [product(1, '<p>Dieser vorhandene Kurztext muss mit allen gelieferten Worten über mehrere sichtbare Zeilen umbrechen dürfen.</p>'), product(2), product(3)];
  products[2].metafields.fixture.material = {type: 'list.single_line_text_field', value: ['Leder', 'Textil & Kunstleder mit ausführlicher Angabe']};
  const cards = await Promise.all(products.map(product => engine.renderFile('product-card', {
    product, card_facts: true, card_fact_1_key: 'fixture.material', card_fact_1_label: 'Obermaterial',
  })));
  const dom = new JSDOM(`<div class="collection-layout"><div class="product-grid">${cards.map(card => wrapped ? `<div>${card}</div>` : card).join('')}</div></div>`);
  const {document} = dom.window;
  for (const [index, content] of [...document.querySelectorAll('.product-card-content')].entries()) {
    if (index === 1) continue;
    const swatches = document.createElement('div');
    swatches.className = 'swatches';
    swatches.innerHTML = '<a class="swatch swatch--text">Eine Farbe</a>'.repeat(index === 0 ? 2 : 8);
    content.insertBefore(swatches, content.querySelector('.product-card-actions'));
  }
  const cssFiles = ['upswing.css', 'commerce-components.css', 'row-alignment.css', 'product-cards.css', 'collection-guidance.css', 'color-swatches.css'];
  for (const name of cssFiles) {
    const style = document.createElement('style');
    style.textContent = readFileSync(path.join(repo, 'assets', name), 'utf8');
    document.head.append(style);
    // JSDOM has no layout engine or @supports evaluation. Enable the actual
    // production subgrid rules only for the explicit modern-browser branch.
    if (subgrid) {
      const rules = [...style.sheet.cssRules].filter(rule => rule.conditionText?.replaceAll(' ', '') === '(grid-template-rows:subgrid)');
      if (rules.length) {
        const enabled = document.createElement('style');
        enabled.textContent = rules.flatMap(rule => [...rule.cssRules].map(child => child.cssText)).join('\n');
        document.head.append(enabled);
      }
    }
  }
  return {dom, document, cards: [...document.querySelectorAll('.product-card')], style: node => dom.window.getComputedStyle(node)};
}

test('rendered copy keeps all supplied lines without a clamped or zero-minimum text box', async () => {
  const f = await fixture();
  try {
    const copy = f.document.querySelector('.product-copy');
    assert.match(copy.textContent, /mehrere sichtbare Zeilen umbrechen dürfen\.$/);
    assert.equal(f.style(copy).display, 'block');
    assert.equal(f.style(copy).overflow, 'visible');
    assert.equal(f.style(copy).minHeight, 'auto');
    assert.ok(['', 'none', 'unset'].includes(f.style(copy).getPropertyValue('-webkit-line-clamp')));
    assert.ok(['', 'none'].includes(f.style(copy).maxHeight));
    assert.equal(f.style(copy).overflowWrap, 'anywhere');
    assert.equal(f.style(f.document.querySelector('.product-title')).overflowWrap, 'anywhere');
  } finally {f.dom.window.close();}
});

test('copy, absent copy and facts retain shared content, price and action tracks for direct or wrapped cards', async () => {
  for (const wrapped of [false, true]) {
    const f = await fixture(true, wrapped);
    try {
      const copy = f.document.querySelector('.product-copy');
      const facts = f.document.querySelector('.product-card-facts');
      assert.equal(f.style(copy).gridRow, f.style(facts).gridRow, 'Facts must occupy the same shared track as ordinary copy');
      const rows = f.cards.map(card => {
        const content = card.querySelector('.product-card-content');
        const price = card.querySelector('.product-price');
        const actions = card.querySelector('.product-card-actions');
        assert.equal(f.style(card).gridTemplateRows, 'subgrid');
        assert.equal(f.style(card).gridTemplateColumns, 'minmax(0,1fr)');
        assert.equal(f.style(content).gridTemplateRows, 'subgrid');
        assert.equal(f.style(content).gridTemplateColumns, 'minmax(0,1fr)');
        assert.equal(f.style(price).gridColumn, '1');
        assert.equal(f.style(actions).gridColumn, '1');
        return [f.style(price).gridRow, f.style(actions).gridRow];
      });
      assert.deepEqual(rows[0], rows[1]);
      assert.deepEqual(rows[1], rows[2]);
      assert.ok(Number.parseInt(f.style(copy).gridRow, 10) < Number.parseInt(rows[0][0], 10));
      for (const swatches of f.document.querySelectorAll('.swatches')) {
        assert.ok(Number.parseInt(rows[0][0], 10) < Number.parseInt(f.style(swatches).gridRow, 10));
        assert.ok(Number.parseInt(f.style(swatches).gridRow, 10) < Number.parseInt(rows[0][1], 10));
      }
    } finally {f.dom.window.close();}
  }
});

test('without subgrid, cards retain their stretching flex fallback and full text', async () => {
  const f = await fixture(false);
  try {
    for (const card of f.cards) {
      assert.equal(f.style(card).display, 'flex');
      assert.equal(f.style(card).flexDirection, 'column');
      assert.equal(f.style(card).alignSelf, 'stretch');
      assert.equal(f.style(card.querySelector('.product-card-content')).flexGrow, '1');
    }
    assert.equal(f.style(f.document.querySelector('.product-copy')).overflow, 'visible');
  } finally {f.dom.window.close();}
});
