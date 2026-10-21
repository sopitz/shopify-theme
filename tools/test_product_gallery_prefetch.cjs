const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, VirtualConsole} = require('jsdom');
const script = fs.readFileSync(path.join(__dirname, '../assets/product-media-context.js'), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 30));

const names = ['black', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh'];
const markup = (current = 'black') => `<!doctype html><html><body><header class="site-header"></header>
  <section data-product-section data-product-media-context>
    <div data-product-overview>
      <div class="product-gallery"><div data-product-gallery-sticky><div class="product-gallery-main"><img data-product-image src="/${current}.jpg?width=1400" srcset="/${current}.jpg?width=720 720w, /${current}.jpg?width=1400 1400w" alt="Aarau"></div>
        <div class="product-thumbnails">${names.map(name => `<a class="product-thumbnail" href="/${name}.jpg?width=1600" data-gallery-image="/${name}.jpg?width=1400"><img src="/${name}.jpg?width=360"></a>`).join('')}</div>
      </div></div>
      <div class="product-info"><h1>Aarau</h1><span data-product-price>CHF 330.00</span>
        <form data-product-form><input name="quantity" type="number" min="1" value="1"><input name="id" value="1001" type="hidden">
        <p data-product-availability>Lieferzeit: 2–3 Werktage</p><button type="submit" class="enhanced-add-button"><span data-add-label>In den Warenkorb</span></button></form>
      </div>
    </div>
    <aside data-product-image-preview hidden><button data-image-preview-top><img data-context-image><span data-context-color hidden></span></button><div class="product-image-preview-copy"><strong>Aarau</strong></div><strong data-context-price>CHF 330.00</strong><span data-context-availability></span><div data-context-options></div><input data-context-quantity type="number" value="1" min="1"><button data-context-add><span data-context-add-label>In den Warenkorb</span></button><p data-context-error hidden></p></aside>
    <section id="ProductInformation"></section><div class="product-policies"></div>
  </section></body></html>`;

function fixture({current, connection, viewer = true} = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(markup(current), {url:'https://example.test/products/kybun-aarau', runScripts:'outside-only', pretendToBeVisual:true, virtualConsole});
  const {window} = dom;
  const document = window.document;
  window.ResizeObserver = class {observe(){} disconnect(){}};
  window.matchMedia = () => ({matches:false});
  window.scrollTo = () => {};
  if (viewer) {
    window.HTMLDialogElement.prototype.showModal = function(){this.open=true;};
    window.HTMLDialogElement.prototype.close = function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
  } else {
    window.HTMLDialogElement.prototype.showModal = undefined;
  }
  if (connection) Object.defineProperty(window.navigator, 'connection', {value:connection, configurable:true});
  const loaders = [];
  window.upswingGalleryImagePreload = {create:options => {
    const loader = {options, warmCalls:[], clearCalls:0, destroyed:false, warm(urls) { this.warmCalls.push([...urls]); }, clear() { this.clearCalls++; }, destroy() { this.destroyed = true; }};
    loaders.push(loader); return loader;
  }};
  document.querySelectorAll('[data-gallery-image]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const image = document.querySelector('[data-product-image]');
    image.src = link.dataset.galleryImage; image.removeAttribute('srcset');
  }));
  window.eval(script);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {
    dom, window, document, loaders, errors,
    page: () => loaders.find(loader => loader.options?.limit),
    viewer: () => loaders.find(loader => !loader.options?.limit),
    main: () => document.querySelector('[data-product-image]'),
    loadMain() { this.main().dispatchEvent(new window.Event('load')); },
    close() { dom.window.close(); }
  };
}

const fullSize = name => `/${name}.jpg?width=1400`;

test('Every gallery image is warmed once the main image has loaded, starting after the one on screen', async () => {
  const f = fixture();
  try {
    await tick();
    const page = f.page();
    assert.ok(page, 'The product page creates its own gallery cache');
    assert.equal(page.options.limit, names.length, 'The page cache holds every gallery image, not only eight');
    assert.deepEqual(page.warmCalls, [], 'Nothing starts before the main image is on screen');
    assert.deepEqual(f.viewer()?.warmCalls || [], [], 'The hidden viewer keeps its neighbour cache idle');
    f.loadMain();
    await tick();
    assert.deepEqual(page.warmCalls, [names.slice(1).concat(names[0]).map(fullSize)], 'All full-size gallery URLs follow in thumbnail order, the visible image last');
    f.main().dispatchEvent(new f.window.Event('load'));
    f.document.querySelectorAll('[data-gallery-image]')[3].click();
    await tick();
    assert.equal(page.warmCalls.length, 1, 'Later image swaps must not restart the page prefetch');
    assert.equal(f.main().getAttribute('src'), fullSize('fourth'));
    assert.deepEqual(f.viewer()?.warmCalls || [], [], 'Swapping on the page keeps the viewer cache idle');
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('A main image that is already complete warms the gallery without waiting for a load event', async () => {
  const f = fixture({current:'third'});
  try {
    Object.defineProperty(f.main(), 'complete', {value:true, configurable:true});
    f.document.querySelector('[data-product-section]').dispatchEvent(new f.window.Event('shopify:section:load', {bubbles:true}));
    await tick();
    // The controller bound before `complete` was forced; rebind on a fresh section to exercise that branch.
    const section = f.document.querySelector('[data-product-section]');
    const clone = section.cloneNode(true);
    Object.defineProperty(clone.querySelector('[data-product-image]'), 'complete', {value:true, configurable:true});
    section.replaceWith(clone);
    await tick(); await tick();
    const page = f.loaders.filter(loader => loader.options?.limit).at(-1);
    assert.ok(page);
    assert.deepEqual(page.warmCalls, [names.slice(3).concat(names.slice(0, 3)).map(fullSize)], 'Warming starts after the visible third image and wraps around');
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Removing the product section stops and destroys the page cache', async () => {
  const f = fixture();
  try {
    await tick();
    const page = f.page();
    const main = f.main();
    f.document.querySelector('[data-product-section]').remove();
    await tick(); await tick();
    assert.equal(page.destroyed, true);
    main.dispatchEvent(new f.window.Event('load'));
    await tick();
    assert.deepEqual(page.warmCalls, [], 'A removed section must not warm images afterwards');
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Data saver and 2G connections skip the page-wide prefetch while the viewer keeps working', async () => {
  for (const connection of [{saveData:true}, {effectiveType:'2g'}, {effectiveType:'slow-2g'}]) {
    const f = fixture({connection});
    try {
      await tick();
      f.loadMain();
      await tick();
      assert.equal(f.page(), undefined, `No page cache with ${JSON.stringify(connection)}`);
      f.document.querySelector('[data-product-image-open]').click();
      assert.deepEqual(f.viewer().warmCalls.at(-1), ['second', 'eleventh', 'third'].map(fullSize), 'The viewer still warms its neighbours on demand');
      assert.deepEqual(f.errors, []);
    } finally { f.close(); }
  }
});

test('The page prefetch also runs when the fullscreen viewer is unavailable', async () => {
  const f = fixture({viewer:false});
  try {
    await tick();
    assert.equal(f.document.querySelector('[data-product-viewer]'), null);
    f.loadMain();
    await tick();
    assert.deepEqual(f.page().warmCalls, [names.slice(1).concat(names[0]).map(fullSize)]);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
