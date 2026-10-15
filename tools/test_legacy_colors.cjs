#!/usr/bin/env node
/* Portable, offline regression tests. Requires liquidjs and jsdom via normal
 * Node module resolution (or NODE_PATH). No Shopify/network credentials used.
 * Run: node tools/test_legacy_colors.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'assets/legacy-colors.js'), 'utf8');
const engine = new Liquid({root:path.join(root, 'snippets'), extname:'.liquid', strictFilters:true});
engine.registerFilter('image_url', value => typeof value === 'string' ? value : value.src);
engine.registerFilter('image_tag', (value, ...args) => `<img src="${value}" alt="" width="44" height="44">`);
engine.registerFilter('metafield_tag', value => `<p>${value.value}</p>`);
engine.registerFilter('money_with_currency', value => `CHF ${(Number(value || 0)/100).toFixed(2)}`);
engine.registerFilter('money', value => (Number(value || 0)/100).toFixed(2));
engine.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
engine.registerFilter('handleize', value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
const blue = {id:1001, handle:'kybun-aarau-blue-women', title:'Aarau blue', url:'/products/kybun-aarau-blue-women', featured_image:{src:'/blue.jpg'}, options_with_values:[], metafields:{upswing:{}, custom_fields:{}}};
const black = {id:1002, handle:'kybun-aarau-black-women', title:'Aarau black', url:'/products/kybun-aarau-black-women', featured_image:{src:'/black.jpg'}, available:false, options_with_values:[], metafields:{upswing:{}, custom_fields:{}}};
const legacy = {de_CH:[{type:'product', id:5457, name:'Aarau blue', handle:blue.handle}], fr:[{type:'product',id:5457,name:'Aarau blue',handle:''}], it:[{type:'product',id:5457,name:'Aarau blue',handle:''}], en:[{type:'product',id:5457,name:'Aarau blue',handle:'product-980'}]};
const clone = value => structuredClone(value);
let cases = 0;
const check = async (name, fn) => {await fn();cases += 1;console.log(`ok ${cases} - ${name}`);};
function product(field, modern, native) {
  const p = clone(black);
  p.metafields.custom_fields.custom_rel_farbe = field;
  if (modern) p.metafields.upswing.model_products = {value:modern};
  if (native) p.options_with_values = [{name:native}];
  return p;
}
const ctx = p => ({product:p, all_products:{[blue.handle]:blue,[black.handle]:black}, routes:{root_url:'/'}, request:{locale:{iso_code:'fr'}}});
const render = (name, p, extra={}) => {
  const globals = {...ctx(p),...extra};
  return engine.renderFile(name, globals, {globals});
};
function createDocument(mode, payload, options={}) {
  const storefrontRoot = options.root || '/fr/';
  const data = {payload, locale:options.locale || 'fr', root:storefrontRoot, current:{id:black.id,handle:black.handle,title:black.title,url:storefrontRoot+'products/'+black.handle,image:'/black.jpg',color:null,...options.current}};
  const script = `<script type="application/json" data-legacy-color-data data-legacy-mode="${mode}"${options.server ? ' data-legacy-server-resolved' : ''}>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  const inner = mode === 'pdp' ? `<section data-product-section><div class="model-colors" hidden><p class="option-label">Farbe: <strong>Aarau black</strong></p><div class="swatches swatches-large"></div>${script}</div></section>` : `<article class="product-card"><div class="product-card-content">${script}<div class="product-card-actions"><a href="/products/x">Modell entdecken</a></div></div></article>`;
  const dom = new JSDOM(inner, {url:'https://upswing.ch/fr/products/'+black.handle,runScripts:'outside-only',pretendToBeVisual:true});
  const calls = [], events = [];
  let active = 0, maxActive = 0;
  class IO {
    constructor(fn){this.fn=fn;this.targets=new Set();IO.instance=this;}
    observe(target){this.targets.add(target);}
    unobserve(target){this.targets.delete(target);}
    fire(){this.fn([...this.targets].map(target=>({target,isIntersecting:true})));}
  }
  dom.window.IntersectionObserver=IO;
  dom.window.document.addEventListener('upswing:colors-ready', event=>events.push(event.detail));
  dom.window.fetch=async (url, init)=>{
    calls.push({url,init}); active+=1;maxActive=Math.max(maxActive,active);
    await new Promise(resolve=>setTimeout(resolve,options.delay || 0));
    active-=1;
    const handle=decodeURIComponent(new URL(url).pathname.split('/').pop().replace(/\.js$/,''));
    const products=options.products || {[blue.handle]:{...blue,featured_image:'/blue.jpg'}};
    const found=products[handle];
    const image=typeof found?.featured_image==='string'?found.featured_image:found?.featured_image?.src;
    const responsePayload=found?{...found,image:found.image||image,color:found.color||null}:null;
    return {ok:!!found,text:async()=>`<div><script type="application/json" data-product-color-payload>${JSON.stringify(responsePayload).replace(/</g,'\\u003c')}</script></div>`};
  };
  dom.window.eval(js);
  return {dom,calls,events,IO,get maxActive(){return maxActive;}};
}
async function flush(test, predicate=()=>test.dom.window.document.querySelector('[data-legacy-color-data]').dataset.legacyState==='ready') {
  for(let i=0;i<150;i++){await new Promise(resolve=>setTimeout(resolve,5));if(predicate())return;}
  throw new Error('Timed out waiting for legacy color fixture');
}

(async()=>{
  await check('V2 primary colour names remain readable text in cards and PDP without exact swatch data',async()=>{
    const p=product({type:'json',value:legacy});
    p.vendor='kybun';p.type='Damenschuhe';p.price_min=p.price_max=33000;
    p.metafields.aico={pd_color_v2:{value:'Schwarz'},pd_colors_v2:{value:['Schwarz','Weiss']}};
    const sibling=clone(blue);sibling.metafields.aico={pd_color_v2:{value:'Blau'}};
    p.metafields.upswing.model_products={value:[sibling]};
    const swatch=new JSDOM(await render('product-color-swatch',p,{color_product:p,selected:true})).window.document.querySelector('.swatch');
    assert.equal(swatch.title,'Schwarz');assert.equal(swatch.style.getPropertyValue('--swatch-color'),'');assert.equal(swatch.querySelector('img'),null);
    assert(swatch.classList.contains('swatch--text'));
    const card=new JSDOM(await render('product-card',p)).window.document;
    assert.equal(card.querySelector('.product-card-meta .product-type').textContent,'Damenschuhe');
    assert.equal(card.querySelector('.product-copy'),null,'Product type must not appear twice');
    assert.deepEqual([...card.querySelectorAll('.swatch-label')].map(x=>x.textContent),['Schwarz','Blau']);
    assert.equal(card.querySelectorAll('.swatches img').length,0);
    assert.equal(card.querySelector('.swatches a').style.getPropertyValue('--swatch-color'),'');
    assert([...card.querySelectorAll('.swatch')].every(link=>link.classList.contains('swatch--text')));
    const payload=JSON.parse(await render('product-color-json',p));
    assert.equal(payload.title,'Schwarz');assert.equal(payload.color,null);
  });
  await check('V2 colour fallback priority, translated names and exact explicit colour remain consistent',async()=>{
    const p=clone(black);p.metafields.aico={pd_colors_v2:{value:['Beige','Schwarz']}};
    p.metafields['mm-google-shopping']={color:{value:'Blau'}};
    assert.equal((await render('product-color-label',p,{color_product:p})).trim(),'Blau');
    delete p.metafields['mm-google-shopping'];
    assert.equal((await render('product-color-label',p,{color_product:p})).trim(),'Beige');
    for(const name of ['Schwarz','black','NOIR','Nero']){
      p.metafields.aico.pd_color_v2={value:name};
      assert.equal((await render('product-color-value',p,{color_product:p})).trim(),'');
    }
    p.metafields.upswing.color_hex={value:'#123456'};
    assert.equal((await render('product-color-value',p,{color_product:p})).trim(),'#123456');
    assert.equal(JSON.parse(await render('product-color-json',p)).color,'#123456');
    delete p.metafields.upswing.color_hex;
    p.options_with_values=[{name:'Farbe',values:[{selected:true,swatch:{color:'#aabbcc'}}]}];
    assert.equal((await render('product-color-value',p,{color_product:p})).trim(),'#aabbcc');
  });
  await check('Unknown colour labels remain readable without a thumbnail or invented dot',async()=>{
    const p=clone(black);p.metafields.aico={pd_color_v2:{value:'Sonderfarbe <Muster>'}};
    const html=await render('product-color-swatch',p,{color_product:p});
    const dom=new JSDOM(html),link=dom.window.document.querySelector('a');
    assert.equal(link.textContent.trim(),'Sonderfarbe <Muster>');
    assert(link.classList.contains('swatch--text'));assert.equal(link.querySelector('img'),null);
    assert.equal(link.style.getPropertyValue('--swatch-color'),'');assert(!html.includes('<Muster>'));
  });
  await check('Hydrated siblings use rendered metafield colour data in the current language',async()=>{
    const t=createDocument('card',legacy,{current:{title:'Schwarz',color:'#343835'},products:{[blue.handle]:{...blue,title:'Blau',color:'#486782'}}});
    await new Promise(resolve=>setTimeout(resolve,15));t.IO.instance.fire();await flush(t);
    const links=[...t.dom.window.document.querySelectorAll('.swatches a')];
    assert.deepEqual(links.map(a=>a.textContent),['Schwarz','Blau']);
    assert.deepEqual(links.map(a=>a.style.getPropertyValue('--swatch-color')),['#343835','#486782']);
    assert.equal(t.dom.window.document.querySelectorAll('.swatches img').length,0);
    assert.equal(new URL(t.calls[0].url).searchParams.get('section_id'),'product-color-data');
    assert.equal(links[1].getAttribute('href'),'/fr/products/'+blue.handle);
    t.dom.window.close();
  });
  await check('typed json .value resolves de_CH once, ignoring stale/empty translations',async()=>{
    const p=product({type:'json',value:legacy});
    const html=await render('product-model-colors',p);
    const dom=new JSDOM(html);
    assert.deepEqual([...dom.window.document.querySelectorAll('.swatch')].map(a=>a.getAttribute('href')),[black.url,blue.url]);
    assert.equal(dom.window.document.querySelector('.model-colors').hidden,false);
    assert(dom.window.document.querySelector('[data-legacy-server-resolved]'));
    assert(!html.includes('href="/products/product-980"'));
  });
  await check('deprecated direct JSON object works without .value',async()=>{
    const html=await render('product-model-colors',product(legacy));
    assert.equal(new JSDOM(html).window.document.querySelectorAll('.swatch').length,2);
  });
  await check('fr/en/it prefer the valid de_CH reference even when an obsolete English alias exists',async()=>{
    const stale={id:9000,handle:'product-980',title:'Different imported product',url:'/products/product-980',metafields:{upswing:{}}};
    for(const locale of ['fr','en','it']){
      const html=await render('product-model-colors',product({type:'json',value:legacy}),{request:{locale:{iso_code:locale}},all_products:{[blue.handle]:blue,[black.handle]:black,'product-980':stale}});
      const links=[...new JSDOM(html).window.document.querySelectorAll('.swatch')];
      assert.deepEqual(links.map(a=>a.getAttribute('href')),[black.url,blue.url]);
    }
  });
  await check('modern product references override conflicting legacy data and preserve sold-out sibling',async()=>{
    const html=await render('product-model-colors',product({type:'json',value:legacy},[blue,black,blue]));
    const dom=new JSDOM(html);
    assert.equal(dom.window.document.querySelectorAll('.swatch').length,2);
    assert(!dom.window.document.querySelector('[data-legacy-color-data]'));
  });
  await check('native Farbe/Color/Colour suppresses separate product picker',async()=>{
    for(const name of ['Farbe',' COLOR ','Colour'])assert.equal((await render('product-model-colors',product({type:'json',value:legacy},[blue],name))).trim(),'');
  });
  await check('cards use native colours and native prices ahead of modern and legacy siblings',async()=>{
    const sibling={...clone(blue),price_min:25000,price_max:25000};
    const p=product({type:'json',value:legacy},[sibling],'Farbe');
    Object.assign(p,{price:33000,price_min:33000,price_max:33000,price_varies:false});
    p.options_with_values=[{name:'Farbe',values:['Schwarz','Blau']}];
    const html=await render('product-card',p);
    const dom=new JSDOM(html);
    assert.equal(dom.window.document.querySelectorAll('.swatch').length,2);
    assert([...dom.window.document.querySelectorAll('.swatch')].every(link=>link.getAttribute('href')===p.url));
    assert.equal(dom.window.document.querySelector('.product-price').textContent.trim(),'CHF 330.00');
    assert([...dom.window.document.querySelectorAll('.swatch')].every(link=>link.classList.contains('swatch--text')),'Known colour names alone cannot fabricate palette values');
    assert([...dom.window.document.querySelectorAll('.swatch')].every(link=>!link.hasAttribute('style')));
    assert(!dom.window.document.querySelector('[data-legacy-color-data]'));
  });
  await check('native card swatches keep explicit Shopify colours and swatch images',async()=>{
    const p=clone(black);
    const value=(name,swatch)=>({swatch,selected:true,variant:{url:p.url+'?variant=22',featured_image:{src:'/variant-preview.jpg'}},toString:()=>name});
    p.options_with_values=[{name:'Farbe',values:[value('Spezialton',{color:'#aabbcc'}),value('Gewebe',{image:{src:'/native-fabric.jpg'}}),value('Unbekannt',{})]}];
    const doc=new JSDOM(await render('product-card',p)).window.document;
    const links=[...doc.querySelectorAll('.swatch')];
    assert.equal(links[0].style.getPropertyValue('--swatch-color'),'#aabbcc');
    assert.equal(links[1].querySelector('img').getAttribute('src'),'/native-fabric.jpg');
    assert.equal(links[1].dataset.cardSwatch,'/variant-preview.jpg');
    assert.equal(links[1].classList.contains('swatch--text'),false);
    assert(links[2].classList.contains('swatch--text'));
    assert.equal(links[2].querySelector('img'),null);
    assert.equal(links[2].style.getPropertyValue('--swatch-color'),'');
  });
  await check('missing/injected handles are hidden and never become hrefs',async()=>{
    const bad={de_CH:[{type:'product',id:1,handle:'missing'},{type:'product',id:2,handle:'../../evil'},{type:'product',id:3,handle:'https://evil.test/products/x'}]};
    const html=await render('product-model-colors',product({type:'json',value:bad}));
    const dom=new JSDOM(html);
    assert.equal(dom.window.document.querySelector('.model-colors').hidden,true);
    assert(!dom.window.document.querySelector('[data-legacy-server-resolved]'));
    assert.equal(dom.window.document.querySelectorAll('.swatch').length,1);
  });
  await check('legacy payload script is inert even if a product name contains a script closer',async()=>{
    const p=product({type:'single_line_text_field',value:JSON.stringify({de_CH:[{type:'product',id:1,handle:blue.handle,name:'</script><img onerror="evil()">'}]})});
    const html=await render('legacy-color-data',p,{mode:'card'});
    const dom=new JSDOM(html);
    assert.equal(dom.window.document.querySelectorAll('script').length,1);
    assert.equal(dom.window.document.querySelectorAll('img').length,0);
    assert.equal(typeof JSON.parse(dom.window.document.querySelector('script').textContent).payload,'string');
  });
  await check('first paragraph remains complete, with inline tags and entities escaped once',async()=>{
    const p=clone(black);p.description='<h2>Heading</h2><p class="lead">'+('Vollständiger Satz. '.repeat(20))+'Passt <strong>für Büro &amp; Freizeit</strong>.</p><p>Zweiter Absatz.</p>';
    const dom=new JSDOM(await render('product-intro',p));
    assert(dom.window.document.querySelector('p').textContent.endsWith('Passt für Büro & Freizeit.'));
    assert(!dom.window.document.body.textContent.includes('Zweiter Absatz'));
    assert(!dom.window.document.querySelector('strong'));
  });
  await check('paragraph extraction ignores picture/pre tags, uppercase p and empty p',async()=>{
    const p=clone(black);p.description='<picture><img src="a"></picture><pre>Code</pre><p></p><P class="lead">Erster Absatz.</P><p>Zweiter.</p>';
    assert.equal(new JSDOM(await render('product-intro',p)).window.document.body.textContent.trim(),'Erster Absatz.');
  });
  await check('plain text first paragraph and explicit short description take precedence',async()=>{
    const p=clone(black);p.description='Der vollständige erste Absatz.\n\nZweiter Absatz.';
    assert.equal(new JSDOM(await render('product-intro',p)).window.document.body.textContent.trim(),'Der vollständige erste Absatz.');
    p.metafields.upswing.short_description={value:'Gepflegter Kurztext.'};
    assert.equal(new JSDOM(await render('product-intro',p)).window.document.body.textContent.trim(),'Gepflegter Kurztext.');
  });
  await check('opaque string hydrates PDP and emits one ready event for purchase controller',async()=>{
    const t=createDocument('pdp',JSON.stringify(legacy));
    await flush(t);
    const links=[...t.dom.window.document.querySelectorAll('.swatch')];
    assert.equal(links.length,2);assert.equal(links[0].getAttribute('aria-current'),'page');
    assert.equal(links[1].getAttribute('href'),'/fr/products/'+blue.handle);
    assert.equal(t.calls.length,1);assert.equal(t.events.length,1);
    assert.equal(t.calls[0].init.redirect,'error');
    assert.equal(t.dom.window.document.querySelector('.model-colors').hidden,false);
    assert(!t.calls.some(call=>call.url.includes('5457') || call.url.includes('product-980')));
    t.dom.window.upswingLegacyColors.bind();t.dom.window.eval(js);await flush(t);assert.equal(t.events.length,1);
    t.dom.window.close();
  });
  await check('server-rendered links cause no extra product requests',async()=>{
    const t=createDocument('pdp',legacy,{server:true});await flush(t);assert.equal(t.calls.length,0);t.dom.window.close();
  });
  await check('opaque French/English/Italian data keep the current language root and ignore stale aliases',async()=>{
    for(const locale of ['fr','en','it']){
      const t=createDocument('pdp',JSON.stringify(JSON.stringify(legacy)),{locale,root:'/'+locale+'/'});await flush(t);
      assert.equal(new URL(t.calls[0].url).searchParams.get('section_id'),'product-color-data');
      assert.equal(t.calls.length,1);assert.equal(new URL(t.calls[0].url).pathname,'/'+locale+'/products/'+blue.handle);
      assert.equal(t.dom.window.document.querySelectorAll('.swatch')[1].getAttribute('href'),'/'+locale+'/products/'+blue.handle);
      t.dom.window.close();
    }
  });
  await check('card requests are lazy, share cache and insert swatches before actions',async()=>{
    const t=createDocument('card',legacy);
    await new Promise(resolve=>setTimeout(resolve,15));assert.equal(t.calls.length,0);
    const cloneCard=t.dom.window.document.querySelector('.product-card').cloneNode(true);t.dom.window.document.body.append(cloneCard);
    await new Promise(resolve=>setTimeout(resolve,10));t.IO.instance.fire();
    await flush(t,()=>[...t.dom.window.document.querySelectorAll('script')].every(s=>s.dataset.legacyState==='ready'));
    assert.equal(t.calls.length,1);
    for(const card of t.dom.window.document.querySelectorAll('.product-card')){
      assert.equal(card.querySelectorAll('.swatch').length,2);
      assert.equal(card.querySelector('.swatches').nextElementSibling.className,'product-card-actions');
      assert.equal(card.querySelector('.swatch-count').textContent,'2 Farben');
    }
    t.dom.window.close();
  });
  await check('invalid JSON and invalid targets preserve hidden PDP without fabricated choices',async()=>{
    const t=createDocument('pdp','{broken');await flush(t);assert.equal(t.calls.length,0);assert.equal(t.dom.window.document.querySelector('.model-colors').hidden,true);t.dom.window.close();
    const wrong={de_CH:[{type:'product',id:77,handle:'looks-valid'}]};
    const x=createDocument('pdp',wrong,{products:{'looks-valid':{...blue,handle:'wrong-product'}}});await flush(x);assert.equal(x.events.length,0);assert.equal(x.dom.window.document.querySelectorAll('.swatch').length,0);x.dom.window.close();
  });
  await check('request pool caps concurrency at three and preserves explicit reference order',async()=>{
    const refs=Array.from({length:7},(_,i)=>({type:'product',id:10+i,handle:'color-'+i}));
    const products=Object.fromEntries(refs.map((entry,i)=>[entry.handle,{id:2000+i,handle:entry.handle,title:'Color '+i,featured_image:'/color-'+i+'.jpg',available:false}]));
    const t=createDocument('pdp',{de_CH:refs},{products,delay:15});await flush(t);
    assert.equal(t.maxActive,3);
    assert.deepEqual([...t.dom.window.document.querySelectorAll('.swatch')].map(a=>a.title),[black.title,...refs.map((_,i)=>'Color '+i)]);
    t.dom.window.close();
  });
  await check('unmounted product root is not updated when requests complete',async()=>{
    const t=createDocument('pdp',legacy,{delay:30});await new Promise(resolve=>setTimeout(resolve,10));t.dom.window.document.querySelector('section').remove();await new Promise(resolve=>setTimeout(resolve,50));assert.equal(t.events.length,0);t.dom.window.close();
  });
  console.log(`Passed ${cases} offline legacy-color/intro regressions.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
