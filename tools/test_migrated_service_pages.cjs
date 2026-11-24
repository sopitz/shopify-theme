const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const {Liquid}=require('liquidjs');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const nativeFs = new Liquid().options.fs;
const formFixture=source=>source.replace(/{%[-]?\s*form\s+'contact'[^%]*%}/g,'<form data-shopify-form="contact">').replace(/{%[-]?\s*endform\s*[-]?%}/g,'</form>');
const fixtureFs={...nativeFs,readFile:async file=>formFixture(await nativeFs.readFile(file)),readFileSync:file=>formFixture(nativeFs.readFileSync(file))};
const engine=new Liquid({root:path.join(root,'snippets'),extname:'.liquid',strictFilters:true,fs:fixtureFs});
engine.registerFilter('asset_url',name=>'/assets/'+name);
engine.registerFilter('file_img_url',name=>'https://upswing.ch/cdn/shop/files/'+name);
engine.registerFilter('image_url',image=>image?.src||'');
engine.registerFilter('image_tag',url=>`<img src="${url}">`);
engine.registerFilter('default_errors',errors=>'Vorhandene Formularfehler');
const context=handle=>({page:{handle,title:handle==='contact'?'Kontakt':handle,content:''},section:{id:'ServiceQA',settings:{},blocks:[]},settings:{contact_phone:'+41 33 221 98 88',contact_email:'thun@upswing.ch'},shop:{privacy_policy:{url:'/policies/privacy-policy'}},routes:{root_url:'/',all_products_collection_url:'/collections/all'},collections:{}});
async function render(handle,extra={}){return new JSDOM(await engine.renderFile('migrated-service-pages',{...context(handle),...extra}));}
const nativeText=value=>value.replace(/\s+/g,' ').trim();
const requirements={
 'venen-engel-beratung-buchen':['Venen Engel','Dauer 30 Minuten','kostenlos','Beinmanschetten'],
 'bellicon-beratung-buchen':['Teste bellicon und spüre den Unterschied','Dauer 30 Minuten','Seilstärke','kostenlos'],
 'blackroll-base-beratung-buchen':['BLACKROLL Schlafberatung','acht verschiedene Liegekonfigurationen','Dauer 20 Minuten','kostenlos'],
 'bellicon-training-ruti-zh':['bellicon Training in Rüti ZH','Gruppen-Fitnesstraining','Nanette Ambiel','078 659 69 40','beschränkte Teilnehmerzahl','Räumlichkeiten'],
 'sypoba-training-in-thun':['up.power','QualiCert','Mittwoch, 19.00–20.15 Uhr','75 Minuten','Grundbacher-Turnhalle','Burgstrasse 4','CHF 499.– statt CHF 650.90','CHF 59.–','CHF 210.–','CHF 290.–','CHF 650.–','CHF 920.–','Gratis Schnuppertraining buchen'],
 'medical-partner-werden':['Medical Partner werden','Handelsregistereintrag','Nachweis','Wer kann Partner werden?','Rabatte sind nicht kombinier- oder kumulierbar.','Logindaten','033 221 98 88'],
 'versandinformationen':['Versandinformationen','Schweiz','Lichtenstein','CHF 8.-','CHF 99.-','CHF 20.-','CHF 5.-'],
 'b2b':['Unser B2B Sortiment','Fachgeschäft','Weitervermarktung','Attraktive B2B-Konditionen','Kooperation','Kontaktiere uns'],
 'contact':['Kontakt','Nachricht','Persönlich in deiner Nähe.'],
};

test('each migrated service route preserves its actual purpose, key source facts and a single page title',async()=>{
 for(const [handle,phrases]of Object.entries(requirements)){
  const dom=await render(handle);
  try{
   const doc=dom.window.document;
   assert.ok(doc.querySelector('.migrated-page'),handle);
   assert.equal(doc.querySelectorAll('h1').length,1,handle);
   for(const phrase of phrases)assert.ok(nativeText(doc.body.textContent).includes(phrase),`${handle}: ${phrase}`);
   assert.equal(doc.querySelector('rte-formatter'),null);
   assert.equal(doc.querySelector('script[src*="horizon"],link[rel="stylesheet"]'),null);
  }finally{dom.window.close()}
 }
});

test('the three existing booking routes keep their own five provider calendars and both editorial images',async()=>{
 const topics={
  'venen-engel-beratung-buchen':['ThunVenenEngelBuchung1','VenenEngelZrich','upswingWinterthurVenenEngelBuchung','RtiVenenEngelBuchung','BaselVenenEngelBeratung'],
  'bellicon-beratung-buchen':['ThunbelliconTrampolinBeratung1','ZrichbelliconTrampolinBeratung','WinterthurbelliconTrampolinBeratung','RtibelliconTrampolinBeratung1','BaselbelliconTrampolinBeratung1'],
  'blackroll-base-beratung-buchen':['ThunBLACKROLLSchlafberatung','ZrichBLACKROLLSchlafberatung','WinterthurBLACKROLLSchlafberatung','RtiZHBLACKROLLSchlafberatung','BaselBLACKROLLSchlafberatung'],
 };
 for(const [handle,calendars]of Object.entries(topics)){
  const dom=await render(handle);
  try{
   const doc=dom.window.document;
   const links=[...doc.querySelectorAll('a[href*="outlook.office"]')];
   assert.equal(links.length,5);
   assert.deepEqual(links.map(a=>a.textContent.trim().split(' – ')[0].trim()),['Thun','Zürich','Winterthur','Rüti ZH','Basel']);
   for(const [i,link]of links.entries()){
    assert.ok(decodeURIComponent(link.href).includes(calendars[i]+'@upswing.ch'));
    assert.equal(link.target,'_blank');
    assert.equal(link.rel,'noopener noreferrer');
   }
   assert.equal(doc.querySelectorAll('img').length,2);
   assert.equal(doc.querySelector('form'),null);
  }finally{dom.window.close()}
 }
});

test('training and registration keep their existing Shopify Forms IDs instead of invented contact fields',async()=>{
 for(const [handle,id]of [['sypoba-training-in-thun','1131525'],['medical-partner-werden','1129036']]){
  const dom=await render(handle);
  try{
   const doc=dom.window.document;
   const roots=doc.querySelectorAll('[data-form-root][data-forms-id]');
   assert.equal(roots.length,1);
   assert.equal(roots[0].dataset.formsId,'forms-root-'+id);
   assert.equal(roots[0].querySelector('form,input,textarea,button'),null);
   assert.equal(doc.querySelector('form'),null);
   assert.equal(doc.querySelectorAll('script').length,1);
   assert.match(doc.querySelector('script').textContent,/01a20936-5558-7b97-9ae7-6c0834a419d6\/forms-2795\/assets\/shopify-forms-loader\.js/);
  }finally{dom.window.close()}
 }
 const training=await render('bellicon-training-ruti-zh');
 try{
  assert.equal(training.window.document.querySelector('[data-forms-id]'),null);
  assert.equal(training.window.document.querySelector('a[href="tel:+41786596940"]').textContent,'078 659 69 40');
 }finally{training.window.close()}
});

test('the observed Forms bootstrap reuses an installed app loader and loads at most one fallback',async()=>{
 const markup=await engine.renderFile('migrated-service-shopify-form',{form_id:'1131525',section_id:'LoaderQA',title:'Schnuppertraining'});
 for(const installed of [false,true]){
  const dom=new JSDOM(markup,{runScripts:'outside-only'});
  try{
   const {window}=dom;
   window.ShopifyForms={existingSetting:'preserve'};
   if(installed){const script=window.document.createElement('script');script.src='https://cdn.shopify.com/extensions/current/forms-9999/assets/shopify-forms-loader.js';window.document.head.appendChild(script)}
   const script=window.document.querySelector('script:not([src])').textContent;
   window.eval(script);window.eval(script);
   const loaders=[...window.document.querySelectorAll('script[src]')];
   assert.equal(loaders.length,1);
   assert.equal(window.ShopifyForms.existingSetting,'preserve');
   assert.equal(window.ShopifyForms.currentPageType,'page');
   assert.ok(loaders[0].src.includes(installed?'forms-9999':'forms-2795'));
  }finally{dom.window.close()}
 }
 assert.equal((await engine.renderFile('migrated-service-shopify-form',{form_id:'999',section_id:'Bad'})).trim(),'');
});

test('B2B supplier cards resolve the four actual collection resources and have no copied catalog fallback',async()=>{
 const handles=['upswing','anders','venen-engel-222','pepup'];
 const collections=Object.fromEntries(handles.map((h,i)=>[h,{id:i+1,url:'/collections/renamed-'+h}]));
 const dom=await render('b2b',{collections});
 try{
  const doc=dom.window.document;
  const cards=[...doc.querySelectorAll('.migration-card')];
  assert.deepEqual(cards.map(c=>c.querySelector('h2').textContent),['upswing','anderS.','Venen Engel','PepUp']);
  assert.deepEqual(cards.map(c=>c.getAttribute('href')),handles.map(h=>'/collections/renamed-'+h));
  assert.equal(doc.querySelectorAll('form').length,1);
  const fields=[...doc.querySelectorAll('form input,form textarea')].map(f=>f.name);
  assert.ok(fields.includes('contact[email]')&&fields.includes('contact[body]'));
  assert.ok(!fields.includes('contact[Teamgrösse]'));
  assert.doesNotMatch(doc.body.textContent,/Mehr Wohlbefinden für deine Mitarbeitenden/);
 }finally{dom.window.close()}
 const missing=await render('b2b');
 try{assert.equal(missing.window.document.querySelector('.migration-card'),null)}finally{missing.window.close()}
});

test('contact migration reuses the actual native contact page without duplicate forms or unrelated legacy headings',async()=>{
 const dom=await render('contact',{section:{id:'ContactQA',settings:{heading:'B2B Altüberschrift',description:'Alte Einleitung'},blocks:[]}});
 try{
  const doc=dom.window.document;
  assert.equal(doc.querySelectorAll('form').length,1);
  assert.equal(doc.querySelector('h1').textContent,'Kontakt');
  assert.doesNotMatch(doc.body.textContent,/B2B Altüberschrift|Alte Einleitung/);
  assert.equal(doc.querySelectorAll('[data-location-carousel]').length,1);
 }finally{dom.window.close()}
 const source=fs.readFileSync(path.join(root,'snippets/native-contact-page.liquid'),'utf8');
 assert.match(source,/{% form 'contact', id: contact_form_id/);
});

test('unknown routes do not receive unrelated migrated content',async()=>{
 for(const h of ['unbekannt','kybun','standort-thun','sypoba-training']){
  const dom=await render(h);try{assert.equal(dom.window.document.body.innerHTML.trim(),'')}finally{dom.window.close()}
 }
});

test('existing job and history designs retain their current real outgoing source links',async()=>{
 for(const [handle,url]of [['offene-stellen','https://www.upswing.ch/_files/2606_Stellenausschreibung_Verkauf_Winterthur.pdf'],['geschichte','https://www.anders.swiss/']]){
  const dom=new JSDOM(await engine.renderFile('about-page-example',{page:{handle},routes:{root_url:'/'}}));
  try{assert.ok(dom.window.document.querySelector(`a[href="${url}"]`),handle)}finally{dom.window.close()}
 }
});


test('curated editorial designs preserve both unique values graphics, the original service badge and seven unique history photos',async()=>{
 const expected={
  'upswing-werte':['about-values-1.jpg','about-values-2.jpg'],
  'premium-service':['about-premium-1.jpg','about-premium-2.png','about-thun-1.jpg','about-ruti-1.jpg','about-zurich-1.jpg','about-winterthur-1.jpg','about-basel-1.jpg'],
  'geschichte':Array.from({length:7},(_,i)=>`about-history-${i+1}.jpg`),
 };
 for(const [handle,images]of Object.entries(expected)){
  const dom=new JSDOM(await engine.renderFile('about-page-example',{page:{handle},routes:{root_url:'/'}}));
  try{
   const doc=dom.window.document;
   assert.deepEqual([...doc.querySelectorAll('img')].map(i=>i.getAttribute('src').split('/').pop()),images);
   assert.equal(new Set([...doc.querySelectorAll('img')].map(i=>i.getAttribute('src'))).size,images.length);
   if(handle==='geschichte'){
    const final=doc.querySelector('.history-gallery figure:last-child');
    assert.equal(final.querySelector('figcaption').textContent,'Einblick in ein upswing Fachgeschäft');
    assert.equal(final.querySelector('img').alt,'Einblick in ein upswing Fachgeschäft');
    assert.ok(doc.body.textContent.includes('Januar 2022'));
    assert.ok(doc.body.textContent.includes('Übernahme des kybun Joya Shop Basel'));
   }
  }finally{dom.window.close()}
 }
});
