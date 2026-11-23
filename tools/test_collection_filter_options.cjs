const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');

const engine = new Liquid({root: path.join(__dirname, '../snippets'), extname: '.liquid', strictFilters: true});
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const imageRequests = [];
engine.registerFilter('image_url', (image, ...args) => { imageRequests.push({image, args}); return image.src; });
engine.registerFilter('image_tag', (url, ...args) => {
  const attributes = Object.fromEntries(args.filter(Array.isArray));
  return `<img src="${escape(url)}" alt="${escape(attributes.alt)}" width="${attributes.width}" height="${attributes.height}" loading="${attributes.loading}">`;
});
const css = readFileSync(path.join(__dirname, '../assets/collection-filters.css'), 'utf8');
const base = {param_name: 'filter.p.m.aico_metafields.obermaterial_list', value: 'Textil', label: 'Textil', count: 7, active: false};
async function fixture(values = [{}], extras = {}) {
  const html = await Promise.all(values.map((value, index) => engine.renderFile('collection-filter-option', {value: {...base, ...value}, input_id: `NativeFilter-${index}`, ...extras})));
  return new JSDOM(`<style>${css}</style><form class="filters-sidebar" action="/collections/echt" method="get">${html.join('')}</form>`);
}

test('native form parameters and the escaped visible label remain unchanged and clickable', async () => {
  const value = {param_name: 'filter.p.m.aico_metafields.obermaterial_list', value: 'Leder & "Textil"', label: 'Leder <b>& Textil</b>', count: 9};
  const dom = await fixture([value]);
  try {
    const document = dom.window.document;
    const input = document.querySelector('input');
    const label = document.querySelector('label');
    assert.equal(label.htmlFor, input.id);
    assert.equal(input.name, value.param_name);
    assert.equal(input.value, value.value);
    assert.equal(label.querySelector('.collection-filter-option__label').textContent, value.label);
    assert.equal(label.querySelector('b'), null);
    assert.equal(label.querySelector('.filter-count').textContent, '9');
    label.click();
    assert.equal(input.checked, true);
    assert.deepEqual([...new dom.window.FormData(document.querySelector('form'))], [[value.param_name, value.value]]);
    assert.equal(dom.window.getComputedStyle(label).minHeight, '44px');
  } finally { dom.window.close(); }
});

test('native swatch colours add a decorative visual while keeping the full text label', async () => {
  const dom = await fixture([{label: 'Weiss', value: 'white', swatch: {color: '#ffffff'}}]);
  try {
    const document = dom.window.document;
    const visual = document.querySelector('.collection-filter-option__visual');
    assert.equal(visual.getAttribute('aria-hidden'), 'true');
    assert.equal(visual.style.getPropertyValue('--collection-filter-color'), '#ffffff');
    assert.equal(document.querySelector('.collection-filter-option__label').textContent, 'Weiss');
    assert.equal(document.querySelector('img'), null);
  } finally { dom.window.close(); }
});

test('a native swatch pattern image takes priority over its colour and is decorative', async () => {
  const pattern = {src: 'https://cdn.example/pattern.png'};
  const dom = await fixture([{label: 'Mehrfarbig', swatch: {color: '#123456', image: pattern}}]);
  try {
    const document = dom.window.document;
    const visual = document.querySelector('.collection-filter-option__visual');
    const image = visual.querySelector('img');
    assert.equal(image.getAttribute('src'), pattern.src);
    assert.equal(image.alt, '');
    assert.equal(image.getAttribute('loading'), 'lazy');
    assert.equal(image.getAttribute('width'), '32');
    assert.equal(visual.style.getPropertyValue('--collection-filter-color'), '');
    assert.equal(visual.classList.contains('collection-filter-option__visual--image'), false);
    assert.equal(document.querySelector('.collection-filter-option__label').textContent, 'Mehrfarbig');
    assert.ok(imageRequests.some(request => request.image === pattern && request.args.some(arg => Array.isArray(arg) && arg[0] === 'width' && arg[1] === 64)));
  } finally { dom.window.close(); }
});

test('native image-presentation values preserve an uncropped image and their label', async () => {
  const image = {src: 'https://cdn.example/sole-icon.png'};
  const dom = await fixture([{label: 'Vorhandene Sohle', image, swatch: {image: {src: 'https://cdn.example/other.png'}, color: '#abc123'}}]);
  try {
    const document = dom.window.document;
    const visual = document.querySelector('.collection-filter-option__visual');
    assert.ok(visual.classList.contains('collection-filter-option__visual--image'));
    assert.equal(visual.querySelector('img').getAttribute('src'), image.src);
    assert.equal(dom.window.getComputedStyle(visual.querySelector('img')).objectFit, 'contain');
    assert.equal(document.querySelector('.collection-filter-option__label').textContent, 'Vorhandene Sohle');
  } finally { dom.window.close(); }
});

test('missing native visuals retain text without guessed colours or AICO-derived filter values', async () => {
  const dom = await fixture([{label: 'Blau', value: 'blue', swatch: {}}, {label: 'Tropo', value: 'existing-sole'}, {label: 'Textil', swatch: null}], {
    product: {metafields: {aico: {option_value_colors: {value: {Farbe: {Blau: ['#0000ff']}}}}}},
  });
  try {
    assert.equal(dom.window.document.querySelector('.collection-filter-option__visual, img'), null);
    assert.deepEqual([...dom.window.document.querySelectorAll('.collection-filter-option__label')].map(label => label.textContent), ['Blau', 'Tropo', 'Textil']);
    assert.equal(dom.window.document.querySelectorAll('input').length, 3);
  } finally { dom.window.close(); }
});

test('unavailable inactive values are disabled while selected zero-count values remain removable', async () => {
  const dom = await fixture([{count: 0, active: false}, {count: 0, active: true}, {count: 7, active: true}]);
  try {
    const document = dom.window.document;
    const inputs = [...document.querySelectorAll('input')];
    const labels = [...document.querySelectorAll('label')];
    assert.equal(inputs[0].disabled, true);
    assert.ok(labels[0].classList.contains('is-disabled'));
    labels[0].click();
    assert.equal(inputs[0].checked, false);
    assert.equal(inputs[1].disabled, false);
    assert.equal(inputs[1].checked, true);
    labels[1].click();
    assert.equal(inputs[1].checked, false);
    assert.equal(inputs[2].checked, true);
    assert.deepEqual([...new dom.window.FormData(document.querySelector('form'))], [[base.param_name, base.value]]);
  } finally { dom.window.close(); }
});

test('caller-provided IDs preserve a unique explicit label association even with special characters', async () => {
  const inputId = 'Filter-1-<"&>';
  const dom = await fixture([{}], {input_id: inputId});
  try {
    const document = dom.window.document;
    assert.equal(document.querySelector('input').id, inputId);
    assert.equal(document.querySelector('label').htmlFor, inputId);
    assert.equal(document.querySelector('label').control, document.querySelector('input'));
  } finally { dom.window.close(); }
});
