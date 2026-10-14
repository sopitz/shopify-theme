const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'assets/upswing.js'), 'utf8');
const themeSchema = JSON.parse(fs.readFileSync(path.join(root, 'config/settings_schema.json'), 'utf8'));
const themeSettings = JSON.parse(fs.readFileSync(path.join(root, 'config/settings_data.json'), 'utf8')).current;
const engine = new Liquid({root:path.join(root, 'snippets'), extname:'.liquid', strictFilters:true});
const tick = () => new Promise(resolve => setImmediate(resolve));
const variant = (id, options, delivery = null) => ({id,options,delivery,available:true,price:33000,price_formatted:'CHF 330.00',sku:'SKU-'+id,quantity_rule:{min:1,increment:1}});

test('merchant delivery rules preserve pickup-enabled stock and vendor lead times', async () => {
  const selected = {id:1,selected:true,available:true,store_availabilities:[{pick_up_enabled:true,available:true}]};
  const product = {vendor:'kybun',selected_or_first_available_variant:selected,first_available_variant:selected};
  const render = async (v=selected) => JSON.parse(await engine.renderFile('product-delivery',{product,variant:v,settings:themeSettings,output:'json'}));
  assert.deepEqual(await render(),{text:'Sofort verfügbar · Lieferzeit: 2–3 Werktage',status:'fast'});
  selected.store_availabilities = [{pick_up_enabled:false,available:true},{pick_up_enabled:true,available:false}];
  assert.deepEqual(await render(),{text:'Online verfügbar · Lieferzeit: 3–5 Werktage',status:'normal'});
  product.vendor=' Joya ';
  assert.match((await render()).text,/3–5 Werktage$/);
  for (const vendor of ['leguano','ELTEN','Venen Engel','venenengel','BellaBambi','bella bambi']) {
    product.vendor=vendor; assert.match((await render()).text,/ca\. 14 Werktage$/);
  }
  product.vendor='Other'; assert.match((await render()).text,/Lieferzeit auf Anfrage$/);
  selected.available=false; assert.deepEqual(await render(),{text:'Aktuell nicht lieferbar',status:'unavailable'});
});

test('unselected available sizes do not fabricate pickup stock from undefined store_availabilities', async () => {
  const first={id:1,available:true}, current={id:2,selected:true,available:true};
  const product={vendor:'kybun',selected_or_first_available_variant:current,first_available_variant:first};
  const render = async v => JSON.parse(await engine.renderFile('product-delivery',{product,variant:v,settings:themeSettings,output:'json'}));
  assert.equal(await render({id:3,available:true}),null);
  assert.match((await render(first)).text,/3–5/);
  assert.match((await render(current)).text,/3–5/);
  assert.equal((await render({id:4,available:false})).status,'unavailable');
});

test('editable delivery policy defaults are declared and saved consistently',()=>{
  const group=themeSchema.find(group=>group.name==='Lieferzeiten');
  assert.ok(group,'The merchant can change delivery policy in the theme editor');
  for(const key of ['delivery_stock_days','delivery_standard_days','delivery_standard_vendors','delivery_extended_days','delivery_extended_vendors']){
    const setting=group.settings.find(setting=>setting.id===key);
    assert.ok(setting);assert.equal(setting.type,'text');assert.equal(themeSettings[key],setting.default);
  }
});

test('changed policy values and exact vendor lists replace the original delivery estimates',async()=>{
  const selected={id:1,selected:true,available:true,store_availabilities:[]};
  const product={vendor:' Custom Supplier ',selected_or_first_available_variant:selected,first_available_variant:selected};
  const settings={delivery_stock_days:'1 Werktag',delivery_standard_days:'10–12 Werktage',delivery_standard_vendors:'Other Supplier, custom supplier',delivery_extended_days:'6 Wochen',delivery_extended_vendors:'Long Supplier'};
  const render=async()=>JSON.parse(await engine.renderFile('product-delivery',{product,variant:selected,settings,output:'json'}));
  assert.deepEqual(await render(),{text:'Online verfügbar · Lieferzeit: 10–12 Werktage',status:'normal'});
  product.vendor='LONG SUPPLIER';assert.match((await render()).text,/6 Wochen$/);
  product.vendor='Supplier';assert.match((await render()).text,/Lieferzeit auf Anfrage$/,'Vendor lists must use complete names rather than substring matches');
  product.vendor='kybun';assert.match((await render()).text,/Lieferzeit auf Anfrage$/,'Removed default vendors must not retain a code-level delivery policy');
  selected.store_availabilities=[{pick_up_enabled:true,available:true}];
  assert.deepEqual(await render(),{text:'Sofort verfügbar · Lieferzeit: 1 Werktag',status:'fast'});
});

test('variant delivery data takes priority over product data and vendor policy without overriding actual stock',async()=>{
  const selected={id:1,selected:true,available:true,store_availabilities:[],metafields:{upswing:{delivery_time:{value:' 7–9 Werktage '}}}};
  const product={vendor:'kybun',selected_or_first_available_variant:selected,first_available_variant:selected,metafields:{upswing:{delivery_time:{value:'2 Wochen'}}}};
  const render=async()=>JSON.parse(await engine.renderFile('product-delivery',{product,variant:selected,settings:themeSettings,output:'json'}));
  assert.match((await render()).text,/7–9 Werktage$/);
  selected.metafields.upswing.delivery_time.value='   ';assert.match((await render()).text,/2 Wochen$/,'Blank variant data falls back to the actual product field');
  product.metafields.upswing.delivery_time.value='';assert.match((await render()).text,/3–5 Werktage$/,'No individual data falls back to the editable merchant policy');
  selected.metafields.upswing.delivery_time.value='7–9 Werktage';
  selected.store_availabilities=[{pick_up_enabled:true,available:true}];
  assert.deepEqual(await render(),{text:'Sofort verfügbar · Lieferzeit: 2–3 Werktage',status:'fast'},'Actual own stock uses its configured policy before supplier estimates');
  selected.available=false;
  assert.deepEqual(await render(),{text:'Aktuell nicht lieferbar',status:'unavailable'},'Unavailable always wins over contradictory pickup stock or individual estimates');
});

test('empty policies never invent a duration and plain delivery fields stay escaped in HTML and JSON',async()=>{
  const selected={id:1,selected:true,available:true,store_availabilities:[]};
  const product={vendor:'kybun',selected_or_first_available_variant:selected,first_available_variant:selected};
  const settings={delivery_stock_days:'',delivery_standard_days:'',delivery_standard_vendors:'kybun',delivery_extended_days:'',delivery_extended_vendors:''};
  const render=async(output='json')=>engine.renderFile('product-delivery',{product,variant:selected,settings,output});
  assert.deepEqual(JSON.parse(await render()),{text:'Online verfügbar · Lieferzeit auf Anfrage',status:'normal'});
  selected.store_availabilities=[{pick_up_enabled:true,available:true}];
  assert.deepEqual(JSON.parse(await render()),{text:'Sofort verfügbar · Lieferzeit auf Anfrage',status:'fast'});
  selected.store_availabilities=[];
  selected.metafields={upswing:{delivery_time:{value:'3–5 Werktage </script><b>auf Anfrage</b>'}}};
  const json=await render();assert.equal(json.includes('</script>'),false,'Plain catalog fields cannot close an inline JSON script');
  assert.equal(JSON.parse(json).text,'Online verfügbar · Lieferzeit: 3–5 Werktage </script><b>auf Anfrage</b>');
  const html=await render('html');assert.ok(html.includes('&lt;/script&gt;'));assert.equal(html.includes('<b>'),false,'Catalog text is presented as text rather than HTML');
});

function fixture({initialDelivery={text:'Sofort verfügbar · Lieferzeit: 2–3 Werktage',status:'fast'},serverVariant='',serverStatus='fast',serverText='Sofort verfügbar · Lieferzeit: 2–3 Werktage'}={}) {
  const variants=[variant(11,['36'],initialDelivery),variant(12,['37']),variant(13,['38'])];
  const dom=new JSDOM(`<!doctype html><html class="no-js"><body><section data-product-section>
    <h1>Aarau</h1><p data-product-sku-row><span data-product-sku>SKU-11</span></p><strong data-product-price>CHF 330.00</strong>
    <form data-product-form data-product-id="100" data-product-url="/fr/products/aarau" data-high-variants="3">
      <script data-variants type="application/json">${JSON.stringify(variants)}</script>
      ${['36','37','38'].map((size,i)=>`<input type="radio" name="options[Grösse]" value="${size}" data-option-select data-option-position="1"${!i?' checked':''}>`).join('')}
      <input name="id" value="11"><input data-product-quantity name="quantity" type="number" value="2" min="1">
      <p data-product-availability data-delivery-status="${serverStatus}" data-delivery-variant="${serverVariant}">${serverText}</p>
      <button class="enhanced-add-button" type="submit"><span data-add-label>In den Warenkorb</span></button>
    </form></section></body></html>`,{url:'https://upswing.test/fr/products/aarau',runScripts:'outside-only'});
  const requests=[];
  let clock=1000;dom.window.Date.now=()=>clock;
  dom.window.fetch=(url,init)=>new Promise((resolve,reject)=>requests.push({url,init,resolve,reject}));
  dom.window.eval(script);
  const document=dom.window.document;
  return {dom,document,requests,
    advance(ms){clock+=ms;},
    change(size){const radio=document.querySelector(`input[value="${size}"][type="radio"]`);radio.checked=true;radio.dispatchEvent(new dom.window.Event('change',{bubbles:true}));},
    async resolve(index,id,text,status='normal',productId='100'){
      requests[index].resolve({ok:true,text:async()=>`<div data-product-delivery data-product-id="${productId}" data-variant-id="${id}"><p data-product-availability data-delivery-status="${status}">${text}</p></div>`});await tick();
    }
  };
}

test('size changes fetch true locale-specific delivery and synchronize status without losing quantity or SKU',async()=>{
  const f=fixture();try{
    assert.equal(f.requests.length,0,'Known selected size needs no duplicate request');
    f.change('37');
    assert.equal(f.document.querySelector('[name=id]').value,'12');
    assert.equal(f.document.querySelector('[data-product-sku]').textContent,'SKU-12');
    assert.equal(f.document.querySelector('[data-product-quantity]').value,'2');
    const url=new URL(f.requests[0].url);
    assert.equal(url.pathname,'/fr/products/aarau');assert.equal(url.searchParams.get('variant'),'12');assert.equal(url.searchParams.get('section_id'),'product-delivery');
    assert.equal(f.requests[0].init.redirect,'error');
    assert.equal(f.document.querySelector('[data-product-availability]').dataset.deliveryStatus,'pending');
    await f.resolve(0,12,'Online verfügbar · Lieferzeit: 3–5 Werktage');
    const label=f.document.querySelector('[data-product-availability]');assert.match(label.textContent,/3–5/);assert.equal(label.getAttribute('aria-busy'),'false');
    f.change('36');assert.match(label.textContent,/2–3/);f.change('37');assert.equal(f.requests.length,1,'Briefly revisiting a resolved size reuses the result');assert.match(label.textContent,/3–5/);
  }finally{f.dom.window.close();}
});

test('late delivery responses cannot overwrite the newer selected size',async()=>{
  const f=fixture();try{
    f.change('37');f.change('38');assert.equal(f.requests[0].init.signal.aborted,true);
    await f.resolve(1,13,'Sofort verfügbar · Lieferzeit: 2–3 Werktage','fast');
    await f.resolve(0,12,'Online verfügbar · Lieferzeit: 3–5 Werktage');
    const label=f.document.querySelector('[data-product-availability]');assert.match(label.textContent,/2–3/);assert.equal(label.dataset.deliveryVariant,'13');assert.equal(label.dataset.deliveryStatus,'fast');
  }finally{f.dom.window.close();}
});

test('initial JSON delivery expires and a fresher unavailable result takes precedence on revisit',async()=>{
  const f=fixture();try{
    assert.equal(f.requests.length,0);
    f.advance(59999);f.change('36');assert.equal(f.requests.length,0,'Known initial estimate stays fresh for less than a minute');
    f.advance(1);f.change('36');assert.equal(f.requests.length,1,'Initial JSON estimates expire at the same TTL as fetched estimates');
    assert.equal(new URL(f.requests[0].url).searchParams.get('variant'),'11');
    await f.resolve(0,11,'Aktuell nicht lieferbar','unavailable');
    f.change('37');await f.resolve(1,12,'Online verfügbar · Lieferzeit: 3–5 Werktage');
    f.change('36');
    const label=f.document.querySelector('[data-product-availability]');
    assert.equal(label.textContent,'Aktuell nicht lieferbar');assert.equal(label.dataset.deliveryStatus,'unavailable');
    assert.equal(f.requests.length,2);assert.equal(f.document.querySelector('.enhanced-add-button').disabled,true,'Old JSON must never override the fresh unavailable cache');
  }finally{f.dom.window.close();}
});

test('a matching server-rendered selected-variant paragraph seeds the cache without redundant fetching',async()=>{
  const f=fixture({initialDelivery:null,serverVariant:'11',serverStatus:'normal',serverText:'Online verfügbar · Lieferzeit: 3–5 Werktage'});try{
    assert.equal(f.requests.length,0);assert.match(f.document.querySelector('[data-product-availability]').textContent,/3–5 Werktage/);
    f.advance(60000);f.change('36');assert.equal(f.requests.length,1,'Server-rendered estimates expire normally too');
    await f.resolve(0,11,'Sofort verfügbar · Lieferzeit: 2–3 Werktage','fast');
    assert.match(f.document.querySelector('[data-product-availability]').textContent,/2–3 Werktage/);
  }finally{f.dom.window.close();}
});

test('server paragraph only seeds the exact selected ID and accepted delivery statuses',async()=>{
  for (const settings of [{serverVariant:'12',serverStatus:'fast'},{serverVariant:'11',serverStatus:'pending'},{serverVariant:'11',serverStatus:'normal',serverText:'   '}]) {
    const f=fixture({initialDelivery:null,...settings});try{
      assert.equal(f.requests.length,1,'A mismatched, loading or blank paragraph cannot suppress the actual selected-variant check');
      assert.equal(f.document.querySelector('[data-product-availability]').dataset.deliveryStatus,'pending');
      await f.resolve(0,11,'Online verfügbar · Lieferzeit: 3–5 Werktage');
    }finally{f.dom.window.close();}
  }
  const current=fixture({serverVariant:'11',serverStatus:'normal',serverText:'Online verfügbar · Lieferzeit: 3–5 Werktage'});try{
    assert.equal(current.requests.length,0);assert.match(current.document.querySelector('[data-product-availability]').textContent,/3–5 Werktage/,'Selected server paragraph wins over its older JSON representation');
  }finally{current.dom.window.close();}
});

test('pending colour changes keep purchase disabled and loading-labelled through size and delivery updates',async()=>{
  const f=fixture();try{
    f.document.querySelector('[data-product-section]').dataset.colorPending='true';f.change('37');
    const add=f.document.querySelector('.enhanced-add-button');
    assert.equal(add.disabled,true);assert.equal(add.textContent,'Auswahl wird geladen …');assert.equal(add.getAttribute('aria-busy'),'true');
    await f.resolve(0,12,'Aktuell nicht lieferbar','unavailable');
    assert.equal(add.disabled,true);assert.equal(add.textContent,'Auswahl wird geladen …','A late unavailable result preserves the colour-loading label');
    f.change('36');assert.equal(add.disabled,true);assert.equal(add.textContent,'Auswahl wird geladen …','Even switching to a known available size cannot purchase the old colour');
  }finally{f.dom.window.close();}
});

test('a fresh selected-size response disables purchase if stock ran out since the page loaded',async()=>{
  const f=fixture();try{
    f.change('37');await f.resolve(0,12,'Aktuell nicht lieferbar','unavailable');
    const add=f.document.querySelector('.enhanced-add-button');assert.equal(add.disabled,true);assert.equal(add.textContent,'Zurzeit nicht verfügbar');
    f.change('36');assert.equal(add.disabled,false);assert.equal(add.textContent,'In den Warenkorb');
    f.change('37');assert.equal(f.requests.length,1);assert.equal(add.disabled,true,'Cached unavailable delivery must also prevent purchase');
  }finally{f.dom.window.close();}
});

test('mismatched product response or network failure keeps availability honest',async()=>{
  const f=fixture();try{
    f.change('37');await f.resolve(0,12,'Sofort verfügbar · Lieferzeit: 2–3 Werktage','fast','other-product');
    const label=f.document.querySelector('[data-product-availability]');assert.equal(label.dataset.deliveryStatus,'unknown');assert.match(label.textContent,/konnte nicht ermittelt/);assert(!label.textContent.includes('2–3'));
    f.change('38');f.requests[1].reject(new Error('offline'));await tick();assert.match(label.textContent,/konnte nicht ermittelt/);
  }finally{f.dom.window.close();}
});

test('replaced product sections never receive late delivery results',async()=>{
  const f=fixture();try{
    f.change('37');const label=f.document.querySelector('[data-product-availability]');f.document.querySelector('section').remove();
    await f.resolve(0,12,'Sofort verfügbar · Lieferzeit: 2–3 Werktage','fast');assert.equal(label.dataset.deliveryStatus,'pending');
  }finally{f.dom.window.close();}
});
