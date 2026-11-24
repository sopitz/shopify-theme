const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');
const script=readFileSync(path.resolve(__dirname,'../assets/product-description.js'),'utf8');
const normal=value=>value.replace(/\s+/g,' ').trim();

test('editorial grouping preserves native text, images, links and node identity without copying content',()=>{
  const dom=new JSDOM('<article data-native-product-description><p>Einleitung</p><h2 id="effect">Wirkung</h2><p>Original <a href="/pages/beratung">Beratung</a>.</p><ul><li>Ein Merkmal</li></ul><h2>Material</h2><p><img src="/material.jpg" alt="Originalmaterial"> Originalmaterial</p><h2>Häufige Fragen</h2><p><strong>Eine Frage?</strong><br>Eine Antwort mit <a href="/products/pflege">Pflege</a>.</p></article>',{runScripts:'outside-only'});
  try{
    const doc=dom.window.document;const article=doc.querySelector('article');
    const text=normal(article.textContent);const image=article.querySelector('img');const link=article.querySelector('a');const heading=article.querySelector('#effect');
    dom.window.eval(script);doc.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    assert.equal(normal(article.textContent),text);
    assert.equal(article.querySelectorAll('.product-description-section').length,3);
    assert.equal(article.querySelectorAll('.product-description-section--faq details').length,1);
    assert.equal(article.querySelector('img'),image);
    assert.equal(article.querySelector('a'),link);
    assert.equal(article.querySelector('#effect'),heading);
    assert.equal(article.querySelectorAll('a[href="/products/pflege"]').length,1);
    assert.equal(article.querySelector('summary').textContent,'Eine Frage?');
    doc.body.dispatchEvent(new dom.window.Event('shopify:section:load',{bubbles:true}));
    assert.equal(article.querySelectorAll('.product-description-section').length,3);
    assert.equal(normal(article.textContent),text);
  }finally{dom.window.close();}
});

test('unsupported nested prose and non-question paragraphs remain intact',()=>{
  const dom=new JSDOM('<article data-native-product-description><div><h2>Verschachtelt</h2><p>Beliebiger Inhalt</p></div></article><article data-native-product-description><h2>FAQ</h2><p><strong>Hinweis ohne Fragezeichen</strong><br>Bleibt ein Absatz.</p></article>',{runScripts:'outside-only'});
  try{
    const doc=dom.window.document;const first=doc.querySelector('article');const original=first.innerHTML;
    dom.window.eval(script);doc.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    assert.equal(first.innerHTML,original);
    assert.equal(doc.querySelectorAll('details').length,0);
    assert.match(doc.body.textContent,/Bleibt ein Absatz/);
  }finally{dom.window.close();}
});

test('text-free native anchors, forms and SVG elements survive grouping unchanged',()=>{
  const dom=new JSDOM('<article data-native-product-description><a id="native-anchor"></a><form><input name="original"></form><svg aria-label="Originalgrafik"><path d="M0 0"></path></svg><h2>Details</h2><p>Inhalt</p></article>',{runScripts:'outside-only'});
  try{
    const doc=dom.window.document;const originals=[doc.querySelector('#native-anchor'),doc.querySelector('form'),doc.querySelector('svg')];
    dom.window.eval(script);doc.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    for(const node of originals)assert.equal(doc.querySelector('article').contains(node),true);
    assert.equal(doc.querySelector('input').name,'original');
  }finally{dom.window.close();}
});
