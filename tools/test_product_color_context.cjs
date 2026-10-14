const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, VirtualConsole} = require('jsdom');
const script = fs.readFileSync(path.join(__dirname, '../assets/product-media-context.js'), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 30));

test('Late legacy colours update the open viewer purchase controls without losing size or quantity', async () => {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(`<!doctype html><html><body><header class="site-header"></header>
    <section data-product-section data-product-media-context>
      <div data-product-overview>
        <div class="product-gallery"><div data-product-gallery-sticky><div class="product-gallery-main"><img data-product-image src="/black.jpg" alt="Aarau black"></div></div></div>
        <div class="product-info"><h1>Aarau black</h1><span data-product-price>CHF 330.00</span>
          <form data-product-form><fieldset data-option-group="1" data-option-name="Grösse"><legend>Grösse</legend>
            <input type="radio" id="size-42" name="options[Grösse]" value="42" data-option-select data-option-position="1"><label for="size-42">42</label>
            <input type="radio" id="size-43" name="options[Grösse]" value="43" data-option-select data-option-position="1" checked><label for="size-43">43</label>
          </fieldset><input name="quantity" type="number" min="1" value="3"><input name="id" value="1001" type="hidden">
          <p data-product-availability>Online verfügbar</p><button type="submit" class="enhanced-add-button"><span data-add-label>In den Warenkorb</span></button></form>
        </div>
      </div>
      <aside data-product-image-preview hidden><button data-image-preview-top><img data-context-image><span data-context-color>Aarau black</span></button><div class="product-image-preview-copy"><strong>Aarau black</strong></div><strong data-context-price>CHF 330.00</strong><span data-context-availability></span><div data-context-options></div><input data-context-quantity type="number" value="3" min="1"><button data-context-add><span data-context-add-label>In den Warenkorb</span></button><p data-context-error hidden></p></aside>
      <section id="ProductInformation"></section><div class="product-policies"></div>
    </section></body></html>`, {url:'https://example.test/products/kybun-aarau-black-women', runScripts:'outside-only', pretendToBeVisual:true, virtualConsole:console});
  const {window} = dom;
  const document = window.document;
  window.ResizeObserver = class {observe(){} disconnect(){}};
  window.matchMedia = () => ({matches:false});
  window.scrollTo = () => {};
  window.HTMLDialogElement.prototype.showModal = function(){this.open=true;};
  window.HTMLDialogElement.prototype.close = function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
  try {
    window.eval(script);
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    await tick();
    const size = document.querySelector('[data-context-options] select');
    assert.equal(size.value, '43');
    document.querySelector('[data-product-image-open]').click();
    const viewer = document.querySelector('[data-product-viewer]');
    assert.equal(viewer.open, true);
    const colours = document.createElement('div');
    colours.className='model-colors';
    colours.innerHTML='<div class="swatches"><a href="/products/kybun-aarau-black-women" aria-current="page" title="Aarau black"><img src="/black.jpg"></a><a href="/products/kybun-aarau-blue-women" title="Aarau blue"><img src="/blue.jpg"></a></div>';
    document.querySelector('.product-info').prepend(colours);
    const root = document.querySelector('[data-product-section]');
    root.dispatchEvent(new window.CustomEvent('upswing:colors-ready', {bubbles:true}));
    await tick();
    assert.equal(viewer.open, true, 'An asynchronously resolved colour must not close the image viewer');
    assert.equal(document.querySelector('[data-context-options] select'), size, 'Keep the existing size control');
    assert.equal(size.value, '43');
    assert.equal(document.querySelector('[data-context-quantity]').value, '3');
    assert.equal(document.querySelector('form input[name="quantity"]').value, '3');
    assert.equal(viewer.querySelectorAll('[data-context-color-toggle]').length, 1);
    assert.deepEqual([...viewer.querySelectorAll('.product-context-color-choice')].map(e=>e.textContent), ['Aarau black','Aarau blue']);
    root.dispatchEvent(new window.CustomEvent('upswing:colors-ready', {bubbles:true}));
    await tick();
    assert.equal(viewer.querySelectorAll('[data-context-color-toggle]').length, 1, 'Repeated ready events must not duplicate colour controls');
    document.querySelector('[data-viewer-close]').click();
    assert.equal(viewer.open, false);
    assert.equal(document.querySelector('[data-product-image-preview] [data-context-options] select'), size);
    assert.equal(document.querySelector('[data-product-image-preview] [data-context-color-toggle]').textContent, 'Aarau black');
    assert.deepEqual(errors, []);
  } finally {dom.window.close();}
});
