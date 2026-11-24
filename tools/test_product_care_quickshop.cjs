const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const script = readFileSync(path.join(root, 'assets/product-care-quickshop.js'), 'utf8');
const engine = new Liquid({root:path.join(root,'snippets'),extname:'.liquid',strictFilters:true});
engine.registerFilter('money_with_currency', value => `CHF ${(value / 100).toFixed(2)}`);
const variant = (id, overrides={}) => ({id,title:`Ausführung ${id}`,available:true,price:1200,quantity_rule:{min:1,increment:1},...overrides});
const product = variants => ({id:44,title:'Ausgewählte Pflege',url:'/de/products/pflege',available:true,variants,variants_count:variants.length,selected_or_first_available_variant:variants.find(v=>v.available),requires_selling_plan:false});
async function markup(item=product([variant(301)])) {
  return engine.renderFile('product-care-quickshop',{product:item,section:{id:'care'},routes:{cart_add_url:'/de/cart/add',cart_url:'/de/cart'}});
}
const flush = () => new Promise(resolve => setImmediate(resolve));
function boot(html, fetch) {
  const dom = new JSDOM(`<a aria-label="Warenkorb mit 0 Artikeln"><span data-cart-count>0</span></a>${html}`,{url:'https://upswing.ch/de/products/schuh',runScripts:'outside-only'});
  dom.window.fetch = fetch;
  dom.window.eval(script);
  return dom;
}
function submit(dom) {
  dom.window.document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
}

test('single care variant has a native purchase form, exact current id and real quantity rules',async()=>{
  const dom=new JSDOM(await markup(product([variant(301,{quantity_rule:{min:2,increment:2,max:6}})])));
  try{
    const form=dom.window.document.querySelector('form');
    assert.equal(form.getAttribute('action'),'/de/cart/add');
    assert.equal(form.querySelector('[name=id]').value,'301');
    const quantity=form.querySelector('[name=quantity]');
    assert.deepEqual([quantity.value,quantity.min,quantity.step,quantity.max],['2','2','2','6']);
    assert.equal(dom.window.document.querySelector('details'),null);
    assert.match(form.querySelector('button').textContent,/2 Stück in den Warenkorb/);
    assert.equal(quantity.type,'hidden');
  }finally{dom.window.close();}
});

test('multiple variants require a choice; sold-out options are disabled and selection updates price and quantities',async()=>{
  const calls=[];
  const dom=boot(await markup(product([variant(301),variant(302,{price:1800,quantity_rule:{min:2,increment:2,max:8}}),variant(303,{available:false})])),(...args)=>{calls.push(args);throw Error('must not fetch');});
  try{
    const doc=dom.window.document;
    assert.ok(doc.querySelector('details summary'));
    assert.equal(doc.querySelector('select').value,'');
    assert.equal(doc.querySelector('option[value="303"]').disabled,true);
    submit(dom);await flush();assert.equal(calls.length,0);
    const select=doc.querySelector('select');select.value='302';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
    assert.equal(doc.querySelector('[data-quickshop-price]').textContent,'CHF 18.00');
    const quantity=doc.querySelector('[name=quantity]');
    assert.deepEqual([quantity.value,quantity.min,quantity.step,quantity.max],['2','2','2','8']);
  }finally{dom.window.close();}
});

test('care quickshop does not bypass required subscriptions or expose incomplete high-variant choices',async()=>{
  const item=product([variant(301)]);
  item.requires_selling_plan=true;
  assert.equal((await markup(item)).trim(),'');
  item.requires_selling_plan=false;item.variants_count=251;
  assert.equal((await markup(item)).trim(),'');
});

test('one guarded add request posts the real locale-aware form payload and refreshes counts from the actual cart',async()=>{
  const calls=[];let resolveAdd;
  const dom=boot(await markup(),(url,options={})=>{
    calls.push({url:String(url),options});
    if(options.method==='POST')return new Promise(resolve=>{resolveAdd=resolve;});
    return Promise.resolve({ok:true,json:async()=>({item_count:4})});
  });
  try{
    submit(dom);submit(dom);
    assert.equal(calls.length,1);
    assert.equal(calls[0].url,'https://upswing.ch/de/cart/add.js');
    assert.deepEqual([calls[0].options.body.get('id'),calls[0].options.body.get('quantity')],['301','1']);
    resolveAdd({ok:true,status:200,json:async()=>({id:301,quantity:1})});
    await flush();await flush();
    assert.equal(calls.length,2);
    assert.equal(calls[1].url,'https://upswing.ch/de/cart.js');
    assert.equal(dom.window.document.querySelector('[data-cart-count]').textContent,'4');
    assert.equal(dom.window.document.querySelector('a').getAttribute('aria-label'),'Warenkorb mit 4 Artikeln');
    assert.match(dom.window.document.querySelector('[role=status]').textContent,/hinzugefügt/);
    assert.equal(dom.window.document.querySelector('[data-quickshop-cart]').hidden,false);
  }finally{dom.window.close();}
});

test('stock rejection is shown as text, never retried, and allows a corrected user choice',async()=>{
  let calls=0;
  const dom=boot(await markup(),async()=>{calls++;return {ok:false,status:422,json:async()=>({description:'Nicht mehr lieferbar <b>Hinweis</b>'})};});
  try{
    submit(dom);await flush();
    assert.equal(calls,1);
    assert.equal(dom.window.document.querySelector('[role=status]').textContent,'Nicht mehr lieferbar <b>Hinweis</b>');
    assert.equal(dom.window.document.querySelector('[role=status] b'),null);
    assert.equal(dom.window.document.querySelector('button').disabled,false);
  }finally{dom.window.close();}
});

test('ambiguous network or malformed success locks resubmission instead of duplicating a possible add',async()=>{
  for(const failure of [()=>Promise.reject(new Error('connection lost')),async()=>({ok:true,status:200,json:async()=>{throw Error('bad JSON');}})]){
    let calls=0;
    const dom=boot(await markup(),(...args)=>{calls++;return failure(...args);});
    try{
      submit(dom);await flush();submit(dom);await flush();
      assert.equal(calls,1);
      assert.equal(dom.window.document.querySelector('button').disabled,true);
      assert.match(dom.window.document.querySelector('[role=status]').textContent,/prüfe deinen Warenkorb/);
      assert.equal(dom.window.document.querySelector('[data-quickshop-cart]').hidden,false);
    }finally{dom.window.close();}
  }
});
