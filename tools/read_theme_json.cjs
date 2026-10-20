const {readFileSync} = require('node:fs');

// Shopify can prepend generated-file notices. Everything after those leading
// block comments remains strict JSON, including comment-like text in strings.
function stripLeadingBlockComments(source) {
  return String(source).replace(/^(?:[ \t\r\n]*\/\*[\s\S]*?\*\/)+/, '');
}

function parseThemeJson(source) {
  return JSON.parse(stripLeadingBlockComments(source));
}

function readThemeJson(filename) {
  return parseThemeJson(readFileSync(filename, 'utf8'));
}

module.exports = {stripLeadingBlockComments, parseThemeJson, readThemeJson};
