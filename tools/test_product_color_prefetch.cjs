const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM,VirtualConsole} = require('jsdom');
const script=fs.readFileSync(path.join(__dirname,'../assets/product-color-prefetch.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const until=async predicate=>{for(let i=0;i<40;i++){if(predicate())return;await tick();}assert.fail('Expected asynchronous prefetch state');};

function sectionMarkup(color='black',id=101,{product=color,section='main',executable=false}={}) {
  const size=String(id).endsWith('2')?'37':String(id).endsWith('3')?'38':'36';
  const delivery=id%2===0?'Sofort verfügbar · Lieferzeit: 2–3 Werktage':'Online verfügbar · Lieferzeit: 3–5 Werktage';
  return `<section data-product-section data-product-url="/fr/products/${product}" data-section-id="${section}">
    <h1>Aarau ${color}</h1><p class="product-intro">Le ${color}.</p><p data-product-sku-row><span data-product-sku>SKU-${id}</span></p>
    <img data-product-image src="/images/${color}-${id}.jpg">
    <div class="model-colors"><div class="swatches">${['black','blue','red'].map(name=>`<a href="/fr/products/${name}"${name===color?' aria-current="page"':''}>${name}</a>`).join('')}</div></div>
    <form action="/fr/cart/add" method="post" data-product-form data-high-variants="3">
      <fieldset data-option-group="1" data-option-name="2/3 französische Grössen"><legend>2/3 französische Grössen</legend>
      ${['36','37','38'].map(value=>`<input type="radio" name="options[Grösse]" value="${value}" data-option-select data-option-position="1"${value===size?' checked':''}>`).join('')}</fieldset>
      <input name="id" type="hidden" value="${id}"><input name="quantity" type="number" value="2">
      <script type="application/json" data-variants>${JSON.stringify([{id,options:[size],available:true,sku:'SKU-'+id,delivery:{text:delivery,status:id%2===0?'fast':'normal'}}])}</script>
      <p data-product-availability data-delivery-status="${id%2===0?'fast':'normal'}">${delivery}</p>
      <button type="submit">In den Warenkorb</button>
    </form>
    ${executable?'<script>window.badAppScriptExecuted = true;</script>':''}
  </section>`;
}

function fixture() {
  const errors=[];const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error));
  const dom=new JSDOM(`<!doctype html><html><head><title>Aarau black · upswing</title><link rel="canonical" href="https://upswing.test/fr/products/black"><meta name="description" content="black"></head><body>${sectionMarkup()}</body></html>`,{url:'https://upswing.test/fr/products/black',runScripts:'outside-only',virtualConsole:console});
  const {window}=dom,document=window.document;
  const requests=[],metadata=[],prepared=[],loaded=[],history=[],imageCalls=[],bindCalls=[];
  const products={blue:{id:200,handle:'blue',title:'Blau',productTitle:'Aarau blue',options:['2/3 französische Grössen'],variants:['36','37','38'].map((size,i)=>({id:201+i,options:[size],available:true}))},red:{id:300,handle:'red',title:'Rot',productTitle:'Aarau red',options:['2/3 französische Grössen'],variants:['36','37','38'].map((size,i)=>({id:301+i,options:[size],available:true}))}};
  window.fetch=(url,init)=>new Promise((resolve,reject)=>requests.push({url,init,resolve,reject}));
  window.upswingLegacyColors={fetchProduct:async(handle,localeRoot)=>{metadata.push({handle,localeRoot});return products[handle]||null;},bind:()=>bindCalls.push('colors')};
  window.upswingGalleryImagePreload={create:()=>({warm:urls=>imageCalls.push([...urls]),destroy(){}})};
  window.upswingProductMedia={prepareColor:(root,url)=>prepared.push({root,url}),bind:()=>bindCalls.push('media')};
  window.upswingQuantity={bind:()=>bindCalls.push('quantity')};
  const originalPush=window.history.pushState.bind(window.history);
  window.history.pushState=(state,unused,url)=>{history.push({state,url});originalPush(state,unused,url);};
  document.addEventListener('shopify:section:load',event=>loaded.push(event.target));
  window.eval(script);
  return {dom,window,document,requests,metadata,prepared,loaded,history,imageCalls,bindCalls,errors,products,
    root:()=>document.querySelector('[data-product-section]'),
    warm(color){return window.upswingColorPrefetch.warm(this.root(),color.startsWith('http')?color:'/fr/products/'+color);},
    choose(size){const radio=this.root().querySelector(`input[type="radio"][value="${size}"]`);radio.checked=true;},
    click(color){const event=new window.MouseEvent('click',{bubbles:true,cancelable:true,button:0});this.root().querySelector(`.swatches a[href="/fr/products/${color}"]`).dispatchEvent(event);return event;},
    async resolve(index,{markup,status=200,...settings}={}){const url=new URL(requests[index].url);const color=url.pathname.split('/').pop();const id=Number(url.searchParams.get('variant'))||201;requests[index].resolve({ok:status===200,text:async()=>markup??sectionMarkup(color,id,settings)});await tick();}
  };
}

test('warming keeps navigation unchanged and fetches the matching native section in the active locale',async()=>{
  const f=fixture();try{
    f.choose('37');const original=f.root();const pending=f.warm('blue');await until(()=>f.requests.length===1);
    const url=new URL(f.requests[0].url);
    assert.equal(url.pathname,'/fr/products/blue');assert.equal(url.searchParams.get('variant'),'202');assert.equal(url.searchParams.get('section_id'),'main');
    assert.equal(f.requests[0].init.redirect,'error');assert.equal(f.requests[0].init.credentials,'same-origin');
    assert.deepEqual(f.metadata[0],{handle:'blue',localeRoot:'/fr/'});
    assert.equal(f.history.length,0);assert.equal(f.root(),original);assert.equal(f.window.location.pathname,'/fr/products/black');
    await f.resolve(0);const result=await pending;
    assert.equal(result.data.productTitle,'Aarau blue');assert.equal(result.url.searchParams.get('variant'),'202');
    assert.deepEqual(f.imageCalls,[['/images/blue-202.jpg']]);
    assert.equal(f.history.length,0);assert.equal(f.root(),original,'Prefetch must leave the current product visible');
  }finally{f.dom.window.close();}
});

test('an open quick-buy colour option warms its target even when its panel is outside the product section',async()=>{
  const f=fixture();try{
    const panel=f.document.createElement('div');panel.className='product-context-color-panel';
    const choice=f.document.createElement('button');choice.dataset.colorTarget='/fr/products/blue';panel.append(choice);f.document.body.append(panel);
    choice.dispatchEvent(new f.window.Event('pointerover',{bubbles:true}));
    await until(()=>f.requests.length===1);
    assert.equal(new URL(f.requests[0].url).pathname,'/fr/products/blue');
    assert.equal(f.history.length,0);
    await f.resolve(0);
  }finally{f.dom.window.close();}
});

test('colour click reuses the warmed native form, target SKU/delivery and variant JSON',async()=>{
  const f=fixture();try{
    f.choose('37');const original=f.root();const pending=f.warm('blue');await until(()=>f.requests.length===1);await f.resolve(0);await pending;
    const click=f.click('blue');assert.equal(click.defaultPrevented,true);await until(()=>f.history.length===1);
    assert.equal(f.requests.length,1,'No second request for the warmed product and size');
    const incoming=f.root();assert.notEqual(incoming,original);assert.equal(incoming.dataset.productUrl,'/fr/products/blue');
    assert.equal(incoming.querySelector('form').getAttribute('action'),'/fr/cart/add');
    assert.equal(incoming.querySelector('form [name=id]').value,'202');
    assert.equal(JSON.parse(incoming.querySelector('[data-variants]').textContent)[0].id,202);
    assert.equal(incoming.querySelector('[data-product-sku]').textContent,'SKU-202');
    assert.match(incoming.querySelector('[data-product-availability]').textContent,/2–3 Werktage/);
    assert.equal(f.loaded[0],incoming);assert.equal(f.prepared[0].root,original);
    assert.deepEqual(f.bindCalls,['colors','media','quantity']);
    assert.equal(f.window.location.pathname,'/fr/products/blue');assert.equal(f.window.location.search,'?variant=202');
    assert.equal(f.document.querySelector('link[rel=canonical]').href,'https://upswing.test/fr/products/blue');
    assert.equal(f.document.querySelector('meta[name=description]').content,'Le blue.');
    assert.equal(f.errors.length,0);
  }finally{f.dom.window.close();}
});

test('changing size produces a separate cached section and selects the latest warmed variant',async()=>{
  const f=fixture();try{
    const first=f.warm('blue');await until(()=>f.requests.length===1);await f.resolve(0);await first;
    f.choose('37');const second=f.warm('blue');await until(()=>f.requests.length===2);await f.resolve(1);await second;
    assert.deepEqual(f.requests.map(request=>new URL(request.url).searchParams.get('variant')),['201','202']);
    f.click('blue');await until(()=>f.history.length===1);
    assert.equal(f.requests.length,2);assert.equal(f.root().querySelector('[name=id]').value,'202');
  }finally{f.dom.window.close();}
});

test('foreign URLs, missing product data, wrong products and executable scripts remain native navigation',async()=>{
  const f=fixture();try{
    assert.equal(await f.warm('https://foreign.example/products/blue'),null);assert.equal(f.metadata.length,0);assert.equal(f.requests.length,0);
    assert.equal(await f.warm('missing'),null);assert.equal(f.requests.length,0);
    const wrong=f.warm('blue');await until(()=>f.requests.length===1);await f.resolve(0,{product:'other-product'});assert.equal(await wrong,null);
    const executable=f.warm('red');await until(()=>f.requests.length===2);await f.resolve(1,{executable:true});assert.equal(await executable,null);
    assert.equal(f.window.badAppScriptExecuted,undefined);
    const original=f.root();f.click('red');await until(()=>f.errors.some(error=>/navigation/i.test(error.message)));
    assert.equal(f.root(),original);assert.equal(f.history.length,0,'Unsafe app sections must use document navigation instead of replacing the form');
  }finally{f.dom.window.close();}
});

test('older colour response cannot replace a newer colour selection',async()=>{
  const f=fixture();try{
    f.click('blue');await until(()=>f.requests.length===1);f.click('red');await until(()=>f.requests.length===2);
    await f.resolve(1);await until(()=>f.history.length===1);assert.equal(f.root().dataset.productUrl,'/fr/products/red');
    await f.resolve(0);await tick();assert.equal(f.root().dataset.productUrl,'/fr/products/red');assert.equal(f.history.length,1);assert.equal(f.prepared.length,1);
  }finally{f.dom.window.close();}
});

test('same-product responses for a wrong selected size or section cannot be swapped',async()=>{
  const f=fixture();try{
    f.choose('37');const wrongVariant=f.warm('blue');await until(()=>f.requests.length===1);await f.resolve(0,{markup:sectionMarkup('blue',201)});assert.equal(await wrongVariant,null,'The response must have the requested variant ID');
    const wrongSection=f.warm('red');await until(()=>f.requests.length===2);await f.resolve(1,{section:'different-template'});assert.equal(await wrongSection,null,'The response must have the requested section ID');
  }finally{f.dom.window.close();}
});

test('repeated size changes during all retries never swap an outdated cached size',async()=>{
  const f=fixture();try{
    const original=f.root();f.click('blue');await until(()=>f.requests.length===1);
    f.choose('37');await f.resolve(0);await until(()=>f.requests.length===2);
    f.choose('38');await f.resolve(1);await until(()=>f.requests.length===3);
    f.choose('36');await f.resolve(2);await tick();
    assert.equal(f.history.length,0,'None of the three warmed results matched the final current selection');assert.equal(f.root(),original);
    assert.ok(f.errors.some(error=>/navigation/i.test(error.message)),'The unstable selection falls back to normal navigation');
  }finally{f.dom.window.close();}
});
