const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Liquid}=require('liquidjs');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const engine=new Liquid({root:path.join(root,'snippets'),extname:'.liquid',strictFilters:true});
const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rich=node=>{
  if(!node)return '';
  const children=(node.children||[]).map(rich).join('');
  if(node.type==='text'){let text=escape(node.value);if(node.bold)text=`<strong>${text}</strong>`;return text;}
  if(node.type==='paragraph')return `<p>${children}</p>`;
  if(node.type==='link')return `<a href="${escape(node.url)}">${children}</a>`;
  return children;
};
engine.registerFilter('metafield_tag',field=>field?.type==='rich_text_field'?rich(field.value):`<p>${escape(field?.value).replaceAll('\n','<br>')}</p>`);
engine.registerFilter('image_url',image=>typeof image==='string'?image:image?.src||'/image.jpg');
engine.registerFilter('image_tag',image=>`<img src="${image}">`);
engine.registerFilter('money_with_currency',value=>`CHF ${(Number(value)/100).toFixed(2)}`);
engine.registerFilter('money',value=>(Number(value)/100).toFixed(2));
engine.registerFilter('default_errors',()=> '');
engine.registerFilter('structured_data',()=> '{}');
engine.registerFilter('placeholder_svg_tag',()=>'<svg></svg>');
engine.registerFilter('handleize',value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));
for(const name of ['video_tag','external_video_tag','model_viewer_tag'])engine.registerFilter(name,()=> '');
const plain=(value,type='single_line_text_field')=>({type,value});
const richField=text=>({type:'rich_text_field',value:{type:'root',children:[{type:'paragraph',children:[{type:'text',value:text,bold:true},{type:'link',url:'/pages/kontakt',children:[{type:'text',value:' Quelle'}]}]}]}});
function product(overrides={}) {
  const variant={id:11,selected:true,available:true,options:['Default Title'],price:41234,compare_at_price:null,sku:'LIVE-11',quantity_rule:{min:1,increment:1},store_availabilities:[]};
  return {id:100,handle:'kybun-magglingen-light-grey-men',title:'Aktueller Name',vendor:'kybun',type:'Aktueller Produkttyp',url:'/products/kybun-magglingen-light-grey-men',description:'<p>Aktuelle Einleitung.</p><h2>Live Abschnitt</h2><p>Letzter Absatz bleibt vollständig.</p>',metafields:{upswing:{},custom_fields:{},aico:{}},images:[],media:[],variants:[variant],variants_count:1,selected_or_first_available_variant:variant,first_available_variant:variant,has_only_default_variant:true,options_with_values:[],selling_plan_groups:[],...overrides};
}
async function knowledge(p){return new JSDOM(await engine.renderFile('product-knowledge',{product:p,consultation_url:'/pages/filialubersicht'}));}
async function main(p){
  let source=fs.readFileSync(path.join(root,'sections/main-product.liquid'),'utf8').replace(/\{% schema %\}[\s\S]*?\{% endschema %\}/,'');
  source=source.replace(/{%-?\s*form\s[^%]+%}/g,'<form data-product-form>').replace(/{%-?\s*endform\s*-?%}/g,'</form>');
  return new JSDOM(await engine.parseAndRender(source,{product:p,section:{id:'main',settings:{shipping_note:'Versand laut Händler',consultation_url:'/pages/filialubersicht'},blocks:[]},cart:{taxes_included:true},routes:{root_url:'/',all_products_collection_url:'/collections/all'},shop:{},form:{},all_products:{}}));
}

test('the former Magglingen demo handle always renders the current complete native description',async()=>{
  const p=product({description:'<p>NEUE Shopdaten &amp; aktuelle Aussagen.</p><h2>Unabhängiger Titel</h2><ul><li>Erster aktueller Punkt</li><li>Letzter aktueller Punkt</li></ul><p>Letzter Absatz <a href="/products/pflege">mit Live-Link</a>.</p>'});
  const dom=await knowledge(p);try{
    assert.equal(dom.window.document.querySelector('[data-native-product-description]').innerHTML,p.description);
    assert.equal(dom.window.document.querySelector('.product-feature-grid'),null);
    assert.equal(dom.window.document.querySelector('.product-faq'),null);
    for(const stale of ['Tropo-Sohle','Comfort-Plus','Montebelluna','Leder & Mesh','Strato-Sohle'])assert(!dom.window.document.body.textContent.includes(stale),stale);
    assert(!fs.existsSync(path.join(root,'snippets/product-information-example.liquid')),'The native install package must not contain the obsolete demo facts');
  }finally{dom.window.close();}
});

test('two products with unrelated names keep their live context types and never infer shoe claims from the vendor',async()=>{
  for(const data of [{title:'Nordlicht Station',type:'Messgerät',vendor:'kybun'},{title:'Wolke Reise',type:'Sitzmöbel',vendor:'leguano'}]){
    const p=product(data);const dom=await main(p);try{
      assert.equal(dom.window.document.querySelector('.product-info h1').textContent,data.title);
      assert.equal(dom.window.document.querySelector('[data-product-section]').dataset.productContextKind,data.type);
      assert.equal(dom.window.document.querySelector('[data-product-sku]').textContent,'LIVE-11');
      assert.equal(dom.window.document.querySelector('[data-product-price]').textContent,'CHF 412.34');
      assert(!dom.window.document.body.textContent.includes('Luftkissenschuh'));assert(!dom.window.document.body.textContent.includes('Barfussschuh'));
      assert.equal(dom.window.document.querySelector('[data-native-product-description]').innerHTML,p.description);
    }finally{dom.window.close();}
  }
  const p=product();p.metafields.upswing.product_kind=plain('Explizit gepflegter Typ');const dom=await main(p);try{assert.equal(dom.window.document.querySelector('[data-product-section]').dataset.productContextKind,'Explizit gepflegter Typ');assert.match(dom.window.document.querySelector('.product-info .eyebrow').textContent,/Explizit gepflegter Typ/);}finally{dom.window.close();}
});

test('live structured heading, lead and feature labels retain all features and still include the full description',async()=>{
  const p=product();p.metafields.upswing={knowledge_heading:plain('Live <Überschrift>'),knowledge_intro:plain('Aktueller Lead & Daten\nZweite Zeile','multi_line_text_field'),short_description:plain('Niedrigere Lead-Priorität','multi_line_text_field'),benefits:plain(['Alternative Vorteile'],'list.single_line_text_field'),features:plain(Array.from({length:5},(_,i)=>({label:plain('Merkmal '+i),title:plain('Live Titel '+i),body:plain('Aktueller Body '+i,'multi_line_text_field')})),'list.metaobject_reference')};
  const dom=await knowledge(p);try{
    const document=dom.window.document;
    assert.equal(document.querySelector('#ProductInformationTitle').textContent,'Live <Überschrift>');assert.equal(document.querySelector('#ProductInformationTitle').querySelector('*'),null);
    assert.equal(document.querySelectorAll('.product-feature').length,5,'Features after the first three must remain visible in additional rows');
    assert.equal(document.querySelector('.product-feature-number').textContent,'Merkmal 0');
    assert.match(document.querySelector('.product-knowledge-lead').textContent,/Aktueller Lead & Daten/);assert(!document.querySelector('.product-knowledge-lead').textContent.includes('Niedrigere'));
    assert(!document.querySelector('#ProductOverview').textContent.includes('Alternative Vorteile'),'Structured features have display priority over the old benefits cards');
    assert.equal(document.querySelector('[data-native-product-description]').innerHTML,p.description,'Partial structured information cannot hide the full original description');
  }finally{dom.window.close();}
});

test('empty and unpublished structured records never create fake claims, empty sections or broken detail links',async()=>{
  const p=product({description:''});p.metafields.upswing={features:plain([null,{}, {title:plain(''),body:plain('')}]),benefits:plain(['','   ']),everyday_topics:plain([{}]),technical_specs:plain([{label:plain(''),value:plain('')}]),faq_items:plain([{question:plain(''),answer:plain('')}]),care:plain(''),suitability:plain(''),specifications:plain('')};
  const dom=await main(p);try{
    assert.equal(dom.window.document.querySelector('#ProductInformation'),null);assert.equal(dom.window.document.querySelector('.description-jump'),null);assert.equal(dom.window.document.querySelector('.product-benefits'),null);
    assert.equal(dom.window.document.querySelector('.product-info h1').textContent,p.title);
  }finally{dom.window.close();}
});

test('benefits alone do not replace description and all valid supplied benefits remain visible',async()=>{
  const p=product();p.metafields.upswing.benefits=plain(['','Erster', 'Zweiter','Dritter','Vierter','Fünfter'],'list.single_line_text_field');
  const dom=await main(p);try{assert.equal(dom.window.document.querySelectorAll('.product-benefits li').length,5);assert.equal(dom.window.document.querySelectorAll('#ProductOverview .product-feature').length,5);assert.equal(dom.window.document.querySelector('[data-native-product-description]').innerHTML,p.description);}finally{dom.window.close();}
});

test('rich metafields keep their formatting while plain titles and specification values are escaped',async()=>{
  const p=product();p.metafields.upswing={features:plain([{title:plain('<b>Literal title</b>'),body:richField('Rich Feature & text')}]),everyday_topics:plain([{title:plain('Live Alltag'),body:richField('Rich Alltag')}]),technical_specs:plain([{label:plain('Live <label>'),value:plain('A & B <script>alert(1)</script>')}]),faq_items:plain([{question:plain('Live <Frage>?'),answer:richField('Rich Antwort')}]),specifications:richField('Zusätzliche echte Details'),care:richField('Aktuelle Pflege'),short_description:richField('Rich Kurztext')};
  const dom=await knowledge(p);try{
    const document=dom.window.document;assert.equal(document.querySelector('.product-feature h3').textContent,'<b>Literal title</b>');assert.equal(document.querySelector('.product-feature h3 b'),null);
    assert.equal(document.querySelector('.product-feature strong').textContent,'Rich Feature & text');assert.equal(document.querySelector('.product-topic strong').textContent,'Rich Alltag');assert.equal(document.querySelector('.product-faq-item strong').textContent,'Rich Antwort');
    assert.equal(document.querySelector('.product-facts dt').textContent,'Live <label>');assert.equal(document.querySelector('.product-facts dd').textContent,'A & B <script>alert(1)</script>');assert.equal(document.querySelector('script'),null);
    assert.equal(document.querySelector('.product-knowledge-lead strong').textContent,'Rich Kurztext');assert.match(document.querySelector('#ProductDetails').textContent,/Zusätzliche echte Details/);assert.match(document.querySelector('#ProductDetails').textContent,/Aktuelle Pflege/);
    assert(!document.body.textContent.includes('[object Object]'));
  }finally{dom.window.close();}
});

test('intro priority is explicit live short description, legacy short HTML, then the complete native first paragraph',async()=>{
  const p=product({description:'<p>Nativer erster Absatz mit allen Worten.</p><p>Nativer weiterer Absatz.</p>'});p.metafields.custom_fields.small_description=plain('<p>Legacy <strong>HTML</strong> &amp; Füsse</p>','multi_line_text_field');p.metafields.upswing.short_description=richField('Vorrangiger neuer Text');
  let dom=new JSDOM(await engine.renderFile('product-intro',{product:p}));try{assert.match(dom.window.document.body.textContent,/Vorrangiger neuer Text/);assert(!dom.window.document.body.textContent.includes('Legacy'));assert(dom.window.document.querySelector('strong'));}finally{dom.window.close();}
  delete p.metafields.upswing.short_description;
  dom=new JSDOM(await engine.renderFile('product-intro',{product:p}));try{assert.equal(dom.window.document.body.textContent.trim(),'Legacy HTML & Füsse');assert.equal(dom.window.document.querySelector('strong'),null);assert(!dom.window.document.body.textContent.includes('&amp;'));}finally{dom.window.close();}
  p.metafields.custom_fields.small_description=richField('Rich Legacy Kurzinfo');
  dom=new JSDOM(await engine.renderFile('product-intro',{product:p}));try{assert.equal(dom.window.document.querySelector('strong').textContent,'Rich Legacy Kurzinfo');}finally{dom.window.close();}
  delete p.metafields.custom_fields.small_description;
  dom=new JSDOM(await engine.renderFile('product-intro',{product:p}));try{assert.equal(dom.window.document.body.textContent.trim(),'Nativer erster Absatz mit allen Worten.');}finally{dom.window.close();}
});

test('unknown JSON content and empty rich-text fields never masquerade as product facts',async()=>{
  const p=product({description:'<p>Der native Inhalt bleibt die verlässliche Quelle.</p>'});
  p.metafields.upswing={short_description:plain({text:'Unbekannte JSONstruktur'},'json'),knowledge_heading:plain({text:'Nicht interpretieren'},'json'),knowledge_intro:plain({text:'Nicht interpretieren'},'json'),care:plain({instructions:'Nicht interpretieren'},'json'),suitability:richField(''),faq_items:plain([{question:plain('Frage ohne Inhalt?'),answer:richField('')}])};
  p.metafields.upswing.suitability.value.children=[];p.metafields.upswing.faq_items.value[0].answer.value.children=[];
  p.metafields.custom_fields.small_description=plain({de_CH:'Unbekannte Quelle'},'json');
  const dom=await knowledge(p);try{
    const document=dom.window.document;
    assert.equal(document.querySelector('#ProductInformationTitle').textContent,'Produkt verstehen.');assert.equal(document.querySelector('.product-knowledge-lead'),null);
    assert.equal(document.querySelector('#ProductEveryday'),null);assert.equal(document.querySelector('#ProductDetails'),null);assert.equal(document.querySelector('#ProductQuestions'),null);
    assert.equal(document.querySelector('[data-native-product-description]').innerHTML,p.description);assert(!document.body.textContent.includes('[object Object]'));assert(!document.body.textContent.includes('Nicht interpretieren'));
  }finally{dom.window.close();}
  const intro=new JSDOM(await engine.renderFile('product-intro',{product:p}));try{assert.equal(intro.window.document.body.textContent.trim(),'Der native Inhalt bleibt die verlässliche Quelle.');}finally{intro.window.close();}
});

test('existing aico attributes preserve valid text, zero, decimals and false while lists override scalar fields',async()=>{
  const p=product();p.metafields.aico_metafields={ober_material:plain('Alter Einzelwert'),ober_material_list:plain(['Leder','', 'Mesh & Textil'],'list.single_line_text_field'),maschinenwaschbar:plain(false,'boolean'),geklebte_sohle:plain(true,'boolean'),gewicht:plain(0,'number_integer'),intensitaet:plain(1.5,'number_decimal'),groessen_list:plain([36,37,0],'list.number_integer'),nur_leer:plain('   '),unbekanntes_objekt:plain({value:'Nicht ausgeben'},'json'),falsches_objekt:plain({value:'Nicht ausgeben'},'single_line_text_field'),nur_leere_liste:plain(['',' '],'list.single_line_text_field')};
  const dom=await knowledge(p);try{
    const rows=[...dom.window.document.querySelectorAll('.product-facts > div')];const values=Object.fromEntries(rows.map(row=>[row.querySelector('dt').textContent,row.querySelector('dd').textContent]));
    assert.deepEqual(values,{'Ober material':'Leder, Mesh & Textil',Maschinenwaschbar:'Nein','Geklebte sohle':'Ja',Gewicht:'0',Intensitaet:'1.5',Groessen:'36, 37, 0'});
    assert(!dom.window.document.body.textContent.includes('Alter Einzelwert'));assert(!dom.window.document.body.textContent.includes('_list'));assert(!dom.window.document.body.textContent.includes('Nicht ausgeben'));assert(!dom.window.document.body.textContent.includes('[object Object]'));
    assert.equal(dom.window.document.querySelector('[data-native-product-description]').innerHTML,p.description);
  }finally{dom.window.close();}
});

test('valid structured technical facts take priority while invalid lists fall back to live legacy attributes',async()=>{
  const p=product();p.metafields.aico_metafields={material:plain('Legacy live'),material_list:plain({bad:'unknown'},'json')};p.metafields.upswing.technical_specs=plain([{label:plain('Neue Bezeichnung'),value:plain('Neuer gepflegter Wert')}]);
  let dom=await knowledge(p);try{assert.equal(dom.window.document.querySelector('.product-facts dt').textContent,'Neue Bezeichnung');assert.equal(dom.window.document.querySelector('.product-facts dd').textContent,'Neuer gepflegter Wert');assert(!dom.window.document.body.textContent.includes('Legacy live'));}finally{dom.window.close();}
  p.metafields.upswing.technical_specs.value=[{label:plain('Ohne Wert'),value:plain('')}];
  dom=await knowledge(p);try{assert.equal(dom.window.document.querySelector('.product-facts dt').textContent,'Material');assert.equal(dom.window.document.querySelector('.product-facts dd').textContent,'Legacy live');assert(!dom.window.document.body.textContent.includes('Ohne Wert'));}finally{dom.window.close();}
});

test('empty rich-text and NBSP-only sources do not block lower-priority live intro text',async()=>{
  const p=product({description:'<p>&nbsp;</p><P class="blank">&#160; </P><p>Erster sichtbarer Shopabsatz mit allen Worten.</p><p>Späterer Absatz.</p>'});
  p.metafields.upswing.short_description={type:'rich_text_field',value:{type:'root',children:[]}};
  p.metafields.custom_fields.small_description=plain('<p>&nbsp; </p>','multi_line_text_field');
  let dom=new JSDOM(await engine.renderFile('product-intro',{product:p}));try{assert.equal(dom.window.document.body.textContent.trim(),'Erster sichtbarer Shopabsatz mit allen Worten.');}finally{dom.window.close();}
  p.metafields.custom_fields.small_description=plain('<p>Gepflegte Legacy-Kurzinfo.</p>','multi_line_text_field');
  dom=new JSDOM(await engine.renderFile('product-intro',{product:p}));try{assert.equal(dom.window.document.body.textContent.trim(),'Gepflegte Legacy-Kurzinfo.');}finally{dom.window.close();}
  p.metafields.upswing.short_description={type:'rich_text_field',value:{type:'root',children:[{type:'paragraph',children:[{type:'text',value:' '}]}]}};
  dom=new JSDOM(await engine.renderFile('product-intro',{product:p}));try{assert.equal(dom.window.document.body.textContent.trim(),'Gepflegte Legacy-Kurzinfo.');}finally{dom.window.close();}
});
