const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const catalogueTargets = {
  anders:'anders-1', bellabambi:'bella-bambi', blackroll:'blackroll-faszientraining',
  elten:'elten-sicherheitsschuhe', joya:'joya-schuhe', kingnature:'kingnature',
  kybun:'kybun-schuhe', leguano:'leguano-barfussschuhe', pepup:'pepup-1',
  theraband:'therabander-loops', venenengel:'venen-engel-massagegerate',
};
const affiliateUrl = 'https://www.bellicon.com/?acc=upswing_Thun&a_bid=f1c026c9';
function renderer() {
  const native = new Liquid().options.fs;
  const adapt = (file, source) => path.basename(file) === 'venen-engel-configurator.liquid' ? '<section data-venen-engel-configurator></section>' : source;
  const engine = new Liquid({root:path.join(root, 'snippets'), extname:'.liquid', strictFilters:true,
    fs:{...native, readFile:async file => adapt(file, await native.readFile(file)), readFileSync:file => adapt(file, native.readFileSync(file))}});
  engine.registerFilter('file_img_url', name => `/files/${name}`);
  engine.registerFilter('asset_url', name => `/assets/${name}`);
  engine.registerFilter('image_url', value => value?.src || '');
  engine.registerFilter('image_tag', value => `<img src="${value}">`);
  engine.registerFilter('money', value => `CHF ${value || 0}`);
  engine.registerFilter('money_with_currency', value => `CHF ${value || 0}`);
  engine.registerFilter('metafield_tag', value => String(value?.value || ''));
  return engine;
}
async function render(handle, missing = false) {
  const collections = Object.fromEntries(Object.values(catalogueTargets).map(key => [key, {id:12, url:`/fr/collections/${key}`, products_count:0}]));
  const pages = {'bellicon-beratung-buchen':{id:13, url:'/fr/pages/bellicon-beratung-buchen'}};
  const values = {page:{handle}, section:{id:'CTA', settings:{}}, settings:{}, shop:{currency:'CHF'},
    routes:{root_url:'/'}, collections:missing ? {} : collections, pages:missing ? {} : pages, all_products:{}};
  return new JSDOM(await renderer().renderFile('migrated-brand-pages', values, {globals:values}));
}

test('all twelve brand stories keep their native CTA destinations in distinct button groups', async () => {
  for (const handle of [...Object.keys(catalogueTargets), 'bellicon']) {
    const dom = await render(handle);
    try {
      const story = dom.window.document.querySelector('.migration-story');
      const group = story.querySelector('.migration-actions');
      assert.equal(group.getAttribute('role'), 'group', handle);
      assert.ok(group.getAttribute('aria-label'), handle);
      assert.equal(story.querySelectorAll('.migration-actions').length, 1, `${handle}: adjacent actions share one wrapping group`);
      const buttons = [...group.querySelectorAll('a')];
      assert.ok(buttons.every(button => button.classList.contains('button')), `${handle}: standalone actions use the native button component`);
      if (handle === 'bellicon') {
        assert.deepEqual(buttons.map(button => button.getAttribute('href')), ['/fr/pages/bellicon-beratung-buchen', affiliateUrl]);
        assert.deepEqual(buttons.map(button => button.textContent.trim()), ['Beratungs- und Testtermin vereinbaren', 'Jetzt online kaufen']);
        assert.equal(buttons[0].classList.contains('secondary'), false, 'Consultation stays the primary action');
        assert.equal(buttons[1].classList.contains('secondary'), true, 'The shop remains a distinct secondary action');
      } else {
        assert.equal(buttons.length, 1, handle);
        assert.equal(buttons[0].getAttribute('href'), `/fr/collections/${catalogueTargets[handle]}`, `${handle}: URL comes from its actual collection resource`);
      }
    } finally {dom.window.close();}
  }
});

test('FAQ actions remain in their original content order with the same destinations', async () => {
  for (const handle of ['bellicon', 'kybun', 'joya', 'elten']) {
    const dom = await render(handle);
    try {
      const faq = dom.window.document.querySelector('.migration-faq');
      const links = [...faq.querySelectorAll('.migration-copy > .migration-actions > a.button')];
      assert.deepEqual(links.map(link => link.getAttribute('href')), handle === 'bellicon'
        ? ['/fr/pages/bellicon-beratung-buchen', affiliateUrl] : ['/fr/collections/elten-sicherheitsschuhe']);
      if (handle === 'bellicon') {
        const answer = links[0].closest('.migration-copy');
        const list = answer.querySelector('ul');
        assert.ok(links[0].compareDocumentPosition(list) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
        assert.ok(list.compareDocumentPosition(links[1]) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
      }
    } finally {dom.window.close();}
  }
});

test('missing native resources keep the original wording without a dead or invented CTA link', async () => {
  for (const handle of ['bellicon', 'kybun']) {
    const dom = await render(handle, true);
    try {
      const group = dom.window.document.querySelector('.migration-story .migration-actions');
      assert.ok(group.textContent.includes(handle === 'bellicon' ? 'Beratungs- und Testtermin vereinbaren' : 'Modelle entdecken'));
      assert.deepEqual([...group.querySelectorAll('a')].map(link => link.getAttribute('href')), handle === 'bellicon' ? [affiliateUrl] : []);
    } finally {dom.window.close();}
  }
});

test('brand buttons wrap with spacing and keep native touch sizing while inline references remain underlined', async () => {
  const dom = await render('bellicon');
  try {
    const document = dom.window.document;
    const style = document.createElement('style');
    style.textContent = ['upswing.css', 'page-migration.css'].map(name => readFileSync(path.join(root, 'assets', name), 'utf8')).join('\n');
    document.head.append(style);
    const inline = document.createElement('p');
    inline.innerHTML = 'Weitere Informationen im <a href="/pages/themen">Ratgeber</a>.';
    document.querySelector('.migration-story .migration-copy').append(inline);
    const group = document.querySelector('.migration-story .migration-actions');
    const computed = element => dom.window.getComputedStyle(element);
    assert.equal(computed(group).display, 'flex');
    assert.equal(computed(group).flexWrap, 'wrap');
    assert.equal(computed(group).gap, '12px');
    assert.equal(computed(group).alignItems, 'stretch');
    for (const button of group.querySelectorAll('a.button')) {
      assert.equal(computed(button).minHeight, '52px');
      assert.equal(computed(button).maxWidth, '100%');
      assert.equal(computed(button).whiteSpace, 'normal');
      assert.equal(computed(button).textDecoration, 'none');
    }
    assert.equal(inline.querySelector('a').classList.contains('button'), false);
    assert.match(computed(inline.querySelector('a')).textDecoration, /underline/);
  } finally {dom.window.close();}
});
