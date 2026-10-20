const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');

const engine = new Liquid({root:path.join(__dirname,'../snippets'),extname:'.liquid',strictFilters:true});
const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const renderRich = node => {
  if(!node)return '';
  const children = (node.children || []).map(renderRich).join('');
  if(node.type === 'text')return node.bold ? `<strong>${escape(node.value)}</strong>` : escape(node.value);
  if(node.type === 'paragraph')return `<p>${children}</p>`;
  if(node.type === 'link')return `<a href="${escape(node.url)}">${children}</a>`;
  return children;
};
const renderedRichFields = [];
engine.registerFilter('metafield_tag',field => {
  renderedRichFields.push(field);
  return `<div class="metafield-rich_text_field">${renderRich(field.value)}</div>`;
});
const jsonBody = html => engine.renderFile('product-json-html',{html});
const textField = field => engine.renderFile('product-metafield-content',{field});

test('JSON text keeps simple live formatting, links and lists intact',async()=>{
  const html = '<h3>Material &amp; Aufbau</h3><p>Live <strong>Eigenschaft</strong> und <em>Anwendung</em> mit <a href="/pages/anleitung">Anleitung</a>.</p><ul><li>Erster Punkt</li><li>Zweiter Punkt</li></ul><ol><li>Erster Schritt</li></ol><blockquote>Hinweis aus AICO.</blockquote><div><span>Weitere Information.</span></div>';
  assert.equal(await jsonBody(html),html);
  assert.equal(await jsonBody('Einfacher Text ohne HTML.'),'Einfacher Text ohne HTML.');
  assert.equal(await jsonBody('<p>Das Wort product-form ist hier nur Text.</p>'),'<p>Das Wort product-form ist hier nur Text.</p>');
});

test('JSON bodies need a string with visible text',async()=>{
  for(const value of [null,undefined,true,false,0,42,{},[],{body:'Kein direkter Text'},['Kein direkter Text'],'',' \n\t ','<p>&nbsp;&#160;&#xA0;&#xa0; <br></p>','<div><p></p></div>','<p><img src="/photo.jpg"></p>']){
    assert.equal(await jsonBody(value),'',JSON.stringify(value));
  }
});

test('JSON export controls and code discard the entire body rather than leaving partial purchase UI',async()=>{
  const fragments = [
    '<form action="/cart/add"><input name="id" value="999"><button>Falschen Artikel kaufen</button></form>',
    '<ScRiPt>alert("export")</ScRiPt>',
    '<STYLE>.product-form{display:none}</STYLE>',
    '<INPUT name="quantity" value="9">',
    '<select name="id"><option>Fremde Variante</option></select>',
    '<button type="submit">Kaufen</button>',
    '<iframe src="/products/export">Exportseite</iframe>',
    '<textarea name="note">Exportnotiz</textarea>',
    '<object data="/export.html">Export</object>',
    '<embed src="/export.html">',
    '<link rel="stylesheet" href="/export.css">',
    '<meta http-equiv="refresh" content="0;url=/cart">',
    '<base href="https://example.invalid/">',
    'Verwaister Abschluss </FoRm>'
  ];
  for(const fragment of fragments){
    assert.equal(await jsonBody('<p>Gültiger Anfang.</p>'+fragment+'<p>Gültiges Ende.</p>'),'',fragment);
  }
});

test('JSON page wrappers and known exported product containers are not product copy',async()=>{
  const fragments = [
    '<!DOCTYPE html><p>Exportseite</p>',
    '<html><body><p>Exportseite</p></body></html>',
    '<head><title>Exportseite</title></head>',
    '<main><p>Exportseite</p></main>',
    '<header><p>Exportnavigation</p></header>',
    '<footer><p>Exportfooter</p></footer>',
    '<nav><a href="/products/all">Exportnavigation</a></nav>',
    '<section><p>Exportabschnitt</p></section>',
    '<article><p>Exportseite</p></article>',
    '<div class="shopify-section"><p>Exportprodukt</p></div>',
    '<div DATA-PRODUCT-SECTION><p>Exportprodukt</p></div>',
    '<div class="product-form"><p>Exportkaufbereich</p></div>',
    '<div class="product-section"><p>Exportprodukt</p></div>',
    '<div class="product-detail"><p>Exportprodukt</p></div>',
    '<div data-product-overview><p>Exportprodukt</p></div>',
    '<div id="MainContent"><p>Exportseite</p></div>',
    '<div class="page-width"><p>Exportseite</p></div>',
    '<div class="template-product"><p>Exportseite</p></div>'
  ];
  for(const fragment of fragments)assert.equal(await jsonBody(fragment),'',fragment);
});

test('an exported purchase form cannot add a second form, variant or submit button beside the native form',async()=>{
  const rejected = await jsonBody('<div><p>Kopierter Kaufbereich</p><form action="/cart/add"><input name="id" value="999"><button type="submit">Export kaufen</button></form></div>');
  const dom = new JSDOM(`<form data-native-product-form action="/cart/add"><input name="id" value="7"><button type="submit">Aktuelles Produkt kaufen</button></form><div class="product-knowledge-copy">${rejected}</div>`);
  try{
    const document = dom.window.document;
    assert.equal(document.querySelectorAll('form').length,1);
    assert.equal(document.querySelectorAll('input[name="id"]').length,1);
    assert.equal(document.querySelector('input[name="id"]').value,'7');
    assert.equal(document.querySelectorAll('button[type="submit"]').length,1);
    assert.equal(document.querySelector('.product-knowledge-copy').innerHTML,'');
  }finally{dom.window.close();}
});

test('plain text fields escape scalar text and preserve real line breaks',async()=>{
  const value = '<form><strong>Nur Text</strong></form> & mehr\nZweite Zeile';
  const html = await textField({type:'multi_line_text_field',value});
  const dom = new JSDOM(html);
  try{
    const document = dom.window.document;
    assert.equal(document.querySelector('form,strong'),null);
    assert.equal(document.querySelectorAll('br').length,1);
    assert.equal(document.querySelector('p').textContent,value);
  }finally{dom.window.close();}
  for(const type of ['single_line_text_field','multi_line_text_field',undefined]){
    assert.equal(await textField({type,value:'Live & korrekt'}),'<p>Live &amp; korrekt</p>');
    assert.equal(await textField({type,value:0}),'<p>0</p>');
    assert.equal(await textField({type,value:false}),'<p>false</p>');
  }
});

test('plain text never coerces object, list, empty or unsupported values into product claims',async()=>{
  for(const type of ['single_line_text_field','multi_line_text_field',undefined]){
    for(const value of [{},[],{text:'Falscher Wert'},['Falscher Wert'],null,undefined,'',' \n  ']){
      assert.equal(await textField({type,value}),'',JSON.stringify({type,value}));
    }
  }
  for(const type of ['json','list.single_line_text_field','number_integer','boolean','file_reference']){
    assert.equal(await textField({type,value:'Kein unterstütztes Inhaltsfeld'}),'',type);
  }
});

test('rich text continues through the Shopify metafield renderer and empty rich text stays hidden',async()=>{
  const field = {type:'rich_text_field',value:{type:'root',children:[{type:'paragraph',children:[{type:'text',value:'Bestätigter Richtext',bold:true},{type:'link',url:'/pages/anleitung',children:[{type:'text',value:' Anleitung'}]}]}]}};
  const before = renderedRichFields.length;
  const html = await textField(field);
  assert.equal(renderedRichFields.length,before+1);
  assert.equal(renderedRichFields.at(-1),field);
  const dom = new JSDOM(html);
  try{
    assert.equal(dom.window.document.querySelector('strong').textContent,'Bestätigter Richtext');
    assert.equal(dom.window.document.querySelector('a').getAttribute('href'),'/pages/anleitung');
    assert(!dom.window.document.body.textContent.includes('[object Object]'));
  }finally{dom.window.close();}
  assert.equal(await textField({type:'rich_text_field',value:{type:'root',children:[]}}),'');
  assert.equal(await textField({type:'rich_text_field',value:{type:'root',children:[{type:'paragraph',children:[{type:'text',value:' '}]}]}}),'');
});
