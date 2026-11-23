const assert = require('node:assert/strict');
const path = require('node:path');
const {test} = require('node:test');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');

const engine = new Liquid({root: path.join(__dirname, '../snippets'), extname: '.liquid', strictFilters: true});
const typed = value => ({type: 'json', value});
const render = (value, options = {}) => engine.renderFile('collection-aico-items', {field: typed(value), mode: 'faq', ...options});
const rows = document => [...document.querySelectorAll('.collection-faq-item, .collection-guide-card')];

test('AICO FAQs and buying guidance use question/answer data without altering trusted body markup', async () => {
  const question = 'Welche <b>Sohle</b> passt & warum?';
  const answer = '<p>Ein <strong>bestätigter</strong> Hinweis mit <a href="/pages/beratung">Beratung</a>.</p><ul><li>Erster Punkt</li></ul>';
  for (const mode of ['faq', 'guide']) {
    const dom = new JSDOM(await render([{question, answer}], {mode}));
    try {
      const document = dom.window.document;
      assert.equal(rows(document).length, 1);
      assert.equal(document.querySelector(mode === 'faq' ? 'summary' : 'h3').textContent.trim(), question);
      assert.equal(document.querySelector('summary b, h3 b'), null);
      assert.equal(document.querySelector('.rte').innerHTML, answer);
      assert.equal(document.querySelectorAll('a[href="/pages/beratung"]').length, 1);
      assert.equal(Boolean(document.querySelector('details > summary .icon')), mode === 'faq');
      assert.equal(Boolean(document.querySelector('article > h3')), mode === 'guide');
    } finally { dom.window.close(); }
  }
});

test('missing fields, wrong types, encoded JSON strings and non-array JSON shapes stay empty', async () => {
  const entry = {question: 'Bestätigte Frage?', answer: '<p>Bestätigte Antwort.</p>'};
  const fields = [
    undefined, null, {}, {value: [entry]}, {type: 'json_string', value: [entry]},
    {type: 'single_line_text_field', value: JSON.stringify([entry])},
    typed(null), typed({de: [entry]}), typed(entry), typed(JSON.stringify([entry])), typed(42), typed(false), typed([]),
  ];
  for (const field of fields) {
    for (const output of [undefined, 'has_content']) {
      assert.equal(await render(null, {field, output}), '', JSON.stringify({field, output}));
    }
  }
});

test('invalid rows and invisible questions or answers are skipped while valid neighbours survive', async () => {
  const invalid = [
    null, false, 23, 'Keine Objektzeile', ['Frage', 'Antwort'], {},
    {question: {de: 'Falsch'}, answer: 'Antwort'}, {question: ['Falsch'], answer: 'Antwort'},
    {question: false, answer: 'Antwort'}, {question: 0, answer: 'Antwort'},
    ...['', '  ', '&nbsp;', '&#160;', '&#xA0;', '&#xa0;', ' ', '<b></b>'].map(question => ({question, answer: 'Antwort'})),
    ...[undefined, null, false, 0, [], {}, '', '  ', '<p>&nbsp;&#160;&#xA0;&#xa0; <br></p>'].map(answer => ({question: 'Frage?', answer})),
  ];
  const valid = {question: 'Die gültige Frage?', answer: '<p>Die gültige Antwort.</p>'};
  assert.equal(await render(invalid, {output: 'has_content'}), '');
  const dom = new JSDOM(await render([...invalid, valid]));
  try {
    assert.equal(rows(dom.window.document).length, 1);
    assert.equal(dom.window.document.querySelector('summary').textContent.trim(), valid.question);
    assert.doesNotMatch(dom.window.document.body.textContent, /\[object Object\]|Keine Objektzeile|Falsch/);
  } finally { dom.window.close(); }
  assert.equal(await render([...invalid, valid], {output: 'has_content'}), 'true');
});

test('exported code and purchase controls reject the entire source row rather than leaving partial copy', async () => {
  for (const fragment of [
    '<script>alert(1)</script>', '<form><button>Kaufen</button></form>',
    '<iframe src="/export"></iframe>', '<section>Exportseite</section>',
    '<div class="shopify-section">Exportbereich</div>',
  ]) {
    const entries = [{question: 'Ungültige Quelle?', answer: '<p>Anfang.</p>' + fragment + '<p>Ende.</p>'}];
    assert.equal(await render(entries), '', fragment);
    assert.equal(await render(entries, {output: 'has_content'}), '', fragment);
  }
});

test('inherited identical visible question/answer pairs appear once and preserve source order', async () => {
  const entries = [
    {question: 'Passt es & warum?', answer: '<p>Ja, <strong>mit Beratung</strong>.</p>'},
    {question: 'Weitere Frage?', answer: '<p>Eine weitere Antwort.</p>'},
    {question: '  PASST  es &amp; warum? ', answer: '<div>JA, mit  Beratung.</div>'},
    {question: 'Passt es & warum?', answer: '<p>Eine abweichende Antwort wird nicht gelöscht.</p>'},
  ];
  const dom = new JSDOM(await render(entries));
  try {
    const document = dom.window.document;
    assert.equal(rows(document).length, 3);
    assert.deepEqual([...document.querySelectorAll('summary')].map(el => el.textContent.trim()), ['Passt es & warum?', 'Weitere Frage?', 'Passt es & warum?']);
    assert.ok(document.body.textContent.includes('Eine abweichende Antwort wird nicht gelöscht.'));
    assert.equal(document.querySelector('.rte').innerHTML, entries[0].answer);
  } finally { dom.window.close(); }
});

test('a question already in the full native description is not repeated as imported guidance', async () => {
  const entries = [
    {question: 'Passt es & warum?', answer: '<p>Eine bereits vorhandene Antwort.</p>'},
    {question: 'Was ist neu?', answer: '<p>Ein zusätzlicher Hinweis.</p>'},
  ];
  const description = '<h2>Details</h2><p><strong>PASST es &amp;\nwarum?</strong><br>Antwort im Original.</p>';
  for (const mode of ['faq', 'guide']) {
    const dom = new JSDOM(await render(entries, {mode, description}));
    try {
      assert.equal(rows(dom.window.document).length, 1);
      assert.equal(dom.window.document.querySelector('summary, h3').textContent.trim(), 'Was ist neu?');
      assert.equal(dom.window.document.querySelector('.rte').textContent, 'Ein zusätzlicher Hinweis.');
    } finally { dom.window.close(); }
  }
});

test('has_content reports a valid source before description deduplication without rendering markup', async () => {
  const entries = [{question: 'Vorhandene Frage?', answer: '<p>Antwort.</p>'}];
  const description = '<p><strong>Vorhandene Frage?</strong><br>Antwort.</p>';
  assert.equal(await render(entries, {description}), '');
  assert.equal(await render(entries, {description, output: 'has_content'}), 'true');
});

test('signature deduplication does not collapse different values containing punctuation or JSON-like text', async () => {
  const entries = [
    {question: '["Frage","Antwort"]?', answer: 'Antwort 1'},
    {question: 'Frage?', answer: '["Frage","Antwort"]'},
    {question: '["Frage","Antwort"]?', answer: 'Antwort 2'},
  ];
  const dom = new JSDOM(await render(entries));
  try { assert.equal(rows(dom.window.document).length, 3); } finally { dom.window.close(); }
});

test('unsupported rendering modes emit neither content nor a validity marker', async () => {
  for (const mode of [undefined, '', 'other']) {
    assert.equal(await render([{question: 'Frage?', answer: 'Antwort'}], {mode}), '');
    assert.equal(await render([{question: 'Frage?', answer: 'Antwort'}], {mode, output: 'has_content'}), '');
  }
});
