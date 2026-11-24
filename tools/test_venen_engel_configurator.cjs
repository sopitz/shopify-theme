const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');
const {Liquid} = require('liquidjs');
const theme = path.resolve(__dirname, '..');
const source = readFileSync(path.join(theme, 'assets/venen-engel-configurator.js'), 'utf8');
const snippet = readFileSync(path.join(theme, 'snippets/venen-engel-configurator.liquid'), 'utf8');
const skus = ['204397','204399','204398','204395','644197002375links','644197002375rechts','202976','203321','202990','203318','203323Links','203323Rechts','644197002371_89296','644197002371_58645','202449','204401','204402','204403','202993','202992','201786',...['202420-','202419-','203276-','203275-'].flatMap(prefix=>['2','3','4','5','6'].map(size=>prefix+size))];
const catalogue = () => skus.map((sku,index)=>({sku,id:1001+index,price:10001+index,compare:12500+index,available:true,title:'Aktuelles Produkt '+sku,image:'/current/'+sku+'.jpg',url:'/fr/products/aktuell?variant='+(1001+index)}));
const initial = () => ({goal:'med',diag:null,area:'legs',cuff:'lfp',level:'8',arm:null,mmode:'cm',thigh:60,belly:100,size:null,skip:false,health:'no',cleared:false,xs:{kissen:false,str:'',color:'',ssize:'',b:null,c:null,g:null}});
const tick = () => new Promise(resolve=>setTimeout(resolve,0));
function fixture({products=catalogue(),complete=true,currency='CHF',locale='de-CH',redirect=false,roots=1}={}) {
  const markup=Array.from({length:roots},(_,i)=>`<section id="ve-test-${i}" data-venen-engel-configurator><script type="application/json" data-ve-data>${JSON.stringify({products,catalogue_complete:complete,settings:{root_url:'/fr/',cart_url:'/fr/cart',store_url:'/fr/pages/venen-engel-beratung-buchen',locale,currency,redirect}}).replaceAll('<','\\u003c')}</script><button data-ve-back></button><span data-ve-count></span><span data-ve-prog></span><div data-ve-cartmsg role="status" hidden></div><div data-ve-screen></div></section>`).join('');
  const dom=new JSDOM(markup,{url:'https://preview.example/fr/pages/venenengel',runScripts:'outside-only'});
  const {window}=dom;
  window.HTMLElement.prototype.scrollIntoView=()=>{};
  const requests=[];
  window.fetch=(url,init)=>new Promise((resolve,reject)=>requests.push({url,init,resolve,reject}));
  window.eval(source);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  const root=window.document.querySelector('[data-venen-engel-configurator]');
  return {dom,window,root,api:root.__ve,requests,click:selector=>{const button=root.querySelector(selector);assert.ok(button,selector);button.click();},set:state=>{root.__ve.S=state;root.__ve.go('result');},close:()=>dom.window.close()};
}
const plain = value=>JSON.parse(JSON.stringify(value));

test('the native collection binding serializes current variants, market currency, availability and safe JSON, with no captured IDs',async()=>{
  const engine=new Liquid({strictFilters:true});
  engine.registerFilter('json',JSON.stringify);
  engine.registerFilter('asset_url',name=>'/assets/'+name);
  engine.registerFilter('stylesheet_tag',url=>`<link href="${url}" rel="stylesheet">`);
  engine.registerFilter('image_url',image=>image.src);
  const render=async (product,selectedProduct,globalProduct)=>{
    const text=snippet.replace(/{%-?\s*paginate\s[^%]+%}/g,'').replace(/{%-?\s*endpaginate\s*-?%}/g,'');
    const html=await engine.parseAndRender(text,{section:{id:'native',settings:selectedProduct?{venen_engel_collection:{id:31,products:[selectedProduct]}}:{}},settings:globalProduct?{venen_engel_collection:{id:32,products:[globalProduct]}}:{},page:{id:20,handle:'venenengel'},collections:{'venen-engel-222':{id:30,products:[product]}},routes:{root_url:'/fr',cart_url:'/fr/cart'},cart:{currency:{iso_code:'EUR'}},shop:{currency:'CHF'},request:{locale:{iso_code:'fr'}},paginate:{pages:1}});
    const doc=new JSDOM(html).window.document;
    assert.equal(doc.querySelectorAll('script[data-ve-data]').length,1);
    assert.equal(doc.querySelectorAll('[data-injected]').length,0);
    return JSON.parse(doc.querySelector('script[data-ve-data]').textContent);
  };
  const product={id:50,title:'Actuel </script><div data-injected>',url:'/fr/products/actuel',featured_image:{src:'/new.jpg'},variants:[{id:1234,sku:'204395',title:'Default Title',price:81881,compare_at_price:102333,available:false}]};
  let data=await render(product);
  assert.equal(data.settings.currency,'EUR');assert.equal(data.settings.root_url,'/fr/');
  assert.equal(data.settings.store_url,'/fr/pages/venen-engel-beratung-buchen');
  assert.deepEqual(data.products[0],{sku:'204395',id:1234,price:81881,compare:102333,available:false,title:product.title,variant_title:'Default Title',url:'/fr/products/actuel?variant=1234',image:'/new.jpg'});
  product.variants[0]={...product.variants[0],id:5555,price:77777,available:true};
  data=await render(product);assert.equal(data.products[0].id,5555);assert.equal(data.products[0].price,77777);assert.equal(data.products[0].available,true);
  const selected={...product,variants:[{...product.variants[0],id:9191,price:45678}]};
  data=await render(product,selected);assert.equal(data.products[0].id,9191);assert.equal(data.products[0].price,45678,'merchant-selected collection overrides the migration fallback');
  data=await render(product,null,selected);assert.equal(data.products[0].id,9191,'the visible global theme picker is used on ordinary Page templates');
  assert.match(snippet,/collections\['venen-engel-222'\]/);
  assert.doesNotMatch(snippet,/60172512493952|58897387880832|"price":\s*\d{3,}/);
});

test('merchant collection picker takes precedence and incomplete catalogues cannot be ordered',async()=>{
  const f=fixture({complete:false});f.set(initial());
  assert.equal(f.root.querySelector('[data-act=cart]').disabled,true);
  assert.throws(()=>f.api.cartItems(),/Sortiment/);f.close();
  assert.match(snippet,/assign ve_collection = section\.settings\.venen_engel_collection/);
  assert.match(snippet,/paginate ve_collection\.products by 250/);
  assert.match(snippet,/paginate\.pages > 1/);
});

test('medical recommendation uses exact live SKU variants and integer cent totals',()=>{
  const products=catalogue();products.find(v=>v.sku==='204395').price=11111;products.find(v=>v.sku==='204395').compare=13901;
  const f=fixture({products});f.set(initial());
  const rows=f.api.compute().lines.map(f.api.resolve).filter(x=>!x.empty);
  assert.equal(rows[0].variant.id,products.find(v=>v.sku==='204395').id);
  assert.equal(f.api.cartItems()[0].id,rows[0].variant.id);
  assert.match(f.root.querySelector('.ve-total').textContent,/111\.11/);
  assert.match(f.root.querySelector('.ve-saving').textContent,/27\.90/);
  assert.match(f.root.querySelector('.ve-pill-sale').textContent,/20 %/);f.close();
});

test('discount badges floor percentages, never overpromise, and use the same current variant',()=>{
  const f=fixture();f.set(initial());
  // Current fixture main is 10004 / 12503: 19.9848%, not 20%.
  assert.match(f.root.querySelector('.ve-pill-sale').textContent,/19 %/);
  assert.match(f.root.querySelector('.ve-total').textContent,/100\.04/);f.close();
});

test('current market money is used for results and accessories rather than a fixed CHF catalogue',()=>{
  const f=fixture({currency:'EUR'});const state=initial();state.xs.kissen=true;f.set(state);
  assert.match(f.root.querySelector('.ve-total').textContent,/EUR/);
  assert.doesNotMatch(f.root.querySelector('.ve-result').textContent,/CHF/);f.close();
});

test('CHF uses Swiss money conventions even when Shopify supplies a bare German locale',()=>{
  const f=fixture({locale:'de'});f.set(initial());
  assert.match(f.root.querySelector('.ve-total').textContent,/CHF\s*100\.04/);
  assert.doesNotMatch(f.root.querySelector('.ve-total').textContent,/100,04/);f.close();
});

test('Premium pants fit rules keep standard, Flex, Classic, Comfort and unsupported sizes',()=>{
  const f=fixture();
  for(const [belly,thigh,expected] of [[122,74,'std'],[136,82,'a0'],[142,74,'c1'],[152,82,'b0'],[162,89,'cc'],[182,90,'bb']])assert.equal(f.api.fitSelect(belly,thigh)?.id,expected,`${belly}/${thigh}`);
  assert.equal(f.api.fitSelect(203,120),null);
  const state=initial();state.belly=130;state.thigh=80;f.set(state);
  assert.ok(f.api.compute().lines.some(line=>line[1]==='flex'));
  assert.ok(f.api.cartItems().some(item=>item.id===catalogue().find(v=>v.sku==='204401').id));f.close();
});

test('fractional fit dimensions are never rounded down into a smaller cuff capacity',()=>{
  const f=fixture();
  assert.equal(f.api.fitSelect(122,74).id,'std');
  assert.notEqual(f.api.fitSelect(122.4,74.4).id,'std');
  assert.notEqual(f.api.fitSelect(142,81.51).id,'c1');
  const state=initial();state.belly=122.1;state.thigh=74.1;f.set(state);
  assert.ok(f.api.compute().lines.some(line=>['flex','comfort','classic'].includes(line[1])));f.close();
});

test('Mini, Plus, Pro and medical leg cuffs use their own verified thigh capacity boundaries',()=>{
  for(const [goal,cuff,level,max,role] of [['beauty','bm',null,67,'extMini'],['beauty','lfp','plus',74,'extPlus'],['beauty','lfp','pro',78,null],['med','bm','8',70,'extBM'],['med','bm','6',70,'extBM']]){
    const f=fixture();const state=initial();Object.assign(state,{goal,cuff,level,thigh:max});f.set(state);
    if(cuff==='lfp'){assert.equal(f.root.querySelector('[data-act=cart]').disabled,true);f.click('[data-act=bare-device]');}
    assert.equal(f.root.querySelector('[data-act=cart]').disabled,false,`${goal}/${cuff}/${level} at ${max}`);
    state.thigh=max+0.1;state.skip=false;f.set(state);
    if(role){assert.ok(f.api.compute().lines.some(line=>line[1]===role),`${level} must not call ${max+0.1} standard fit`);}
    else assert.throws(()=>f.api.cartItems(),/Masse/,'unverified Pro extension must not be substituted with Plus');
    f.close();
  }
});

test('uncertain Mini and belly cuff bounds go to advice rather than inheriting a generic 122 cm promise',()=>{
  const f=fixture();const state=initial();Object.assign(state,{goal:'beauty',cuff:'bmbauch',level:null,belly:120,thigh:65});f.set(state);
  assert.equal(f.root.querySelector('[data-act=cart]').disabled,true);assert.throws(()=>f.api.cartItems(),/Masse/);
  assert.match(f.root.textContent,/genaue Masszuordnung nicht bestätigt/);f.close();
});

test('unsupported known fit cannot be bypassed by skipping, while unmeasured standard device remains an explicit choice',()=>{
  const f=fixture();const state=initial();state.belly=200;state.thigh=100;f.set(state);
  assert.throws(()=>f.api.cartItems(),/Masse/);assert.equal(f.root.querySelector('[data-act=cart]').disabled,true);
  state.skip=true;f.set(state);assert.throws(()=>f.api.cartItems(),/Passformprüfung/);
  const fresh=initial();fresh.skip=true;fresh.belly=null;fresh.thigh=null;f.set(fresh);assert.ok(f.api.cartItems().length);assert.match(f.root.textContent,/Ohne Passformprüfung/);f.close();
});

test('Plus and Pro cannot claim a complete measured fit from unverified abdomen limits',()=>{
  for(const level of ['plus','pro']){
    const f=fixture();const state=initial();Object.assign(state,{goal:'beauty',level,thigh:65,belly:110});f.set(state);
    assert.equal(f.root.querySelector('[data-act=cart]').disabled,true);assert.throws(()=>f.api.cartItems(),/ausdrückliche Auswahl ohne Passformprüfung/);
    assert.match(f.root.textContent,/Bauch-\/Hüftweite ist damit nicht bestätigt/);
    f.click('[data-act=bare-device]');assert.equal(f.api.S.skip,true);assert.ok(f.api.cartItems().length);
    assert.match(f.api.cartItems()[0].properties._Passform,/Ohne Passformprüfung/);assert.match(f.root.textContent,/Grundgerät ohne berechnete Erweiterungen/);f.close();
  }
});

test('out-of-range and nonfinite measurements cannot advance or produce a ready cart',()=>{
  const f=fixture();
  for(const invalid of [0,-1,29,241,NaN,Infinity]){
    const state=initial();state.thigh=invalid;f.api.S=state;f.api.go('measure');
    assert.equal(f.root.querySelector('[data-ve-mnext]').disabled,true,String(invalid));
    assert.throws(()=>f.api.cartItems(),/beantworte/);
  }f.close();
});

test('medical arms with legs automatically require the compatible 8-chamber system',()=>{
  const f=fixture();const state=initial();Object.assign(state,{area:'both',cuff:'bm',level:'6',arm:'both'});f.api.S=state;f.api.sanitize();
  assert.equal(f.api.S.level,'8');
  const lines=f.api.compute().lines.map(f.api.resolve);assert.equal(lines[0].key,'ve8bm');
  assert.deepEqual(plain(lines.filter(x=>x.key?.startsWith('armPrem')).map(x=>x.key)),['armPremL','armPremR']);
  assert.equal(f.api.cartItems().length,3);f.close();
});

test('Pro plus arms cannot use an adapter documented only for the 12 Premium',()=>{
  const f=fixture();const state=initial();Object.assign(state,{area:'both',level:'pro',arm:'both'});f.set(state);
  assert.throws(()=>f.api.cartItems(),/12 Premium/);
  assert.equal(f.root.querySelector('[data-act=cart]').disabled,true);
  assert.equal(f.api.compute().lines.some(line=>line[1]==='conn'),false);
  assert.match(f.root.textContent,/Kompatibilität prüfen/);f.close();
});

test('unmapped Beauty arm accessory never silently produces a partial order',()=>{
  const f=fixture();const state=initial();Object.assign(state,{goal:'beauty',area:'both',cuff:'bm',level:null,arm:'both'});f.set(state);
  assert.throws(()=>f.api.cartItems(),/nicht vollständig/);assert.equal(f.root.querySelector('[data-act=cart]').disabled,true);
  assert.match(f.root.textContent,/kein unvollständiges Paket/);f.close();
});

test('missing, sold-out and ambiguous duplicate SKUs block purchase, including required accessories',()=>{
  for(const mode of ['missing','soldout','duplicate','accessory']){
    const products=catalogue();const state=initial();
    if(mode==='missing')products.splice(products.findIndex(v=>v.sku==='204395'),1);
    if(mode==='soldout')products.find(v=>v.sku==='204395').available=false;
    if(mode==='duplicate')products.push({...products.find(v=>v.sku==='204395'),id:99999});
    if(mode==='accessory'){state.belly=130;state.thigh=80;products.find(v=>v.sku==='204401').available=false;}
    const f=fixture({products});f.set(state);assert.equal(f.root.querySelector('[data-act=cart]').disabled,true,mode);assert.throws(()=>f.api.cartItems(),/nicht vollständig/,mode);f.close();
  }
});

test('sold-out device choices are disabled early while available alternatives remain selectable',()=>{
  const products=catalogue();products.find(v=>v.sku==='204398').available=false;
  const f=fixture({products});f.api.S=initial();f.api.go('level');
  assert.equal(f.root.querySelector('[data-v="6"]').disabled,true);
  assert.equal(f.root.querySelector('[data-v="8"]').disabled,false);
  assert.match(f.root.querySelector('[data-v="6"]').textContent,/Online derzeit nicht verfügbar/);
  assert.equal(f.root.querySelector('a.ve-ghost').getAttribute('href'),'/fr/pages/venen-engel-beratung-buchen');
  f.click('[data-v="8"]');assert.equal(f.root.dataset.veAt,'measure');f.close();
});

test('free products are valid but zero savings and invalid compare-at values never create sale claims',()=>{
  for(const [price,compare] of [[0,0],[100,100],[100,99],[100,100.5],[100,NaN],[100,101]]){
    const products=catalogue();Object.assign(products.find(v=>v.sku==='204395'),{price,compare});
    const f=fixture({products});f.set(initial());assert.equal(f.root.querySelector('.ve-pill-sale'),null,`${price}/${compare}`);assert.ok(f.api.cartItems().length);f.close();
  }
});

test('stocking sizes use the original measurement ranges and currently available exact colour-size SKU',()=>{
  const products=catalogue();products.find(v=>v.sku==='202420-2').available=false;
  const f=fixture({products});const state=initial();Object.assign(state.xs,{str:'knie',color:'Classic Nude',ssize:'3',b:23,c:36});f.set(state);
  assert.deepEqual(plain(f.api.strSize()),{size:'3'});
  assert.equal(f.root.querySelector('[data-xsel=ssize] option[value="2"]'),null);
  assert.ok(f.api.cartItems().some(item=>item.id===products.find(v=>v.sku==='202420-3').id));
  f.api.S.xs.b=50;assert.deepEqual(plain(f.api.strSize()),{none:true});f.close();
});

test('entered stocking measurements cannot keep a previously selected incompatible or unavailable size',()=>{
  for(const mode of ['none','mismatch','incomplete','unavailable']){
    const products=catalogue();if(mode==='unavailable')products.find(v=>v.sku==='202420-2').available=false;
    const f=fixture({products});const state=initial();Object.assign(state.xs,{str:'knie',color:'Classic Nude',ssize:'3',b:23,c:36});
    if(mode==='none')state.xs.b=50;
    if(mode==='mismatch')state.xs.ssize='4';
    if(mode==='incomplete')state.xs.c=null;
    if(mode==='unavailable'){state.xs.b=21;state.xs.c=34;}
    f.set(state);assert.equal(f.root.querySelector('[data-act=cart]').disabled,true,mode);assert.throws(()=>f.api.cartItems(),/Strumpf|Strümpfe/,mode);
    f.click('[data-act=clear-stock-measures]');assert.equal(f.api.S.xs.b,null);assert.equal(f.api.S.xs.c,null);
    assert.ok(f.api.cartItems().length,'clearing dimensions keeps an explicit manual size choice');f.close();
  }
});

test('selecting optional stockings requires choosing a size or completing a fitting calculation',()=>{
  const f=fixture();f.set(initial());const select=f.root.querySelector('[data-xsel=str]');select.value='knie';select.dispatchEvent(new f.window.Event('change'));
  assert.equal(f.api.S.xs.ssize,'');assert.equal(f.root.querySelector('[data-act=cart]').disabled,true);
  assert.throws(()=>f.api.cartItems(),/Farbe und Grösse/);f.close();
});

test('the real questionnaire preserves back navigation and the health-stop before a recommendation',()=>{
  const f=fixture();f.click('[data-act=begin]');assert.equal(f.root.dataset.veAt,'goal');
  f.click('[data-v=unsure]');assert.equal(f.root.dataset.veAt,'unsure');f.click('[data-v=yes]');
  f.click('[data-v=arms]');assert.equal(f.root.dataset.veAt,'arm');f.click('[data-v=left]');
  assert.equal(f.root.dataset.veAt,'health');f.click('[data-v=yes]');assert.equal(f.root.dataset.veAt,'stop');
  assert.throws(()=>f.api.cartItems(),/Gesundheits/);f.click('[data-act=cleared]');assert.equal(f.root.dataset.veAt,'result');assert.ok(f.api.cartItems().length);
  assert.equal(f.root.querySelector('a.ve-ghost').getAttribute('href'),'/fr/pages/venen-engel-beratung-buchen');
  f.click('[data-ve-back]');assert.equal(f.root.dataset.veAt,'health');f.close();
});

test('cart submission makes one locale-aware batch with exact current IDs and prevents double clicks',async()=>{
  const products=catalogue();products.find(v=>v.sku==='204395').id=918273;
  const f=fixture({products});f.set(initial());let events=0;f.window.document.addEventListener('cart:refresh',()=>events++);
  f.click('[data-act=cart]');f.click('[data-act=cart]');
  assert.equal(f.requests.length,1);assert.equal(f.requests[0].url,'/fr/cart/add.js');
  assert.equal(f.requests[0].init.credentials,'same-origin');
  const payload=JSON.parse(f.requests[0].init.body);assert.equal(payload.items[0].id,918273);assert.equal(payload.items[0].quantity,1);
  assert.equal(payload.items[0].properties._Masse,'Bauch 100 cm, Oberschenkel 60 cm');
  f.requests[0].resolve({ok:true});await tick();assert.equal(events,1);assert.match(f.root.querySelector('[data-ve-cartmsg]').textContent,/Alles im Warenkorb/);assert.equal(f.root.querySelector('[data-ve-cartmsg] a').getAttribute('href'),'/fr/cart');f.close();
});

test('a rejected batch is never retried individually or reported as success',async()=>{
  const f=fixture();f.set(initial());f.click('[data-act=cart]');
  f.requests[0].resolve({ok:false,status:422,json:async()=>({description:'Nicht mehr vorrätig <script>'})});await tick();
  assert.equal(f.requests.length,1);assert.equal(f.root.querySelector('[data-act=cart]').disabled,true);
  assert.match(f.root.querySelector('[data-ve-cartmsg]').textContent,/Nicht mehr vorrätig <script>/);assert.equal(f.root.querySelector('[data-ve-cartmsg] script'),null);
  f.api.go('result');f.click('[data-act=cart]');assert.equal(f.requests.length,1);f.close();
});

test('an ambiguous network error keeps resubmission locked and gives a cart check link',async()=>{
  const f=fixture();f.set(initial());f.click('[data-act=cart]');f.requests[0].reject(new Error('connection lost'));await tick();
  assert.equal(f.requests.length,1);assert.match(f.root.querySelector('[data-ve-cartmsg]').textContent,/zuerst deinen Warenkorb/);
  assert.equal(f.root.querySelector('[data-ve-cartmsg] a').getAttribute('href'),'/fr/cart');f.close();
});

test('pending cart outcomes remain visible after changing questions or rerendering the recommendation',async()=>{
  const f=fixture();f.set(initial());f.click('[data-act=cart]');const notice=f.root.querySelector('[data-ve-cartmsg]');
  f.api.go('goal');assert.ok(notice.isConnected);assert.match(notice.textContent,/Bitte warte/);
  f.requests[0].reject(new Error('connection lost'));await tick();
  assert.match(notice.textContent,/zuerst deinen Warenkorb/);assert.ok(notice.querySelector('a'));
  f.api.go('result');assert.equal(f.root.querySelector('[data-ve-cartmsg]'),notice);assert.equal(notice.hidden,false);
  assert.match(f.root.querySelector('[data-act=cart]').textContent,/Bitte Warenkorb prüfen/);assert.match(f.root.querySelector('.ve-total').textContent,/CHF/);
  f.click('[data-act=cart]');assert.equal(f.requests.length,1);f.close();
});

test('mounting is idempotent, supports independent sections and emits no analytics or network calls',()=>{
  const f=fixture({roots:2});
  f.window.eval(source);f.window.upswingVenenEngel.mount(f.window.document);
  const roots=f.window.document.querySelectorAll('[data-venen-engel-configurator]');
  assert.ok(roots[0].__ve&&roots[1].__ve);f.click('[data-act=begin]');assert.equal(roots[0].dataset.veAt,'goal');assert.equal(roots[1].dataset.veAt,'start');
  assert.equal(f.requests.length,0);assert.equal(f.window.dataLayer,undefined);f.close();
});
