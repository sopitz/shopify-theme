const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'assets/upswing.js'), 'utf8');
const engine = new Liquid({root:path.join(root, 'snippets'), extname:'.liquid', strictFilters:true});
const tick = () => new Promise(resolve => setImmediate(resolve));
const variant = (id, options, delivery = null) => ({id,options,delivery,available:true,price:33000,price_formatted:'CHF 330.00',sku:'SKU-'+id,quantity_rule:{min:1,increment:1}});

test('pickup availability and vendor never invent delivery times or stock wording', async () => {
  const selected = {id:1,selected:true,available:true,inventory_policy:'continue',store_availabilities:[{pick_up_enabled:true,available:true}]};
  const product = {vendor:'Elten',selected_or_first_available_variant:selected,first_available_variant:selected};
  const render = async (v=selected) => JSON.parse(await engine.renderFile('product-delivery',{product,variant:v,output:'json'}));
  assert.deepEqual(await render(),{text:'Lieferzeit auf Anfrage',status:'normal'},'Pickup reported for oversellable variants is not branch stock');
  selected.store_availabilities = [{pick_up_enabled:false,available:true},{pick_up_enabled:true,available:false}];
  for (const vendor of [' Joya ','kybun','leguano','ELTEN','Venen Engel','BellaBambi','Unbekannter Hersteller']) {
    product.vendor=vendor;
    assert.deepEqual(await render(),{text:'Lieferzeit auf Anfrage',status:'normal'});
  }
  selected.available=false; assert.deepEqual(await render(),{text:'Aktuell nicht lieferbar',status:'unavailable'});
  for (const text of ['Sofort verfügbar','Online verfügbar']) assert(!(await engine.renderFile('product-delivery',{product,variant:{...selected,available:true},output:'html'})).includes(text));
});

test('every variant renders its own delivery field, selected or not', async () => {
  const field=value=>({upswing:{delivery_time:{value}}});
  const first={id:1,available:true,metafields:field('2–3 Werktage')}, current={id:2,selected:true,available:true,metafields:field('3–5 Werktage')};
  const product={vendor:'kybun',selected_or_first_available_variant:current,first_available_variant:first};
  const render = async v => JSON.parse(await engine.renderFile('product-delivery',{product,variant:v,output:'json'}));
  assert.deepEqual(await render({id:3,available:true,metafields:field('ca. 14 Werktage')}),{text:'Lieferzeit: ca. 14 Werktage',status:'normal'});
  assert.deepEqual(await render({id:5,available:true}),{text:'Lieferzeit auf Anfrage',status:'normal'});
  assert.deepEqual(await render(first),{text:'Lieferzeit: 2–3 Werktage',status:'fast'});
  assert.deepEqual(await render(current),{text:'Lieferzeit: 3–5 Werktage',status:'normal'});
  assert.equal((await render({id:4,available:false,metafields:field('2–3 Werktage')})).status,'unavailable');
});

test('stale saved theme policies cannot supply delivery facts',async()=>{
  const selected={id:1,selected:true,available:true,store_availabilities:[]};
  const product={vendor:' Custom Supplier ',selected_or_first_available_variant:selected,first_available_variant:selected};
  const settings={delivery_stock_days:'1 Werktag',delivery_standard_days:'10–12 Werktage',delivery_standard_vendors:'Other Supplier, custom supplier',delivery_extended_days:'6 Wochen',delivery_extended_vendors:'Long Supplier'};
  const render=async()=>JSON.parse(await engine.renderFile('product-delivery',{product,variant:selected,settings,output:'json'}));
  assert.deepEqual(await render(),{text:'Lieferzeit auf Anfrage',status:'normal'});
  product.vendor='LONG SUPPLIER';assert.deepEqual(await render(),{text:'Lieferzeit auf Anfrage',status:'normal'});
  selected.store_availabilities=[{pick_up_enabled:true,available:true}];
  assert.deepEqual(await render(),{text:'Lieferzeit auf Anfrage',status:'normal'});
});

test('variant then product delivery field decides text and status',async()=>{
  const selected={id:1,selected:true,available:true,store_availabilities:[{pick_up_enabled:true,available:true}],metafields:{upswing:{delivery_time:{value:' 7–9 Werktage '}}}};
  const product={vendor:'kybun',selected_or_first_available_variant:selected,first_available_variant:selected,metafields:{upswing:{delivery_time:{value:'2 Wochen'}}}};
  const render=async()=>JSON.parse(await engine.renderFile('product-delivery',{product,variant:selected,output:'json'}));
  assert.deepEqual(await render(),{text:'Lieferzeit: 7–9 Werktage',status:'normal'},'Pickup availability does not make an estimate fast');
  selected.metafields.upswing.delivery_time.value='   ';assert.deepEqual(await render(),{text:'Lieferzeit: 2 Wochen',status:'normal'},'Blank variant data falls back to the actual product field');
  product.metafields.upswing.delivery_time.value='';assert.deepEqual(await render(),{text:'Lieferzeit auf Anfrage',status:'normal'});
  selected.metafields.upswing.delivery_time.value='2–3 Werktage';assert.deepEqual(await render(),{text:'Lieferzeit: 2–3 Werktage',status:'fast'});
  selected.metafields.upswing.delivery_time.value='ca. 14 Werktage';assert.deepEqual(await render(),{text:'Lieferzeit: ca. 14 Werktage',status:'normal'});
  selected.metafields.upswing.delivery_time.value='Liefertermin auf Anfrage';assert.deepEqual(await render(),{text:'Liefertermin auf Anfrage',status:'normal'},'Self-describing values are shown without a second label');
  selected.metafields.upswing.delivery_time.value='2–3 Werktage';selected.available=false;
  assert.deepEqual(await render(),{text:'Aktuell nicht lieferbar',status:'unavailable'},'Unavailable always wins over an individual estimate');
});

test('missing catalog times stay on request and plain delivery fields stay escaped in HTML and JSON',async()=>{
  const selected={id:1,selected:true,available:true,store_availabilities:[]};
  const product={vendor:'kybun',selected_or_first_available_variant:selected,first_available_variant:selected};
  const render=async(output='json')=>engine.renderFile('product-delivery',{product,variant:selected,output});
  assert.deepEqual(JSON.parse(await render()),{text:'Lieferzeit auf Anfrage',status:'normal'});
  selected.metafields={upswing:{delivery_time:{value:'3–5 Werktage </script><b>auf Anfrage</b>'}}};
  const json=await render();assert.equal(json.includes('</script>'),false,'Plain catalog fields cannot close an inline JSON script');
  assert.equal(JSON.parse(json).text,'Lieferzeit: 3–5 Werktage </script><b>auf Anfrage</b>');
  const html=await render('html');assert.ok(html.includes('&lt;/script&gt;'));assert.equal(html.includes('<b>'),false,'Catalog text is presented as text rather than HTML');
});

async function commerceDocument(sectionName,{shop={},cart={},product={}}={}) {
  const sectionEngine=new Liquid({root:path.join(root,'snippets'),extname:'.liquid',strictFilters:true});
  sectionEngine.registerFilter('image_url',image=>image?.src);
  sectionEngine.registerFilter('image_tag',(src,...args)=>`<img src="${src}" ${args.filter(Array.isArray).map(([key,value])=>`${key}="${value}"`).join(' ')}>`);
  sectionEngine.registerFilter('money_with_currency',value=>`CHF ${(Number(value||0)/100).toFixed(2)}`);
  sectionEngine.registerFilter('money',value=>(Number(value||0)/100).toFixed(2));
  sectionEngine.registerFilter('default_errors',()=> '');
  sectionEngine.registerFilter('structured_data',()=> '{}');
  sectionEngine.registerFilter('placeholder_svg_tag',()=> '<svg></svg>');
  sectionEngine.registerFilter('metafield_tag',field=>field?.value||'');
  sectionEngine.registerFilter('handleize',value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));
  for(const name of ['video_tag','external_video_tag','model_viewer_tag','payment_type_svg_tag'])sectionEngine.registerFilter(name,()=> '');
  const selected={id:7,selected:true,available:true,options:['Sonderfarbe'],price:41234,quantity_rule:{min:1,increment:1},store_availabilities:[]};
  const currentProduct={id:70,title:'Aktuelles Produkt',url:'/products/aktuelles-produkt',vendor:'Aktueller Lieferant',metafields:{upswing:{}},images:[],media:[],variants:[selected],variants_count:1,selected_or_first_available_variant:selected,first_available_variant:selected,has_only_default_variant:true,options_with_values:[],selling_plan_groups:[],...product};
  let source=fs.readFileSync(path.join(root,'sections',sectionName+'.liquid'),'utf8').replace(/\{% schema %\}[\s\S]*?\{% endschema %\}/,'');
  source=source.replace(/{%-?\s*form\s[^%]+%}/g,'<form data-product-form>').replace(/{%-?\s*endform\s*-?%}/g,'</form>');
  return new JSDOM(await sectionEngine.parseAndRender(source,{product:currentProduct,section:{id:'main',settings:{shipping_note:'Veraltete Versandangabe'},blocks:[]},cart:{item_count:1,items:[],items_subtotal_price:41234,total_price:41234,cart_level_discount_applications:[],taxes_included:true,...cart},shop:{enabled_payment_types:[],...shop},routes:{root_url:'/',cart_url:'/cart',all_products_collection_url:'/collections/all'},form:{},all_products:{}}));
}

test('product and cart use the current Shopify shipping policy instead of saved shipping copy',async()=>{
  const policy={url:'/policies/shipping-policy',body:'<p>Aktuelle Versandbedingungen aus Shopify.</p>'};
  for(const sectionName of ['main-product','main-cart']) {
    const dom=await commerceDocument(sectionName,{shop:{shipping_policy:policy}});try{
      const links=[...dom.window.document.querySelectorAll('a[href="/policies/shipping-policy"]')];
      assert(links.length>0);
      assert(!dom.window.document.body.textContent.includes('Veraltete Versandangabe'));
      if(sectionName==='main-product')assert(dom.window.document.body.textContent.includes('Aktuelle Versandbedingungen aus Shopify.'));
    }finally{dom.window.close();}
    const missing=await commerceDocument(sectionName);try{
      assert.equal(missing.window.document.querySelector('a[href="/policies/shipping-policy"]'),null);
      assert(!missing.window.document.body.textContent.includes('Veraltete Versandangabe'));
      assert.equal(missing.window.document.querySelector('.cart-shipping-note'),null);
    }finally{missing.window.close();}
  }
});

test('cart tax note follows Shopify tax inclusion on the current cart',async()=>{
  for(const taxesIncluded of [true,false]){
    const dom=await commerceDocument('main-cart',{cart:{taxes_included:taxesIncluded}});try{
      const text=dom.window.document.querySelector('.cart-tax-note').textContent;
      assert(text.includes(taxesIncluded?'Inklusive Steuern.':'Steuern werden an der Kasse berechnet.'));
      assert(!text.includes(taxesIncluded?'Steuern werden an der Kasse berechnet.':'Inklusive Steuern.'));
    }finally{dom.window.close();}
  }
});

test('product option labels use exact native swatches and leave names without swatch data as text',async()=>{
  const value=(name,swatch)=>({swatch,available:true,toString:()=>name});
  const options=[{name:'Farbe',position:1,selected_value:'Gewebe',values:[value('Gewebe',{image:{src:'/shopify-swatch.jpg'}}),value('Exakter Ton',{color:'#abcdef'}),value('Schwarz',{})]}];
  const dom=await commerceDocument('main-product',{product:{has_only_default_variant:false,options_with_values:options,metafields:{aico:{pd_color_hex:{value:'#112233'}}}}});try{
    const labels=[...dom.window.document.querySelectorAll('.variant-label')];
    assert.equal(labels[0].querySelector('img').getAttribute('src'),'/shopify-swatch.jpg');
    assert.equal(labels[1].querySelector('.variant-color-dot').style.getPropertyValue('--swatch-color'),'#abcdef');
    assert.equal(labels[2].textContent,'Schwarz');
    assert.equal(labels[2].querySelector('img,.variant-color-dot'),null);
  }finally{dom.window.close();}
});

function fixture({initialDelivery={text:'Lieferzeit: 2–3 Werktage',status:'fast'},serverVariant='',serverStatus='fast',serverText='Lieferzeit: 2–3 Werktage'}={}) {
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
    await f.resolve(0,12,'Lieferzeit: 3–5 Werktage');
    const label=f.document.querySelector('[data-product-availability]');assert.match(label.textContent,/3–5/);assert.equal(label.getAttribute('aria-busy'),'false');
    f.change('36');assert.match(label.textContent,/2–3/);f.change('37');assert.equal(f.requests.length,1,'Briefly revisiting a resolved size reuses the result');assert.match(label.textContent,/3–5/);
  }finally{f.dom.window.close();}
});

test('late delivery responses cannot overwrite the newer selected size',async()=>{
  const f=fixture();try{
    f.change('37');f.change('38');assert.equal(f.requests[0].init.signal.aborted,true);
    await f.resolve(1,13,'Lieferzeit: 2–3 Werktage','fast');
    await f.resolve(0,12,'Lieferzeit: 3–5 Werktage');
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
    f.change('37');await f.resolve(1,12,'Lieferzeit: 3–5 Werktage');
    f.change('36');
    const label=f.document.querySelector('[data-product-availability]');
    assert.equal(label.textContent,'Aktuell nicht lieferbar');assert.equal(label.dataset.deliveryStatus,'unavailable');
    assert.equal(f.requests.length,2);assert.equal(f.document.querySelector('.enhanced-add-button').disabled,true,'Old JSON must never override the fresh unavailable cache');
  }finally{f.dom.window.close();}
});

test('a matching server-rendered selected-variant paragraph seeds the cache without redundant fetching',async()=>{
  const f=fixture({initialDelivery:null,serverVariant:'11',serverStatus:'normal',serverText:'Lieferzeit: 3–5 Werktage'});try{
    assert.equal(f.requests.length,0);assert.match(f.document.querySelector('[data-product-availability]').textContent,/3–5 Werktage/);
    f.advance(60000);f.change('36');assert.equal(f.requests.length,1,'Server-rendered estimates expire normally too');
    await f.resolve(0,11,'Lieferzeit: 2–3 Werktage','fast');
    assert.match(f.document.querySelector('[data-product-availability]').textContent,/2–3 Werktage/);
  }finally{f.dom.window.close();}
});

test('server paragraph only seeds the exact selected ID and accepted delivery statuses',async()=>{
  for (const settings of [{serverVariant:'12',serverStatus:'fast'},{serverVariant:'11',serverStatus:'pending'},{serverVariant:'11',serverStatus:'normal',serverText:'   '}]) {
    const f=fixture({initialDelivery:null,...settings});try{
      assert.equal(f.requests.length,1,'A mismatched, loading or blank paragraph cannot suppress the actual selected-variant check');
      assert.equal(f.document.querySelector('[data-product-availability]').dataset.deliveryStatus,'pending');
      await f.resolve(0,11,'Lieferzeit: 3–5 Werktage');
    }finally{f.dom.window.close();}
  }
  const current=fixture({serverVariant:'11',serverStatus:'normal',serverText:'Lieferzeit: 3–5 Werktage'});try{
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
    f.change('37');await f.resolve(0,12,'Lieferzeit: 2–3 Werktage','fast','other-product');
    const label=f.document.querySelector('[data-product-availability]');assert.equal(label.dataset.deliveryStatus,'unknown');assert.match(label.textContent,/konnte nicht ermittelt/);assert(!label.textContent.includes('2–3'));
    f.change('38');f.requests[1].reject(new Error('offline'));await tick();assert.match(label.textContent,/konnte nicht ermittelt/);
  }finally{f.dom.window.close();}
});

test('replaced product sections never receive late delivery results',async()=>{
  const f=fixture();try{
    f.change('37');const label=f.document.querySelector('[data-product-availability]');f.document.querySelector('section').remove();
    await f.resolve(0,12,'Lieferzeit: 2–3 Werktage','fast');assert.equal(label.dataset.deliveryStatus,'pending');
  }finally{f.dom.window.close();}
});
