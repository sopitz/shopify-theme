const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');

const runtime = readFileSync(path.join(__dirname, '../assets/collection-guidance.js'), 'utf8');
const markup = `<section id="CollectionSection"><details class="collection-filter-disclosure" data-collection-filters>
  <summary>Filter</summary><form id="CollectionFilters-QA" action="/de/collections/kybun-schuhe" method="get">
    <label><input type="checkbox" name="filter.p.vendor" value="kybun" checked>kybun</label>
    <label>Bis<input type="number" name="filter.v.price.lte" value="200"></label>
  </form></details><select name="sort_by" form="CollectionFilters-QA"><option value="manual">Empfohlen</option><option value="price-ascending">Preis aufsteigend</option></select></section>
  <details id="OtherDetails"><summary>Fragen</summary><p>Anderer Inhalt</p></details>`;

function fixture({desktop = false, run = true} = {}) {
  const dom = new JSDOM(markup, {url: 'https://upswing.example/de/collections/kybun-schuhe?filter.p.vendor=kybun&page=2', runScripts: 'outside-only'});
  const {window} = dom;
  const queries = [];
  let matches = desktop;
  window.matchMedia = query => {
    const record = {media: query, matches, listeners: new Set(), added: 0, removed: 0};
    record.addEventListener = (type, listener) => {assert.equal(type, 'change'); record.listeners.add(listener); record.added++;};
    record.removeEventListener = (type, listener) => {assert.equal(type, 'change'); record.listeners.delete(listener); record.removed++;};
    queries.push(record);
    return record;
  };
  if (run) window.eval(runtime);
  const document = window.document;
  return {
    dom, window, document, queries,
    section: document.querySelector('#CollectionSection'),
    disclosure: document.querySelector('[data-collection-filters]'),
    resize(value) {
      matches = value;
      for (const record of queries) {
        record.matches = value;
        for (const listener of [...record.listeners]) listener({matches: value, media: record.media});
      }
    },
  };
}
const values = f => [...new f.window.FormData(f.document.querySelector('form'))];

test('native filters start closed on mobile and remain available without JavaScript', () => {
  for (const run of [false, true]) {
    const f = fixture({desktop: false, run});
    try {
      assert.equal(f.disclosure.open, false);
      f.disclosure.querySelector('summary').click();
      assert.equal(f.disclosure.open, true, 'The native summary can open the filters');
      f.disclosure.querySelector('summary').click();
      assert.equal(f.disclosure.open, false);
      assert.deepEqual(values(f), [['filter.p.vendor', 'kybun'], ['filter.v.price.lte', '200'], ['sort_by', 'manual']]);
      assert.equal(f.document.querySelector('#OtherDetails').open, false);
    } finally {f.dom.window.close();}
  }
});

test('desktop starts open, native user toggles remain effective and breakpoint changes adapt the disclosure', () => {
  const f = fixture({desktop: true});
  try {
    assert.equal(f.disclosure.open, true);
    assert.equal(f.queries[0].media, '(min-width: 821px)');
    f.disclosure.querySelector('summary').click();
    assert.equal(f.disclosure.open, false, 'User choice is preserved until the viewport breakpoint changes');
    f.resize(false);
    assert.equal(f.disclosure.open, false);
    f.disclosure.querySelector('summary').click();
    assert.equal(f.disclosure.open, true);
    f.resize(true);
    assert.equal(f.disclosure.open, true);
    f.resize(false);
    assert.equal(f.disclosure.open, false);
  } finally {f.dom.window.close();}
});

test('responsive toggles preserve edited values, form association, action and current URL', () => {
  const f = fixture();
  try {
    const form = f.document.querySelector('form');
    const sort = f.document.querySelector('select');
    form.querySelector('[type=checkbox]').checked = false;
    form.querySelector('[type=number]').value = '175';
    sort.value = 'price-ascending';
    const before = values(f);
    const location = f.window.location.href;
    for (const desktop of [true, false, true]) {
      f.resize(desktop);
      assert.deepEqual(values(f), before);
      assert.equal(sort.form, form);
      assert.equal(form.id, 'CollectionFilters-QA');
      assert.equal(form.getAttribute('action'), '/de/collections/kybun-schuhe');
      assert.equal(form.method, 'get');
      assert.equal(f.window.location.href, location);
    }
  } finally {f.dom.window.close();}
});

test('reloading and rebinding do not duplicate listeners or reset a user toggle; unloading cleans up', () => {
  const f = fixture({desktop: true});
  try {
    f.disclosure.querySelector('summary').click();
    f.window.eval(runtime);
    f.document.dispatchEvent(new f.window.Event('DOMContentLoaded'));
    f.section.dispatchEvent(new f.window.Event('shopify:section:load', {bubbles: true}));
    f.window.upswingCollectionGuidance.bind(f.disclosure);
    assert.equal(f.disclosure.open, false);
    assert.equal(f.queries.length, 1);
    assert.equal(f.queries[0].listeners.size, 1);
    assert.equal(f.queries[0].added, 1);
    f.section.dispatchEvent(new f.window.Event('shopify:section:unload', {bubbles: true}));
    assert.equal(f.queries[0].listeners.size, 0);
    assert.equal(f.queries[0].removed, 1);
    f.resize(true);
    assert.equal(f.disclosure.open, false, 'An unloaded section no longer responds to viewport changes');
    f.section.dispatchEvent(new f.window.Event('shopify:section:load', {bubbles: true}));
    assert.equal(f.queries.length, 2);
    assert.equal(f.queries[1].listeners.size, 1);
    assert.equal(f.disclosure.open, true);
  } finally {f.dom.window.close();}
});

test('section-load binds new disclosures while pages without a wrapper stay untouched', () => {
  const f = fixture();
  try {
    const fresh = f.document.createElement('section');
    fresh.innerHTML = '<details data-collection-filters><summary>Neue Filter</summary><form><input name="filter.p.vendor" value="Joya"></form></details>';
    f.document.body.append(fresh);
    fresh.dispatchEvent(new f.window.Event('shopify:section:load', {bubbles: true}));
    assert.equal(f.queries.length, 2);
    f.resize(true);
    assert.equal(fresh.querySelector('details').open, true);
    assert.equal(fresh.querySelector('input').value, 'Joya');
    f.section.dispatchEvent(new f.window.Event('shopify:section:unload', {bubbles: true}));
    assert.equal(f.queries[1].listeners.size, 1, 'Unloading another section leaves the new disclosure bound');
    f.resize(false);
    assert.equal(fresh.querySelector('details').open, false);
    const unrelated = f.document.querySelector('#OtherDetails');
    unrelated.open = true;
    unrelated.dispatchEvent(new f.window.Event('shopify:section:load', {bubbles: true}));
    assert.equal(unrelated.open, true);
    assert.equal(f.queries.length, 2);
  } finally {f.dom.window.close();}
});
