const assert = require('node:assert/strict');
const path = require('node:path');
const {test} = require('node:test');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const engine = new Liquid({root:path.resolve(__dirname,'../snippets'),extname:'.liquid',strictFilters:true});
engine.registerFilter('image_url', image => image?.src || '');
engine.registerFilter('image_tag', url => `<img src="${url}" alt="">`);
engine.registerFilter('money_with_currency', value => `CHF ${(Number(value || 0) / 100).toFixed(2)}`);
engine.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
engine.registerFilter('metafield_tag', field => field?.value || '');
const item = (id, handle, overrides={}) => ({id, handle, title:`Aktuell ${handle}`, url:`/products/${handle}`, vendor:'Pflegemarke', available:true,
  price:1200, price_min:1200, price_max:1200, selected_or_first_available_variant:{price:1200},
  images:[],options_with_values:[],tags:[],metafields:{upswing:{},custom_fields:{},aico:{}},...overrides});
const base = () => item(10,'shoe',{description:'',metafields:{upswing:{},custom_fields:{}}});
async function care(product, all_products={}, extra={}) {
  const context={product,all_products,shop:{url:'https://upswing.ch'},routes:{root_url:'/'},settings:{},...extra};
  return new JSDOM(await engine.renderFile('product-care-products',context,{globals:context}));
}
const handles = doc => [...doc.querySelectorAll('[data-product-card]')].map(node=>node.dataset.productHandle);

test('care cards resolve only explicit links inside the native care section and retain original product resources',async()=>{
  const product=base();
  product.description='<p><a href="/products/unrelated">Other model</a></p><h2 class="native-heading">\n Pflege \n</h2><p>Nutze <a href="https://upswing.ch/products/cream?x=1#care">Creme</a> und <a href=\'/products/spray\'>Spray</a>, <a href="/products/cream">nochmals Creme</a>.</p><h2>Beratung</h2><a href="/products/unrelated">Nicht Pflege</a>';
  const dom=await care(product,{cream:item(11,'cream'),spray:item(12,'spray'),unrelated:item(13,'unrelated')});
  try {
    const doc=dom.window.document;
    assert.deepEqual(handles(doc),['cream','spray']);
    assert.equal(doc.querySelector('.product-title a').getAttribute('href'),'/products/cream');
    assert.match(doc.querySelector('.product-price').textContent,/12\.00/);
    assert.equal(doc.querySelectorAll('#ProductCareProductsTitle').length,1);
    assert.match(product.description, /native-heading/);
  } finally {dom.window.close();}
});

test('no actual care links means no card section or invented recommendations',async()=>{
  for(const description of ['', '<p><a href="/products/cream">Link outside care</a></p>', '<h2>Pflege</h2><p>Mit einem weichen Tuch reinigen.</p>', '<h2>Pflege</h2><a href="/products/deleted">Gelöscht</a>']) {
    const product=base();product.description=description;product.title='Leder Schuh cream';product.tags=['Pflegemittel'];
    const dom=await care(product,{cream:item(11,'cream')});
    try {assert.equal(dom.window.document.querySelector('[data-product-care-products]'),null);} finally {dom.window.close();}
  }
});

test('explicit typed care references preserve order, omit self, unavailable and deleted resources, and cap cards at four',async()=>{
  const product=base();
  product.metafields.upswing.care_products={type:'list.product_reference',value:[product,{},item(20,'sold-out',{available:false}),item(11,'one'),item(11,'one'),item(12,'two'),item(13,'three'),item(14,'four'),item(15,'five')]};
  const dom=await care(product);try{assert.deepEqual(handles(dom.window.document),['one','two','three','four']);}finally{dom.window.close();}
  product.metafields.upswing.care_products={type:'json',value:[item(11,'one')]};
  const rejected=await care(product);try{assert.equal(rejected.window.document.querySelector('[data-product-care-products]'),null);}finally{rejected.window.close();}
});

test('localized and same-shop links work while foreign, protocol-relative and lookalike-domain links remain unbound',async()=>{
  const product=base();
  product.description='<h3>Schuhpflege</h3><a href="/de/products/local">Lokal</a><a href="https://upswing.ch/collections/care/products/context">Kontext</a><a href="https://foreign.example/products/foreign">Fremd</a><a href="//upswing.ch/products/protocol">Protokoll</a><a href="https://upswing.ch.evil.example/products/lookalike">Ähnlich</a>';
  const products=Object.fromEntries(['local','context','foreign','protocol','lookalike'].map((handle,index)=>[handle,item(index+30,handle)]));
  const dom=await care(product,products,{routes:{root_url:'/de/'}});
  try{assert.deepEqual(handles(dom.window.document),['local','context']);}finally{dom.window.close();}
});

test('structured care links are supported and duplicate native links do not create a second card',async()=>{
  const product=base();
  product.metafields.upswing.care={type:'rich_text_field',value:'<p><a href="/products/cream">Echte Pflegeempfehlung</a></p>'};
  product.description='<h2>Pflegehinweise</h2><a href="/products/cream">Gleiche Empfehlung</a><a href="/products/shoe">Selbstreferenz</a>';
  const dom=await care(product,{cream:item(11,'cream'),shoe:product});
  try{assert.deepEqual(handles(dom.window.document),['cream']);}finally{dom.window.close();}
});

test('an explicit care list is authoritative and never filled with unselected description links',async()=>{
  const product=base();
  product.description='<h2>Pflege</h2><a href="/products/unselected">Frühere Empfehlung</a>';
  product.metafields.upswing.care_products={type:'list.product_reference',value:[item(11,'selected')]};
  const dom=await care(product,{unselected:item(12,'unselected')});
  try{assert.deepEqual(handles(dom.window.document),['selected']);}finally{dom.window.close();}
  product.metafields.upswing.care_products.value=[];
  const empty=await care(product,{unselected:item(12,'unselected')});
  try{assert.equal(empty.window.document.querySelector('[data-product-care-products]'),null);}finally{empty.window.close();}
});

test('service elements bind actual policy URLs and consultation without fixed free-shipping or exchange claims',async()=>{
  const dom=new JSDOM(await engine.renderFile('product-trust',{shop:{shipping_policy:{url:'/policies/shipping-policy'},refund_policy:{url:'/policies/refund-policy'}},consultation_url:'/pages/filialubersicht#Filialen'}));
  try{
    const doc=dom.window.document;
    assert.deepEqual([...doc.querySelectorAll('.product-trust a')].map(link=>link.getAttribute('href')),['/pages/filialubersicht#Filialen','/policies/shipping-policy','/policies/refund-policy']);
    assert.doesNotMatch(doc.body.textContent,/kostenlos|14 Tage|garantiert|morgen/i);
  }finally{dom.window.close();}
  const empty=new JSDOM(await engine.renderFile('product-trust',{shop:{},consultation_url:''}));
  try{assert.equal(empty.window.document.querySelector('.product-trust'),null);}finally{empty.window.close();}
});
