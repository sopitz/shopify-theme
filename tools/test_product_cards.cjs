const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const {JSDOM}=require('jsdom');
const {Liquid}=require('liquidjs');
const root=path.resolve(__dirname,'..');
const runtime=readFileSync(path.join(root,'assets/product-cards.js'),'utf8');
const cardMarkup=(secondary=true)=>`<article class="product-card" data-product-card${secondary?' data-card-secondary-image="/second.jpg" data-card-secondary-alt="Andere Ansicht"':''}><a class="product-media" href="/products/shoe"><img src="/first.jpg" srcset="/first-360.jpg 360w, /first.jpg 720w" sizes="24vw" alt="Originaler Schuh"></a><h3 class="product-title"><a href="/products/shoe">Schuh</a></h3><div class="swatches"><a class="swatch" href="/products/blue" data-card-swatch="/blue.jpg" aria-label="Blau">Blau</a></div></article>`;
function fixture(markup=cardMarkup(),hover=true){
 const dom=new JSDOM(`<html><body>${markup}<button id="outside">Ausserhalb</button></body></html>`,{url:'https://upswing.ch/collections/schuhe',runScripts:'outside-only',pretendToBeVisual:true});
 dom.window.matchMedia=()=>({matches:hover});
 dom.window.upswingGalleryImagePreload={create:()=>({warm(){},destroy(){}})};
 dom.window.eval(runtime);dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 const document=dom.window.document;
 return {dom,document,card:document.querySelector('.product-card'),image:document.querySelector('.product-media img')};
}
function pointer(t,node,type,pointerType='mouse',relatedTarget=null){
 const event=new t.dom.window.Event(type,{bubbles:true});
 Object.defineProperties(event,{pointerType:{value:pointerType},relatedTarget:{value:relatedTarget}});
 node.dispatchEvent(event);
}
const flush=()=>new Promise(resolve=>setTimeout(resolve,30));
function original(t){
 assert.equal(t.image.getAttribute('src'),'/first.jpg');
 assert.equal(t.image.getAttribute('srcset'),'/first-360.jpg 360w, /first.jpg 720w');
 assert.equal(t.image.getAttribute('sizes'),'24vw');
 assert.equal(t.image.alt,'Originaler Schuh');
}

test('mouse hover shows the real alternate image, then restores every original image attribute',()=>{
 const t=fixture();try{
  pointer(t,t.card,'pointerenter');assert.equal(t.image.src,'https://upswing.ch/second.jpg');assert.equal(t.image.alt,'Andere Ansicht');assert.equal(t.image.hasAttribute('srcset'),false);
  pointer(t,t.card,'pointerleave');original(t);
 }finally{t.dom.window.close();}
});
test('keyboard focus previews the alternate image and blur restores the default',async()=>{
 const t=fixture();try{
  t.card.querySelector('.product-media').focus();assert.equal(t.image.src,'https://upswing.ch/second.jpg');
  t.document.querySelector('#outside').focus();await flush();original(t);
 }finally{t.dom.window.close();}
});
test('colour intent has priority over the card alternate image, with reversible pointer and keyboard states',async()=>{
 const t=fixture();try{
  const swatch=t.card.querySelector('[data-card-swatch]'),media=t.card.querySelector('.product-media');
  pointer(t,t.card,'pointerenter');pointer(t,swatch,'pointerover');assert.equal(t.image.src,'https://upswing.ch/blue.jpg');
  pointer(t,swatch,'pointerout','mouse',media);assert.equal(t.image.src,'https://upswing.ch/second.jpg');
  pointer(t,t.card,'pointerleave');original(t);
  swatch.focus();assert.equal(t.image.src,'https://upswing.ch/blue.jpg');
  t.document.querySelector('#outside').focus();await flush();original(t);
 }finally{t.dom.window.close();}
});
test('touch and pointer-created focus do not leave a sticky alternate or colour preview',async()=>{
 const t=fixture();try{
  const media=t.card.querySelector('.product-media');
  pointer(t,t.card,'pointerenter','touch');pointer(t,media,'pointerdown','touch');media.focus();original(t);
  pointer(t,t.card,'pointerleave','touch');await flush();original(t);
  t.document.querySelector('#outside').focus();t.document.dispatchEvent(new t.dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));media.focus();
  assert.equal(t.image.src,'https://upswing.ch/second.jpg','keyboard navigation works again after touch');
 }finally{t.dom.window.close();}
});
test('a card with only one image keeps its real default view',()=>{
 const t=fixture(cardMarkup(false));try{
  pointer(t,t.card,'pointerenter');original(t);t.card.querySelector('.product-media').focus();original(t);
 }finally{t.dom.window.close();}
});
test('late legacy swatches and injected recommendation cards work without duplicate bindings',async()=>{
 const t=fixture();try{
  const late=t.document.createElement('a');late.href='/products/red';late.dataset.cardSwatch='/red.jpg';late.className='swatch';late.setAttribute('aria-label','Rot');
  t.card.querySelector('.swatches').append(late);t.card.dispatchEvent(new t.dom.window.CustomEvent('upswing:colors-ready',{bubbles:true}));
  pointer(t,t.card,'pointerenter');pointer(t,late,'pointerover');assert.equal(t.image.src,'https://upswing.ch/red.jpg');pointer(t,t.card,'pointerleave');original(t);
  const incoming=t.document.createElement('div');incoming.innerHTML=cardMarkup();t.document.body.append(incoming);
  incoming.dispatchEvent(new t.dom.window.CustomEvent('shopify:section:load',{bubbles:true}));
  await flush();const card=incoming.querySelector('.product-card'),image=card.querySelector('img');
  pointer(t,card,'pointerenter');assert.equal(image.src,'https://upswing.ch/second.jpg');
  incoming.dispatchEvent(new t.dom.window.CustomEvent('shopify:section:load',{bubbles:true}));pointer(t,card,'pointerleave');assert.equal(image.getAttribute('src'),'/first.jpg');
 }finally{t.dom.window.close();}
});
test('a committed local colour becomes the new default and uses its own alternate image',()=>{
 const t=fixture();try{
  t.image.setAttribute('src','/blue.jpg');t.image.setAttribute('alt','Blauer Schuh');t.image.removeAttribute('srcset');t.card.dataset.cardSecondaryImage='/blue-second.jpg';t.card.dataset.cardSecondaryAlt='Blau, andere Ansicht';
  t.card.dispatchEvent(new t.dom.window.CustomEvent('upswing:card-color-selected',{bubbles:true}));
  pointer(t,t.card,'pointerenter');assert.equal(t.image.src,'https://upswing.ch/blue-second.jpg');
  pointer(t,t.card,'pointerleave');assert.equal(t.image.getAttribute('src'),'/blue.jpg');assert.equal(t.image.alt,'Blauer Schuh');assert.equal(t.image.hasAttribute('srcset'),false);
 }finally{t.dom.window.close();}
});
test('navigation restores card defaults and old comparison storage cannot create UI',()=>{
 const t=fixture();try{
  t.dom.window.localStorage.setItem('upswing-compare-v1:upswing.ch',JSON.stringify([{handle:'shoe',title:'Schuh',url:'/products/shoe'}]));
  pointer(t,t.card,'pointerenter');t.dom.window.dispatchEvent(new t.dom.window.Event('pagehide'));original(t);
  assert.equal(t.document.querySelector('.compare-tray, [data-compare], #UpswingCompareDialog'),null);
  assert.equal(existsSync(path.join(root,'assets/compare.js')),false);
  assert.doesNotMatch(readFileSync(path.join(root,'layout/theme.liquid'),'utf8'),/compare\.js/);
 }finally{t.dom.window.close();}
});

test('native cards use actual image order and the first source paragraph without duplicate type or comparison UI',async()=>{
 const engine=new Liquid({root:path.join(root,'snippets'),extname:'.liquid',strictFilters:true});
 engine.registerFilter('image_url',image=>image.src);
 engine.registerFilter('image_tag',url=>`<img src="${url}" alt="">`);
 engine.registerFilter('money_with_currency',value=>`CHF ${(Number(value)/100).toFixed(2)}`);
 engine.registerFilter('money',value=>(Number(value)/100).toFixed(2));
 engine.registerFilter('placeholder_svg_tag',()=>'<svg></svg>');
 engine.registerFilter('metafield_tag',field=>typeof field.value==='string'?`<p>${field.value.replaceAll('\n','<br>')}</p>`:`<div>${field.value.children.map(paragraph=>`<p>${paragraph.children[0].value}</p>`).join('')}</div>`);
 const product={id:2,handle:'shoe',title:'Schuh',url:'/products/shoe',vendor:'kybun',type:'Damenschuhe',available:true,price_min:33000,price_max:33000,featured_image:{id:11,src:'/first.jpg'},images:[{id:11,src:'/first.jpg'},{id:12,src:'/second.jpg',alt:'Andere Ansicht'}],options_with_values:[],metafields:{upswing:{},custom_fields:{}},description:'<h2>Details</h2><p>Ein echter <strong>Produktabsatz</strong> mit Leder &amp; Mesh.</p><p>Zweiter Absatz.</p>'};
 const render=async()=>new JSDOM(await engine.renderFile('product-card',{product})).window.document;
 let doc=await render();assert.equal(doc.querySelector('[data-card-secondary-image]').dataset.cardSecondaryImage,'/second.jpg');assert.equal(doc.querySelector('.product-copy').textContent,'Ein echter Produktabsatz mit Leder & Mesh.');assert.equal(doc.querySelector('.product-type').textContent,'Damenschuhe');assert.equal(doc.querySelector('[data-compare],.compare-button'),null);
 product.metafields.upswing.short_description={type:'rich_text_field',value:{children:[{children:[{value:'Gepflegter Richtext-Kurztext.'}]}]}};
 doc=await render();assert.equal(doc.querySelector('.product-copy').textContent,'Gepflegter Richtext-Kurztext.');assert.doesNotMatch(doc.querySelector('.product-copy').textContent,/object Object/);
 product.metafields.upswing.short_description={type:'multi_line_text_field',value:'Erste Zeile.\nZweite Zeile.'};
 doc=await render();assert.equal(doc.querySelector('.product-copy').textContent.replace(/\s+/g,' ').trim(),'Erste Zeile. Zweite Zeile.');
 product.metafields.upswing.short_description={type:'rich_text_field',value:{children:[{children:[{value:'Erster Absatz.'}]},{children:[{value:'Zweiter Absatz.'}]}]}};
 doc=await render();assert.equal(doc.querySelector('.product-copy').textContent,'Erster Absatz. Zweiter Absatz.');
 product.images=[product.featured_image];doc=await render();assert.equal(doc.querySelector('[data-card-secondary-image]'),null);
});
