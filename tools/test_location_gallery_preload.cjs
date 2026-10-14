const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const script = fs.readFileSync(path.join(__dirname, '../assets/location-gallery.js'), 'utf8');
const urls = Array.from({length: 5}, (_, index) => `https://cdn.example.test/filiale-${index}.jpg?v=${index + 10}&width=1800`);
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function fixture({count = 5, withHelper = true} = {}) {
  const dom = new JSDOM(`<!doctype html><html><body><div data-location-gallery aria-label="Bilder der Filiale Thun">
    <button data-location-open><img data-location-main-image src="${urls[0]}" alt="Foto 0"><span>Vergrössern</span></button>
    <button data-location-gallery-prev>Zurück</button><button data-location-gallery-next>Weiter</button>
    <span data-location-gallery-index>1</span><p data-location-caption hidden></p>
    <div data-location-gallery-track>${urls.slice(0, count).map((url, index) => `<button data-location-thumb data-image-src="${url.replaceAll('&', '&amp;')}" data-image-alt="Foto ${index}" data-image-caption="Bild ${index}" aria-pressed="${index === 0}"><img src="/thumb-${index}.jpg"></button>`).join('')}</div>
    </div><button id="elsewhere">Andere Aktion</button></body></html>`, {
    url: 'https://upswing.example.test/pages/standort-thun',
    runScripts: 'outside-only', pretendToBeVisual: true
  });
  const {window} = dom;
  const helpers = [];
  window.HTMLDialogElement.prototype.showModal = function() {
    this.open = true;
    this.querySelector('[data-location-close]').focus();
  };
  window.HTMLDialogElement.prototype.close = function() {
    this.open = false;
    this.dispatchEvent(new window.Event('close'));
  };
  if (withHelper) window.upswingGalleryImagePreload = {
    create() {
      const helper = {
        warms: [], clears: 0, destroys: 0,
        warm(values) { this.warms.push(Array.from(values)); },
        clear() { this.clears++; },
        destroy() { this.destroys++; }
      };
      helpers.push(helper);
      return helper;
    }
  };
  window.eval(script);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {dom, window, document: window.document, helpers, root: window.document.querySelector('[data-location-gallery]')};
}

test('Location fullscreen warms exact adjacent URLs, wraps, and reuses its cache after closing', () => {
  const {dom, window, document, root, helpers} = fixture();
  try {
    const thumbnails = root.querySelectorAll('[data-location-thumb]');
    thumbnails[2].click();
    root.querySelector('[data-location-gallery-next]').click();
    assert.equal(helpers.length, 0, 'Normal page image changes must not preload fullscreen neighbours');
    assert.equal(root.querySelector('[data-location-gallery-index]').textContent, '4');
    const opener = root.querySelector('[data-location-open]');
    opener.focus();
    assert.deepEqual(helpers[0].warms[0], [urls[4], urls[2], urls[0]], 'Focus anticipates next, previous, next+2');
    opener.click();
    const helper = helpers[0];
    let dialog = document.querySelector('dialog');
    assert.equal(dialog.open, true);
    assert.deepEqual(helper.warms.at(-1), [urls[4], urls[2], urls[0]]);
    dialog.querySelector('[data-location-gallery-next]').click();
    assert.deepEqual(helper.warms.at(-1), [urls[0], urls[3], urls[1]], 'Last photo wraps to the first');
    dialog.querySelector('[data-location-close]').dispatchEvent(new window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    assert.deepEqual(helper.warms.at(-1), [urls[1], urls[4], urls[2]]);
    dialog.querySelectorAll('[data-location-thumb]')[2].click();
    assert.deepEqual(helper.warms.at(-1), [urls[3], urls[1], urls[4]]);
    assert.equal(root.querySelector('[data-location-main-image]').src, urls[2]);
    assert.equal(dialog.querySelector('[data-location-caption]').textContent, 'Bild 2');
    const beforeClose = helper.warms.length;
    dialog.querySelector('[data-location-close]').click();
    assert.equal(helper.clears, 1, 'Close clears pending requests');
    assert.equal(helper.destroys, 0, 'Decoded images survive ordinary close');
    assert.equal(helper.warms.length, beforeClose, 'Restoring opener focus must not restart pending work');
    assert.equal(document.querySelector('dialog'), null);
    opener.click();
    dialog = document.querySelector('dialog');
    assert.equal(dialog.open, true);
    assert.equal(helpers.length, 1, 'Reopening must retain the same root cache');
    assert.deepEqual(helper.warms.at(-1), [urls[3], urls[1], urls[4]]);
  } finally {dom.window.close();}
});

test('Location opener anticipation ends on pointer or keyboard focus exit', () => {
  const {dom, window, document, root, helpers} = fixture();
  try {
    const opener = root.querySelector('[data-location-open]');
    const child = opener.querySelector('span');
    child.dispatchEvent(new window.MouseEvent('pointerover', {bubbles: true}));
    const helper = helpers[0];
    assert.deepEqual(helper.warms[0], [urls[1], urls[4], urls[2]]);
    opener.dispatchEvent(new window.MouseEvent('pointerover', {bubbles: true, relatedTarget: child}));
    assert.equal(helper.warms.length, 1, 'Moving between opener children must not schedule again');
    child.dispatchEvent(new window.MouseEvent('pointerout', {bubbles: true, relatedTarget: opener}));
    assert.equal(helper.clears, 0, 'Moving inside the opener is still anticipation');
    opener.dispatchEvent(new window.MouseEvent('pointerout', {bubbles: true, relatedTarget: document.body}));
    assert.equal(helper.clears, 1);
    opener.focus();
    assert.equal(helper.warms.length, 2);
    document.querySelector('#elsewhere').focus();
    assert.equal(helper.clears, 2);
    root.querySelector('[data-location-gallery-next]').click();
    assert.equal(helper.warms.length, 2, 'Page controls remain free of neighbour downloads');
  } finally {dom.window.close();}
});

test('Location fullscreen destroys preload state when its root disconnects or navigation starts', async () => {
  const disconnected = fixture();
  try {
    disconnected.root.querySelector('[data-location-open]').click();
    disconnected.root.remove();
    await tick();
    assert.equal(disconnected.helpers[0].destroys, 1);
    assert.equal(disconnected.document.querySelector('dialog'), null);
  } finally {disconnected.dom.window.close();}
  const navigating = fixture();
  try {
    navigating.root.querySelector('[data-location-open]').click();
    navigating.window.dispatchEvent(new navigating.window.Event('pagehide'));
    assert.equal(navigating.helpers[0].destroys, 1);
  } finally {navigating.dom.window.close();}
});

test('Location galleries with one or two photos do not warm the current photo', () => {
  const two = fixture({count: 2});
  try {
    two.root.querySelector('[data-location-open]').click();
    assert.deepEqual(two.helpers[0].warms[0], [urls[1], urls[1]], 'Helper deduplicates the repeated neighbour');
    two.document.querySelector('dialog [data-location-gallery-next]').click();
    assert.deepEqual(two.helpers[0].warms.at(-1), [urls[0], urls[0]]);
  } finally {two.dom.window.close();}
  const one = fixture({count: 1});
  try {
    one.root.querySelector('[data-location-open]').click();
    assert.equal(one.helpers.length, 0);
  } finally {one.dom.window.close();}
});

test('Location fullscreen keeps working in older previews without the shared preloader', () => {
  const {dom, document, root} = fixture({withHelper: false});
  try {
    root.querySelector('[data-location-open]').click();
    const dialog = document.querySelector('dialog');
    dialog.querySelector('[data-location-gallery-next]').click();
    assert.equal(dialog.querySelector('[data-location-main-image]').src, urls[1]);
    dialog.querySelector('[data-location-close]').click();
    assert.equal(document.querySelector('dialog'), null);
  } finally {dom.window.close();}
});
