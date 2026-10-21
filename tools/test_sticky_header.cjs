const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');

const source = readFileSync(path.join(__dirname, '../assets/sticky-header.js'), 'utf8');
function fixture() {
  const dom = new JSDOM('<div class="shopify-section-header"><header data-navigation-root><div data-header-utility></div><div data-header-core></div></header></div>', {runScripts:'outside-only'});
  const {window} = dom;
  const {document} = window;
  const wrapper = document.querySelector('.shopify-section-header');
  const header = wrapper.querySelector('header');
  let utilityHeight = 33, coreHeight = 114, top = 0;
  const frames = new Map(), observers = [];
  let nextFrame = 0;
  window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.nodes = []; this.disconnected = false; observers.push(this); }
    observe(node) { this.nodes.push(node); }
    disconnect() { this.disconnected = true; }
  };
  wrapper.querySelector('[data-header-utility]').getBoundingClientRect = () => ({height:utilityHeight});
  header.getBoundingClientRect = () => ({height:utilityHeight + coreHeight, top, bottom:top + utilityHeight + coreHeight});
  window.eval(source);
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); };
  return {window, document, wrapper, header, observers, frames, flush,
    metric:name => document.documentElement.style.getPropertyValue(name),
    resize(utility, core) { utilityHeight = utility; coreHeight = core; observers.at(-1).callback(); flush(); },
    scroll(value) { top = value; window.dispatchEvent(new window.Event('scroll')); flush(); },
  };
}

test('sticky offsets separate service messages from the permanent header and adapt to content changes', () => {
  const f = fixture();
  assert.equal(f.wrapper.style.getPropertyValue('--header-utility-height'), '33px');
  assert.equal(f.metric('--header-sticky-height'), '114px');
  assert.equal(f.metric('--header-visible-height'), '147px');
  assert.equal(f.observers[0].nodes.length, 2);
  f.resize(66, 65);
  assert.equal(f.wrapper.style.getPropertyValue('--header-utility-height'), '66px');
  assert.equal(f.metric('--header-sticky-height'), '65px');
  assert.equal(f.metric('--header-visible-height'), '131px');
  f.resize(0, 65);
  assert.equal(f.wrapper.style.getPropertyValue('--header-utility-height'), '0px');
  assert.equal(f.metric('--header-sticky-height'), '65px');
  f.window.close();
});

test('scrolling preserves the pinned height and tracks the actual space available to menus', () => {
  const f = fixture();
  f.scroll(-15);
  assert.equal(f.metric('--header-visible-height'), '132px');
  assert.equal(f.header.hasAttribute('data-header-stuck'), true);
  f.scroll(-33);
  assert.equal(f.metric('--header-visible-height'), '114px');
  assert.equal(f.metric('--header-sticky-height'), '114px');
  f.scroll(0);
  assert.equal(f.metric('--header-visible-height'), '147px');
  assert.equal(f.header.hasAttribute('data-header-stuck'), false);
  f.window.close();
});

test('Shopify section reloads do not duplicate listeners and unloading cancels pending work', () => {
  const f = fixture();
  f.window.eval(source);
  f.wrapper.dispatchEvent(new f.window.Event('shopify:section:load', {bubbles:true}));
  assert.equal(f.observers.length, 1);
  f.window.dispatchEvent(new f.window.Event('scroll'));
  f.window.dispatchEvent(new f.window.Event('resize'));
  assert.equal(f.frames.size, 1);
  f.wrapper.dispatchEvent(new f.window.Event('shopify:section:unload', {bubbles:true}));
  assert.equal(f.observers[0].disconnected, true);
  assert.equal(f.frames.size, 0);
  assert.equal(f.metric('--header-sticky-height'), '');
  f.window.dispatchEvent(new f.window.Event('scroll'));
  assert.equal(f.frames.size, 0);
  f.wrapper.dispatchEvent(new f.window.Event('shopify:section:load', {bubbles:true}));
  assert.equal(f.observers.length, 2);
  assert.equal(f.metric('--header-sticky-height'), '114px');
  f.window.close();
});
