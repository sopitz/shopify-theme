const {test} = require('node:test');
const assert = require('node:assert/strict');
const {mkdtempSync, writeFileSync, rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {stripLeadingBlockComments, parseThemeJson, readThemeJson} = require('./read_theme_json.cjs');

test('Shopify generated headers and repeated leading notices parse without changing JSON string content', () => {
  const payload = {url:'https://example.test/path/*literal*/', text:'/* Inhalt */ und // Text', closing:'*/'};
  const encoded = JSON.stringify(payload);
  for (const prefix of ['', '/* Shopify generated */', ' \t\r\n/*\nShopify generated\n*/\n', '/* First */ \n/* Second */\t']) {
    assert.deepEqual(parseThemeJson(prefix + encoded), payload, prefix);
  }
  assert.equal(stripLeadingBlockComments(encoded), encoded);
  assert.equal(parseThemeJson('"/* literal JSON string */"'), '/* literal JSON string */');
});

test('inner, trailing, line and unterminated comments remain strict JSON errors', () => {
  for (const source of [
    '{"first":1, /* Inner comment */ "second":2}',
    '{} /* Trailing comment */',
    '// Leading line comment\n{}',
    '/* Unterminated notice\n{}',
    '/* Valid notice */ /* Unterminated notice\n{}',
    '/* Notice without JSON */',
  ]) {
    assert.throws(() => parseThemeJson(source), SyntaxError, source);
  }
});

test('file reader accepts a real Shopify-style generated notice and preserves resource URLs', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'upswing-theme-json-'));
  try {
    const filename = path.join(directory, 'settings_data.json');
    const payload = {current:{url:'https://example.test/a/*literal*/?text=//value', label:'/* Kein Kommentar */'}};
    writeFileSync(filename, '/*\n * IMPORTANT: This file is auto-generated.\n */\n' + JSON.stringify(payload));
    assert.deepEqual(readThemeJson(filename), payload);
  } finally {
    rmSync(directory, {recursive:true, force:true});
  }
});
