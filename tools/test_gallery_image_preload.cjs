const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, VirtualConsole} = require('jsdom');

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const flush = async () => { await tick(); await tick(); };

function fixture(options) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url:'https://example.test/products/aarau-black',
    runScripts:'outside-only',
    virtualConsole
  });
  const {window} = dom;
  const images = [];
  let active = 0, maxActive = 0;

  class ControlledImage extends window.EventTarget {
    constructor() {
      super();
      this.complete = false;
      this.naturalWidth = 0;
      this.decodeCalls = 0;
      this.loading = false;
      this.source = '';
      images.push(this);
    }
    set src(value) {
      this.source = String(value);
      if (!this.source) return;
      this.complete = false;
      this.loading = true;
      active += 1;
      maxActive = Math.max(maxActive, active);
    }
    get src() { return this.source; }
    removeAttribute(name) {
      if (name !== 'src') return;
      this.source = '';
      if (this.loading === true) { this.loading = false; active -= 1; }
    }
    decode() {
      this.decodeCalls += 1;
      this.decodePromise ||= new Promise((resolve, reject) => {
        this.resolveDecode = resolve;
        this.rejectDecode = reject;
      });
      return this.decodePromise;
    }
    finishNetwork(success) {
      if (this.loading) { this.loading = false; active -= 1; }
      this.complete = true;
      this.naturalWidth = success ? 1600 : 0;
      const event = new window.Event(success ? 'load' : 'error');
      this.dispatchEvent(event);
      this[success ? 'onload' : 'onerror']?.(event);
    }
  }
  window.Image = ControlledImage;
  window.eval(fs.readFileSync(path.join(__dirname, '../assets/gallery-image-preload.js'), 'utf8'));
  const loader = window.upswingGalleryImagePreload.create(options);
  return {
    window, loader, images, errors,
    get maxActive() { return maxActive; },
    requests(url) { return images.filter(image => image.src === url); },
    async succeed(image, rejectDecode = false, verifyDecode = true) {
      assert.ok(image, 'Expected an image request');
      image.finishNetwork(true);
      await flush();
      if (verifyDecode) assert.equal(image.decodeCalls, 1, 'Decode the full-size image before retaining it');
      if (rejectDecode) image.rejectDecode?.(new Error('Decode unavailable'));
      else image.resolveDecode?.();
      await flush();
    },
    async fail(image) {
      assert.ok(image, 'Expected an image request');
      image.finishNetwork(false);
      image.rejectDecode?.(new Error('Image unavailable'));
      await flush();
    },
    close() { loader.destroy(); dom.window.close(); }
  };
}

test('Preload the exact full-size URLs once and allow at most two concurrent requests', async () => {
  const state = fixture();
  const urls = [
    'https://cdn.example.test/aarau-next.jpg?width=1400&v=7',
    'https://cdn.example.test/aarau-previous.jpg?width=1400&v=7',
    'https://cdn.example.test/aarau-after-next.jpg?width=1400&v=7'
  ];
  try {
    assert.equal(state.images.length, 0, 'Creating a gallery cache must not start image requests');
    state.loader.warm([urls[0], urls[0], urls[1], urls[2], urls[1]]);
    await flush();
    assert.deepEqual(state.images.map(image => image.src), urls.slice(0, 2));
    state.loader.warm(urls);
    await flush();
    assert.equal(state.images.length, 2, 'Repeated warming must reuse active work');
    await state.succeed(state.images[0]);
    assert.deepEqual(state.images.map(image => image.src), urls);
    await state.succeed(state.images[1]);
    await state.succeed(state.images[2]);
    state.loader.warm(urls);
    await flush();
    assert.equal(state.images.length, 3, 'Ready neighbours stay cached for a subsequent move');
    assert.ok(state.maxActive <= 2);
    assert.deepEqual(state.errors, []);
  } finally { state.close(); }
});

test('Closing clears queued work and reopening reuses requests already in flight', async () => {
  const state = fixture();
  const urls = ['https://cdn.example.test/a.jpg', 'https://cdn.example.test/b.jpg', 'https://cdn.example.test/stale.jpg'];
  const fresh = 'https://cdn.example.test/fresh.jpg';
  try {
    state.loader.warm(urls);
    await flush();
    state.loader.clear();
    state.loader.warm([urls[0], urls[1], fresh]);
    await flush();
    assert.equal(state.images.length, 2);
    await state.succeed(state.images[0]);
    assert.deepEqual(state.images.map(image => image.src), [urls[0], urls[1], fresh]);
    assert.equal(state.requests(urls[0]).length, 1);
    assert.equal(state.requests(urls[1]).length, 1);
    assert.equal(state.requests(urls[2]).length, 0, 'A queued image from the closed session must not start');
    await state.succeed(state.images[1]);
    await state.succeed(state.images[2]);
    assert.ok(state.maxActive <= 2);
    assert.deepEqual(state.errors, []);
  } finally { state.close(); }
});

test('Cleared and destroyed queues stay stopped when late image loads complete', async () => {
  for (const operation of ['clear', 'destroy']) {
    const state = fixture();
    try {
      state.loader.warm(['https://cdn.example.test/a.jpg', 'https://cdn.example.test/b.jpg', 'https://cdn.example.test/stale.jpg']);
      await flush();
      state.loader[operation]();
      if (operation === 'destroy') assert.ok(state.images.every(image => image.src === ''), 'Destroy clears the active image sources');
      await state.succeed(state.images[0], false, false);
      await state.succeed(state.images[1], false, false);
      assert.equal(state.images.length, 2, `${operation} must prevent stale queued requests`);
      if (operation === 'destroy') {
        state.loader.warm(['https://cdn.example.test/never.jpg']);
        await flush();
        assert.equal(state.images.length, 2, 'A destroyed loader must ignore later warm calls');
      }
      assert.deepEqual(state.errors, []);
    } finally { state.close(); }
  }
});

test('Destroying during decode ignores its later resolution and keeps the stale queue stopped', async () => {
  const state = fixture();
  try {
    state.loader.warm(['https://cdn.example.test/a.jpg', 'https://cdn.example.test/b.jpg', 'https://cdn.example.test/stale.jpg']);
    await flush();
    const first = state.images[0];
    first.finishNetwork(true);
    await flush();
    assert.equal(first.decodeCalls, 1);
    assert.equal(state.images.length, 2, 'Decoding retains its concurrency slot until ready');
    state.loader.destroy();
    first.resolveDecode();
    await flush();
    assert.equal(state.images.length, 2, 'A late decode must not restart downloads after destroy');
    assert.ok(state.images.every(image => image.src === ''), 'Active Image references release their sources');
    assert.deepEqual(state.errors, []);
  } finally { state.close(); }
});

test('Decode rejection and image errors release their slots without blocking later images', async () => {
  const state = fixture();
  const urls = ['https://cdn.example.test/decode.jpg', 'https://cdn.example.test/error.jpg', 'https://cdn.example.test/next.jpg'];
  try {
    state.loader.warm(urls);
    await flush();
    await state.succeed(state.images[0], true);
    assert.equal(state.requests(urls[2]).length, 1, 'A rejected decode must not strand the queue');
    await state.fail(state.images[1]);
    state.loader.warm([urls[1]]);
    await flush();
    assert.equal(state.requests(urls[1]).length, 2, 'A later opening can retry a failed image');
    await state.succeed(state.requests(urls[2])[0]);
    await state.succeed(state.requests(urls[1])[1]);
    assert.ok(state.maxActive <= 2);
    assert.deepEqual(state.errors, []);
  } finally { state.close(); }
});

test('Retain up to eight decoded images and evict the oldest ready entry', async () => {
  const state = fixture();
  const urls = Array.from({length:9}, (_, index) => `https://cdn.example.test/gallery-${index}.jpg?width=1400`);
  try {
    for (const url of urls) {
      state.loader.warm([url]);
      await flush();
      await state.succeed(state.requests(url)[0]);
    }
    state.loader.warm(urls.slice(1));
    await flush();
    assert.equal(state.images.length, 9, 'The latest eight decoded images should be reusable');
    state.loader.warm([urls[0]]);
    await flush();
    assert.equal(state.requests(urls[0]).length, 2, 'The oldest ninth image must be evicted to bound retained memory');
    await state.succeed(state.requests(urls[0])[1]);
    assert.deepEqual(state.errors, []);
  } finally { state.close(); }
});

test('A caller-defined limit retains a whole product gallery beyond eight images', async () => {
  const state = fixture({limit:11});
  const urls = Array.from({length:11}, (_, index) => `https://cdn.example.test/gallery-${index}.jpg?width=1400`);
  try {
    state.loader.warm(urls);
    await flush();
    assert.equal(state.images.length, 2, 'Concurrency stays at two even for a full gallery');
    while (state.images.some(image => image.loading)) await state.succeed(state.images.find(image => image.loading));
    assert.deepEqual(state.images.map(image => image.src), urls, 'Every requested image is downloaded once');
    state.loader.warm(urls);
    await flush();
    assert.equal(state.images.length, 11, 'All eleven decoded images stay reusable');
    assert.ok(state.maxActive <= 2);
    assert.deepEqual(state.errors, []);
  } finally { state.close(); }
});

test('Invalid limits fall back to the default of eight', async () => {
  for (const limit of [undefined, 0, -3, 'many', NaN]) {
    const state = fixture({limit});
    const urls = Array.from({length:9}, (_, index) => `https://cdn.example.test/default-${index}.jpg`);
    try {
      state.loader.warm(urls);
      await flush();
      while (state.images.some(image => image.loading)) await state.succeed(state.images.find(image => image.loading));
      assert.equal(state.images.length, 8, `Limit ${String(limit)} keeps the default cap`);
      assert.deepEqual(state.errors, []);
    } finally { state.close(); }
  }
});
