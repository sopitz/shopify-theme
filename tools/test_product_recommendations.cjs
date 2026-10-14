const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const {Liquid}=require('liquidjs');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'assets/product-recommendations.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function result(id='100',count=2,section='related',extra='') {
  return `<product-recommendations data-recommendations data-product-id="${id}" data-section-id="${section}">
    ${count?`<section data-recommendations-content><h2>Das könnte Ihnen auch gefallen.</h2><div class="product-grid">${Array.from({length:count},(_,i)=>`<article data-product-card><a href="/fr/products/recommended-${i}?pr_rec_pid=${id}">Empfehlung ${i}</a><script type="application/json" data-legacy-color-data>{"current":${i}}</script></article>`).join('')}</div>${extra}</section>`:''}
  </product-recommendations>`;
}
function fixture({observer=true,url='/fr/recommendations/products'}={}) {
  const dom=new JSDOM(`<!doctype html><html><body><section data-product-section><form data-product-form data-product-id="100"></form></section><product-recommendations data-recommendations data-url="${url}" data-product-id="100" data-section-id="related" style="display:block;min-height:1px"></product-recommendations></body></html>`,{url:'https://upswing.test/fr/products/aarau',runScripts:'outside-only'});
  const {window}=dom,document=window.document;const requests=[],bindings=[],loads=[],observers=[];
  if(observer)window.IntersectionObserver=class {
    constructor(callback,settings){this.callback=callback;this.settings=settings;this.targets=[];observers.push(this);}
    observe(target){this.targets.push(target);}disconnect(){this.disconnected=true;}
    fire(value=true){this.callback(this.targets.map(target=>({target,isIntersecting:value})));}
  };
  window.fetch=(url,init)=>new Promise((resolve,reject)=>requests.push({url,init,resolve,reject}));
  window.upswingLegacyColors={bind:()=>bindings.push('colors')};window.upswingQuantity={bind:()=>bindings.push('quantity')};
  document.addEventListener('shopify:section:load',event=>{if(event.target.matches('[data-recommendations-content]'))loads.push(event.target);});
  window.eval(script);
  return {dom,window,document,requests,bindings,loads,observers,host:document.querySelector('product-recommendations'),
    show(){observers[0]?.fire();},
    changeProduct(id){const previous=document.querySelector('[data-product-section]');const incoming=document.createElement('section');incoming.dataset.productSection='';incoming.innerHTML=`<form data-product-form data-product-id="${id}"></form>`;previous.replaceWith(incoming);incoming.dispatchEvent(new window.CustomEvent('shopify:section:load',{bubbles:true}));},
    async resolve(index,html=result(),status=200){requests[index].resolve({ok:status===200,text:async()=>html});await tick();}
  };
}

test('recommendations load only near the viewport with native locale parameters and card bindings',async()=>{
  const f=fixture();try{
    assert.equal(f.requests.length,0);assert.equal(f.host.querySelector('h2'),null);assert.equal(f.observers[0].settings.rootMargin,'300px 0px');
    f.show();assert.equal(f.requests.length,1);const url=new URL(f.requests[0].url);
    assert.equal(url.pathname,'/fr/recommendations/products');assert.equal(url.searchParams.get('product_id'),'100');assert.equal(url.searchParams.get('section_id'),'related');assert.equal(url.searchParams.get('limit'),'4');assert.equal(url.searchParams.get('intent'),'related');
    assert.equal(f.requests[0].init.credentials,'same-origin');assert.equal(f.requests[0].init.redirect,'error');
    await f.resolve(0);assert.equal(f.host.querySelectorAll('[data-product-card]').length,2);assert.equal(f.host.dataset.recommendationState,'ready');
    assert.equal(f.host.querySelector('a').getAttribute('href'),'/fr/products/recommended-0?pr_rec_pid=100','Keep Shopify recommendation tracking');
    assert.deepEqual(f.bindings,['colors','quantity']);assert.equal(f.loads.length,1);assert(!f.host.hasAttribute('aria-busy'));
    f.show();assert.equal(f.requests.length,1,'Repeated intersection must not duplicate loaded recommendations');
  }finally{f.dom.window.close();}
});

test('empty, failed and wrong-context responses never leave a heading or fake products',async()=>{
  for(const [html,status]of[[result('100',0),200],[result('999'),200],[result('100',2,'wrong-section'),200],['<h2>Unexpected page</h2>',200],[result(),404]]){
    const f=fixture();try{f.show();await f.resolve(0,html,status);assert.equal(f.host.children.length,0);assert.equal(f.host.querySelector('h2'),null);assert.equal(f.host.dataset.recommendationState,'empty');assert.equal(f.bindings.length,0);}finally{f.dom.window.close();}
  }
});

test('colour product swaps remove old recommendations and fetch for the new product ID',async()=>{
  const f=fixture();try{
    f.show();await f.resolve(0);assert.equal(f.host.querySelectorAll('[data-product-card]').length,2);
    f.changeProduct('200');assert.equal(f.host.dataset.productId,'200');assert.equal(f.host.children.length,0,'Old product cards disappear immediately');assert.equal(f.requests.length,2);
    assert.equal(new URL(f.requests[1].url).searchParams.get('product_id'),'200');
    await f.resolve(1,result('200',3));assert.equal(f.host.querySelectorAll('[data-product-card]').length,3);assert.match(f.host.querySelector('a').getAttribute('href'),/pr_rec_pid=200/);
    f.changeProduct('200');assert.equal(f.requests.length,2,'Non-product or unchanged section load should retain current recommendations');
  }finally{f.dom.window.close();}
});

test('old recommendations cannot reappear after a newer colour product response',async()=>{
  const f=fixture();try{
    f.show();f.changeProduct('200');assert.equal(f.requests[0].init.signal.aborted,true);
    await f.resolve(1,result('200',1));await f.resolve(0,result('100',4));
    assert.equal(f.host.dataset.productId,'200');assert.equal(f.host.querySelectorAll('[data-product-card]').length,1);assert.match(f.host.querySelector('a').getAttribute('href'),/pr_rec_pid=200/);assert.equal(f.loads.length,1);
  }finally{f.dom.window.close();}
});

test('hidden recommendation host waits until visible even after product changes',async()=>{
  const f=fixture();try{
    f.changeProduct('200');assert.equal(f.requests.length,0);f.show();assert.equal(f.requests.length,1);await f.resolve(0,result('200'));assert.equal(f.host.dataset.productId,'200');
  }finally{f.dom.window.close();}
});

test('detached recommendation hosts abort and reject late answers',async()=>{
  const f=fixture();try{f.show();f.host.remove();assert.equal(f.requests[0].init.signal.aborted,true);assert.equal(f.observers[0].disconnected,true);await f.resolve(0);assert.equal(f.host.children.length,0);assert.equal(f.bindings.length,0);}finally{f.dom.window.close();}
});

test('an editor-reinserted host can retry an aborted request',async()=>{
  const f=fixture();try{
    f.show();f.host.remove();assert.equal(f.requests[0].init.signal.aborted,true);
    f.document.body.append(f.host);f.observers.at(-1).fire();assert.equal(f.requests.length,2,'Reconnection clears the previous loading ID');
    await f.resolve(1);await f.resolve(0,result('100',4));assert.equal(f.host.querySelectorAll('[data-product-card]').length,2);assert.equal(f.loads.length,1);
  }finally{f.dom.window.close();}
});

test('unsupported observer loads natively while foreign endpoints and executable responses stay empty',async()=>{
  const fallback=fixture({observer:false});try{assert.equal(fallback.requests.length,1);await fallback.resolve(0);assert.equal(fallback.host.querySelectorAll('[data-product-card]').length,2);}finally{fallback.dom.window.close();}
  const foreign=fixture({observer:false,url:'https://foreign.test/recommendations/products'});try{assert.equal(foreign.requests.length,0);assert.equal(foreign.host.children.length,0);}finally{foreign.dom.window.close();}
  const script=fixture();try{script.show();await script.resolve(0,result('100',2,'related','<script>window.badRecommendations=true;</script>'));assert.equal(script.host.children.length,0);assert.equal(script.window.badRecommendations,undefined);}finally{script.dom.window.close();}
});

test('native section only renders real recommendation cards after Shopify has performed the related lookup',async()=>{
  const engine=new Liquid({root:path.join(root,'snippets'),extname:'.liquid',strictFilters:true});
  engine.registerFilter('image_url',image=>typeof image==='string'?image:image.src);
  engine.registerFilter('image_tag',image=>`<img src="${image}">`);
  engine.registerFilter('money_with_currency',value=>`CHF ${(Number(value)/100).toFixed(2)}`);
  engine.registerFilter('money',value=>(Number(value)/100).toFixed(2));
  engine.registerFilter('placeholder_svg_tag',()=>'<svg></svg>');
  const source=fs.readFileSync(path.join(root,'sections/product-recommendations.liquid'),'utf8').replace(/\{% schema %\}[\s\S]*?\{% endschema %\}/,'');
  const products=Array.from({length:5},(_,i)=>({id:200+i,title:'Modell '+i,handle:'modell-'+i,url:'/fr/products/modell-'+i+'?pr_ref_pid=100',vendor:'kybun',type:'Damenschuhe',available:true,price_min:33000,price_max:33000,price:33000,featured_image:{src:'/image-'+i+'.jpg'},options_with_values:[],metafields:{upswing:{},aico:{},custom_fields:{}}}));
  const context={product:{id:100},section:{id:'related',settings:{heading:'Das könnte Ihnen auch gefallen.'}},routes:{product_recommendations_url:'/fr/recommendations/products'},recommendations:{'performed?':true,products_count:5,products,intent:'related'}};
  const populated=new JSDOM(await engine.parseAndRender(source,context));try{assert.equal(populated.window.document.querySelectorAll('[data-product-card]').length,4);assert.equal(populated.window.document.querySelector('h2').textContent,'Das könnte Ihnen auch gefallen.');assert.match(populated.window.document.querySelector('.product-media').getAttribute('href'),/pr_ref_pid=100/);}finally{populated.window.close();}
  for(const recommendations of[{'performed?':false,products_count:5,products,intent:'related'},{'performed?':true,products_count:0,products:[],intent:'related'},{'performed?':true,products_count:5,products,intent:'complementary'}]){
    const empty=new JSDOM(await engine.parseAndRender(source,{...context,recommendations}));try{assert.equal(empty.window.document.querySelector('h2'),null);assert.equal(empty.window.document.querySelector('[data-product-card]'),null);}finally{empty.window.close();}
  }
});
