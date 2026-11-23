const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');

const runtime = readFileSync(path.join(__dirname, '../assets/collection-guidance.js'), 'utf8');
const questionOne = 'Was ist der Unterschied zwischen kybun und Joya?';
const questionTwo = 'Wie lange dauert die Eingewöhnung?';
const original = `<h2 id="CollectionNativeFaq-QA">Häufige Fragen</h2><p><strong>${questionOne}</strong><br>kybun hat einen stärkeren Trampolin-Effekt. Joya ist stabiler und dämpfend.</p><p><strong>${questionTwo}</strong><br>Trag den Schuh in den ersten Tagen ein bis zwei Stunden und steigere dann schrittweise.</p><p><a href="/pages/kybun">Weitere Fragen und Antworten</a></p>`;
const normalize = text => text.replace(/\s+/g, ' ').trim();
const wrap = content => `<section id="NativeSection"><div class="collection-description">${content}</div></section>`;
function fixture(content = original, {run = true} = {}) {
  const dom = new JSDOM(wrap(content), {url: 'https://upswing.example/collections/kybun-schuhe', runScripts: 'outside-only'});
  dom.window.matchMedia = () => { throw new Error('Native FAQ enhancement must not register responsive listeners'); };
  if (run) dom.window.eval(runtime);
  return {dom, window: dom.window, document: dom.window.document};
}

test('the two current kybun FAQ paragraphs become native disclosures and the original text appears once', () => {
  const f = fixture(original, {run: false});
  try {
    const description = f.document.querySelector('.collection-description');
    const before = normalize(description.textContent);
    const originalLink = description.querySelector('a');
    f.window.eval(runtime);
    const list = description.querySelector('.collection-faq-list');
    const details = [...list.querySelectorAll('details.collection-faq-item')];
    assert.equal(details.length, 2);
    assert.equal(normalize(description.textContent), before);
    assert.deepEqual(details.map(row => row.querySelector('summary').textContent), [questionOne, questionTwo]);
    assert.ok(details.every(row => !row.open));
    assert.ok(details.every(row => row.querySelector('summary > .collection-faq-marker[aria-hidden="true"]')));
    assert.equal(description.querySelector('a'), originalLink);
    assert.equal(list.nextElementSibling.querySelector('a'), originalLink);
    assert.equal(description.textContent.split(questionOne).length - 1, 1);
    details[0].querySelector('summary').click();
    assert.equal(details[0].open, true, 'Native summary behaviour remains available');
    assert.equal(details[1].open, false);
  } finally { f.dom.window.close(); }
});

test('answer links and nested formatting are moved as their original DOM nodes', () => {
  const content = '<h2 id="CollectionNativeFaq-QA">Häufige Fragen</h2><p> \n<strong style="color:blue">Welche Sohle passt?</strong> \n<br>Eine <em style="font-style:normal">bestätigte</em> Antwort mit <a href="/pages/beratung?from=faq#Termin" class="text-link">persönlicher Beratung</a> und <span data-original="true"><strong>Details</strong>.</span></p>';
  const f = fixture(content, {run: false});
  try {
    const question = f.document.querySelector('p > strong');
    const emphasis = f.document.querySelector('em');
    const link = f.document.querySelector('a');
    const nested = f.document.querySelector('span[data-original]');
    f.window.eval(runtime);
    const details = f.document.querySelector('details');
    assert.equal(details.querySelector('summary > strong'), question);
    assert.equal(details.querySelector('.rte > em'), emphasis);
    assert.equal(details.querySelector('.rte > a'), link);
    assert.equal(details.querySelector('.rte > span'), nested);
    assert.equal(question.getAttribute('style'), 'color:blue');
    assert.equal(emphasis.getAttribute('style'), 'font-style:normal');
    assert.equal(link.getAttribute('href'), '/pages/beratung?from=faq#Termin');
    assert.equal(nested.innerHTML, '<strong>Details</strong>.');
    assert.equal(f.document.querySelectorAll('a').length, 1);
  } finally { f.dom.window.close(); }
});

test('conversion stops at the first unmatched paragraph and keeps every following node in order', () => {
  const content = '<h2 id="CollectionNativeFaq-QA">Häufige Fragen</h2><p><strong>Erste Frage?</strong><br>Erste Antwort.</p><p id="Keep">Redaktioneller Zwischentext.</p><p id="Later"><strong>Spätere Frage?</strong><br>Spätere Antwort.</p><h2 id="Next">Weiteres Thema</h2>';
  const f = fixture(content, {run: false});
  try {
    const keep = f.document.querySelector('#Keep');
    const later = f.document.querySelector('#Later');
    const next = f.document.querySelector('#Next');
    f.window.eval(runtime);
    const description = f.document.querySelector('.collection-description');
    assert.deepEqual([...description.children].map(node => node.id || node.className), ['CollectionNativeFaq-QA', 'collection-faq-list', 'Keep', 'Later', 'Next']);
    assert.equal(description.querySelectorAll('details').length, 1);
    assert.equal(description.querySelector('#Keep'), keep);
    assert.equal(description.querySelector('#Later'), later);
    assert.equal(description.querySelector('#Next'), next);
  } finally { f.dom.window.close(); }
});

test('unrecognised or incomplete paragraph shapes remain unchanged and visible', () => {
  const cases = [
    '<p>Frage?<br>Antwort ohne hervorgehobene Frage.</p>',
    '<p>Einleitung <strong>Frage?</strong><br>Antwort mit führendem Text.</p>',
    '<p><strong>Keine Frage</strong><br>Antwort.</p>',
    '<p><strong>Frage?</strong> Antwort ohne Zeilenumbruch.</p>',
    '<p><strong>Frage?</strong><br>&nbsp; \n</p>',
    '<p><strong>Frage?</strong><br><em></em></p>',
    '<p><strong>Frage?</strong><br><!-- Keine sichtbare Antwort --></p>',
    '<p><em>Frage?</em><br>Antwort.</p>',
    '<p><strong>Frage?</strong><span>Zwischeninhalt</span><br>Antwort.</p>',
    '<h3>Andere Gliederung</h3><p><strong>Frage?</strong><br>Antwort.</p>',
  ];
  for (const paragraph of cases) {
    const f = fixture('<h2 id="CollectionNativeFaq-QA">Häufige Fragen</h2>' + paragraph, {run: false});
    try {
      const description = f.document.querySelector('.collection-description');
      const before = description.innerHTML;
      f.window.eval(runtime);
      assert.equal(description.innerHTML, before, paragraph);
      assert.equal(description.querySelector('details'), null);
    } finally { f.dom.window.close(); }
  }
});

test('unwrapped visible text between FAQ paragraphs is not moved behind later answers', () => {
  const content = '<h2 id="CollectionNativeFaq-QA">Häufige Fragen</h2><p><strong>Erste Frage?</strong><br>Erste Antwort.</p>Ein wichtiger Zwischenhinweis.<p id="Later"><strong>Spätere Frage?</strong><br>Spätere Antwort.</p>';
  const f = fixture(content, {run: false});
  try {
    const before = normalize(f.document.querySelector('.collection-description').textContent);
    f.window.eval(runtime);
    assert.equal(f.document.querySelectorAll('details').length, 1);
    assert.equal(normalize(f.document.querySelector('.collection-description').textContent), before);
    assert.equal(f.document.querySelector('#Later').tagName, 'P');
  } finally { f.dom.window.close(); }
});

test('only a server-marked H2 inside the native description is enhanced', () => {
  const f = fixture('<h2>Häufige Fragen</h2><p><strong>Unmarkierte Frage?</strong><br>Antwort.</p>', {run: false});
  try {
    const outside = f.document.createElement('section');
    outside.innerHTML = '<h2 id="CollectionNativeFaq-Outside">Häufige Fragen</h2><p><strong>Andere Frage?</strong><br>Andere Antwort.</p><form id="OutsideForm"><input name="untouched" value="Original"></form>';
    f.document.body.append(outside);
    const before = f.document.body.innerHTML;
    f.window.eval(runtime);
    assert.equal(f.document.body.innerHTML, before);
    assert.equal(new f.window.FormData(f.document.querySelector('form')).get('untouched'), 'Original');
  } finally { f.dom.window.close(); }
});

test('repeated script loads, DOM readiness and section bindings are idempotent and preserve user state', () => {
  const f = fixture();
  try {
    const firstDetails = f.document.querySelector('details');
    firstDetails.open = true;
    f.window.eval(runtime);
    f.document.dispatchEvent(new f.window.Event('DOMContentLoaded'));
    f.document.querySelector('#NativeSection').dispatchEvent(new f.window.Event('shopify:section:load', {bubbles: true}));
    f.window.upswingCollectionGuidance.bind(f.document.querySelector('h2'));
    assert.equal(f.document.querySelectorAll('.collection-faq-list').length, 1);
    assert.equal(f.document.querySelectorAll('details').length, 2);
    assert.equal(f.document.querySelector('details'), firstDetails);
    assert.equal(firstDetails.open, true);
  } finally { f.dom.window.close(); }
});

test('section-load enhances freshly rendered native FAQs without modifying the existing section', () => {
  const f = fixture();
  try {
    const existing = f.document.querySelector('.collection-faq-list');
    const section = f.document.createElement('section');
    section.innerHTML = '<div class="collection-description"><h2 id="CollectionNativeFaq-New">Häufige Fragen</h2><p><strong>Neue Frage?</strong><br>Neue Antwort.</p></div>';
    f.document.body.append(section);
    assert.equal(section.querySelector('details'), null);
    section.dispatchEvent(new f.window.Event('shopify:section:load', {bubbles: true}));
    assert.equal(section.querySelectorAll('details').length, 1);
    assert.equal(section.querySelector('summary').textContent, 'Neue Frage?');
    assert.equal(f.document.querySelector('.collection-faq-list'), existing);
    assert.equal(existing.querySelectorAll('details').length, 2);
  } finally { f.dom.window.close(); }
});
