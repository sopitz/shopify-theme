const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');

const runtime = readFileSync(path.join(__dirname, '..', 'assets', 'upswing.js'), 'utf8');
const section = (guide = '<article id="ProductSizeGuide"><h3>Aktuelle Auswahlhilfe</h3><p>Hinweise aus dem Produkt.</p></article>') => `<section data-product-section><a class="product-selection-help" href="#ProductSizeGuide"><span>Hilfe bei der Auswahl</span></a>${guide}</section>`;

function fixture(markup = section()) {
  const dom = new JSDOM(`<!doctype html><html class="no-js"><body><button id="outside">Ausserhalb</button>${markup}</body></html>`, {url:'https://upswing.test/de/products/aktuelles-produkt?variant=123&utm_source=qa#ProductOverview', runScripts:'outside-only', pretendToBeVisual:true});
  const {window} = dom, {document} = window;
  const scrolls = [], pushes = [];
  window.HTMLElement.prototype.scrollIntoView = function(options) {scrolls.push({target:this, options});};
  window.history.replaceState({variantContext:'preserved'}, '', window.location.href);
  const pushState = window.history.pushState.bind(window.history);
  window.history.pushState = (state, title, url) => {pushes.push({state, url:String(url)});pushState(state, title, url);};
  window.eval(runtime);
  return {dom, window, document, scrolls, pushes, link:document.querySelector('.product-selection-help'), guide:document.querySelector('[data-product-section] #ProductSizeGuide')};
}

test('clicking selection help focuses and instantly scrolls the actual guide while retaining the current route and URL state', () => {
  const f = fixture();
  try {
    let prevented = false;
    f.link.addEventListener('click', event => {prevented = event.defaultPrevented;});
    f.link.querySelector('span').click();
    assert.equal(prevented, true);
    assert.equal(f.document.activeElement, f.guide);
    assert.equal(f.guide.getAttribute('tabindex'), '-1');
    assert.equal(f.scrolls.length, 1);
    assert.equal(f.scrolls[0].target, f.guide);
    assert.deepEqual({...f.scrolls[0].options}, {behavior:'instant', block:'start'});
    assert.equal(f.pushes.length, 1);
    assert.equal(f.window.location.href, 'https://upswing.test/de/products/aktuelles-produkt?variant=123&utm_source=qa#ProductSizeGuide');
    assert.deepEqual(f.window.history.state, {variantContext:'preserved'});
    assert.equal(f.link.getAttribute('href'), '#ProductSizeGuide', 'The native link remains intact for a page without JavaScript');
    f.document.querySelector('#outside').focus();
    assert.equal(f.guide.hasAttribute('tabindex'), false, 'Only the temporary focus attribute is removed after leaving the guide');
  } finally {f.dom.window.close();}
});

test('an existing guide hash still scrolls on repeat clicks without adding duplicate history entries', () => {
  const f = fixture();
  try {
    f.link.click();
    f.link.click();
    assert.equal(f.document.activeElement, f.guide);
    assert.equal(f.scrolls.length, 2);
    assert.equal(f.pushes.length, 1);
    f.document.querySelector('#outside').focus();
    assert.equal(f.guide.hasAttribute('tabindex'), false);
  } finally {f.dom.window.close();}
});

test('guide focus preserves an existing tabindex value', () => {
  const f = fixture(section('<article id="ProductSizeGuide" tabindex="0"><h3>Auswahlhilfe</h3></article>'));
  try {
    f.link.click();
    assert.equal(f.document.activeElement, f.guide);
    f.document.querySelector('#outside').focus();
    assert.equal(f.guide.getAttribute('tabindex'), '0');
  } finally {f.dom.window.close();}
});

test('a missing guide retains native link behavior and cannot select a guide from another product section', () => {
  const f = fixture(section('') + '<section data-product-section><article id="ProductSizeGuide">Anderes Produkt</article></section>');
  try {
    const event = new f.window.MouseEvent('click', {bubbles:true, cancelable:true});
    f.link.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
    assert.equal(f.scrolls.length, 0);
    assert.equal(f.pushes.length, 0);
    assert.notEqual(f.document.activeElement, f.guide);
    assert.equal(f.guide.hasAttribute('tabindex'), false);
  } finally {f.dom.window.close();}
});

test('selection help resolves its own guide even when another product has the same native anchor ID', () => {
  const f = fixture('<section data-product-section><article id="ProductSizeGuide">Anderes Produkt</article></section>' + section());
  try {
    const expected = f.link.closest('[data-product-section]').querySelector('#ProductSizeGuide');
    f.link.click();
    assert.equal(f.document.activeElement, expected);
    assert.equal(f.scrolls[0].target, expected);
    assert.notEqual(expected, f.guide);
  } finally {f.dom.window.close();}
});

test('modified clicks and links outside a product section retain native behavior', () => {
  const f = fixture();
  try {
    for (const options of [{ctrlKey:true}, {metaKey:true}, {shiftKey:true}, {altKey:true}, {button:1}]) {
      const event = new f.window.MouseEvent('click', {bubbles:true, cancelable:true, ...options});
      f.link.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false);
    }
    const outside = f.document.createElement('a');
    outside.className = 'product-selection-help';
    outside.href = '#ProductSizeGuide';
    f.document.body.append(outside);
    f.document.body.dispatchEvent(new f.window.CustomEvent('shopify:section:load', {bubbles:true}));
    const event = new f.window.MouseEvent('click', {bubbles:true, cancelable:true});
    outside.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
    assert.equal(f.scrolls.length, 0);
    assert.equal(f.pushes.length, 0);
  } finally {f.dom.window.close();}
});

test('section and colour rebinds bind once and make a replacement product section immediately usable', () => {
  const f = fixture();
  try {
    const original = f.link.closest('[data-product-section]');
    original.dispatchEvent(new f.window.CustomEvent('shopify:section:load', {bubbles:true}));
    original.dispatchEvent(new f.window.CustomEvent('upswing:colors-ready', {bubbles:true}));
    f.link.click();
    assert.equal(f.scrolls.length, 1, 'Rebinding the same link cannot duplicate its click handler');
    const replacement = f.document.createElement('div');
    replacement.innerHTML = section();
    original.replaceWith(replacement);
    replacement.dispatchEvent(new f.window.CustomEvent('upswing:colors-ready', {bubbles:true}));
    replacement.dispatchEvent(new f.window.CustomEvent('shopify:section:load', {bubbles:true}));
    const link = replacement.querySelector('.product-selection-help'), guide = replacement.querySelector('#ProductSizeGuide');
    f.window.history.replaceState({variantContext:'new-colour'}, '', '/de/products/aktuelle-farbe?variant=456&view=qa');
    link.click();
    assert.equal(f.scrolls.length, 2);
    assert.equal(f.scrolls[1].target, guide);
    assert.equal(f.document.activeElement, guide);
    assert.equal(f.pushes.length, 2);
    assert.equal(f.window.location.href, 'https://upswing.test/de/products/aktuelle-farbe?variant=456&view=qa#ProductSizeGuide');
    assert.deepEqual(f.window.history.state, {variantContext:'new-colour'});
    assert.ok(f.pushes.every(({url}) => new URL(url).origin === 'https://upswing.test'));
  } finally {f.dom.window.close();}
});
