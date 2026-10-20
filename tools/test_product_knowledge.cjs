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
async function main(p,settings={}){
  let source=fs.readFileSync(path.join(root,'sections/main-product.liquid'),'utf8').replace(/\{% schema %\}[\s\S]*?\{% endschema %\}/,'');
  source=source.replace(/{%-?\s*form\s[^%]+%}/g,'<form data-product-form>').replace(/{%-?\s*endform\s*-?%}/g,'</form>');
  return new JSDOM(await engine.parseAndRender(source,{product:p,settings,section:{id:'main',settings:{shipping_note:'Versand laut Händler',consultation_url:'/pages/filialubersicht'},blocks:[]},cart:{taxes_included:true},routes:{root_url:'/',all_products_collection_url:'/collections/all'},shop:{},form:{},all_products:{}},{globals:{settings}}));
}

test('the former Magglingen demo handle always renders the current complete native description',async()=>{
  const p=product({description:'<p>NEUE Shopdaten &amp; aktuelle Aussagen.</p><h2>Unabhängiger Titel</h2><ul><li>Erster aktueller Punkt</li><li>Letzter aktueller Punkt</li></ul><p>Letzter Absatz <a href="/products/pflege">mit Live-Link</a>.</p>'});
  const dom=await knowledge(p);try{
    assert.equal(dom.window.document.querySelector('[data-native-product-description]').innerHTML,p.description);
    assert.equal(dom.window.document.querySelector('.product-feature-grid'),null);
    assert.equal(dom.window.document.querySelector('.product-faq'),null);
    assert.equal(dom.window.document.querySelector('[data-native-product-description]').closest('details'),null,'A description without structured content remains visible');
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
    assert(!document.querySelector('#ProductOverview').textContent.includes('Alternative Vorteile'),'Benefits must remain separate from explained features');
    assert.equal(document.querySelector('[data-native-product-description]').innerHTML,p.description,'Partial structured information cannot remove any original description content');
  }finally{dom.window.close();}
});

test('each valid structured information source collapses the complete unchanged native description in an operable native disclosure',async()=>{
  const description='<p>Vollständige <strong>Originaleinleitung</strong> &amp; Angaben.</p><h2>Eigene Details</h2><ul><li>Erster Punkt</li><li>Letzter Punkt</li></ul><p><a href="/products/aktuelle-pflege">Aktueller Produktlink</a></p>';
  const cases=[
    ['features',p=>{p.metafields.upswing.features=plain([{title:'Gepflegte Eigenschaft',body:'<p>Erklärung aus dem Produkt.</p>'}],'json');}],
    ['topics',p=>{p.metafields.upswing.everyday_topics=plain([{title:'Gepflegtes Thema',body:'<p>Aktuelle Anwendung.</p>'}],'json');}],
    ['suitability',p=>{p.metafields.upswing.suitability=richField('Aktuelle Eignung');}],
    ['practical',p=>{p.metafields.upswing.care=richField('Aktuelle Pflege');}],
    ['questions',p=>{p.metafields.upswing.faq_items=plain([{question:'Aktuelle Frage?',answer:'<p>Aktuelle Antwort.</p>'}],'json');}],
    ['technical',p=>{p.metafields.upswing.technical_specs=plain([{label:plain('Merkmal'),value:plain('Tatsächlicher Wert')}],'list.metaobject_reference');}],
    ['existing AICO technical',p=>{p.metafields.aico_metafields={material:plain('Aktuelles Material')};}],
  ];
  for(const [name,configure] of cases){
    const p=product({description});configure(p);
    const dom=await knowledge(p);try{
      const document=dom.window.document;
      const section=document.querySelector('#ProductDescription');
      const details=section.querySelector('details.product-native-description-details');
      const article=section.querySelector('[data-native-product-description]');
      assert.ok(details,name);
      assert.equal(details.open,false,name);
      assert.equal(details.hasAttribute('open'),false,name);
      assert.equal(details.querySelector('summary').textContent,'Vollständige Produktbeschreibung',name);
      assert.equal(article.closest('details'),details,name);
      assert.equal(article.innerHTML,description,name);
      assert.equal(document.querySelectorAll('[data-native-product-description]').length,1,name);
      assert.equal(document.querySelectorAll('#ProductDescription').length,1,name);
      assert.equal(document.querySelector('a[href="#ProductDescription"]').getAttribute('href'),'#ProductDescription',name);
      details.querySelector('summary').click();
      assert.equal(details.open,true,'The complete description remains available through native summary activation');
      assert.equal(article.innerHTML,description,name);
    }finally{dom.window.close();}
  }
});

test('no valid structured areas leaves the original description expanded even with benefits, intro or rejected records',async()=>{
  const cases=[
    p=>{},
    p=>{p.metafields.upswing.benefits=plain(['Gepflegter Vorteil'],'list.single_line_text_field');},
    p=>{p.metafields.upswing.knowledge_intro=plain('Kurze Einleitung');p.metafields.upswing.short_description=plain('Kurzbeschreibung');},
    p=>{p.metafields.upswing={features:plain([{title:'Ohne Body',body:''}],'json'),everyday_topics:plain([{body:'<p>Ohne Titel.</p>'}],'json'),faq_items:plain([{question:'Ohne Antwort?'}],'json'),care:plain('  '),suitability:{type:'rich_text_field',value:{type:'root',children:[]}},technical_specs:plain([{label:plain('Ohne Wert'),value:plain('')}],'list.metaobject_reference')};},
  ];
  for(const configure of cases){
    const p=product();configure(p);
    const dom=await knowledge(p);try{
      const document=dom.window.document,article=document.querySelector('[data-native-product-description]');
      assert.equal(article.innerHTML,p.description);
      assert.equal(article.parentElement.id,'ProductDescription');
      assert.equal(article.closest('details'),null);
      assert.equal(document.querySelector('.product-native-description-details'),null);
      assert(!document.body.textContent.includes('Vollständige Produktbeschreibung'));
    }finally{dom.window.close();}
  }
});

test('structured content without a native description cannot create an empty description disclosure',async()=>{
  const p=product({description:''});p.metafields.upswing.features=plain([{title:'Aktuelles Merkmal',body:'<p>Aktuelle Erklärung.</p>'}],'json');
  const dom=await knowledge(p);try{assert.ok(dom.window.document.querySelector('#ProductOverview'));assert.equal(dom.window.document.querySelector('#ProductDescription, .product-native-description-details, [data-native-product-description]'),null);}finally{dom.window.close();}
});

test('empty and unpublished structured records never create fake claims, empty sections or broken detail links',async()=>{
  const p=product({description:''});p.metafields.upswing={features:plain([null,{}, {title:plain(''),body:plain('')}]),benefits:plain(['','   '],'list.single_line_text_field'),everyday_topics:plain([{}]),technical_specs:plain([{label:plain(''),value:plain('')}]),faq_items:plain([{question:plain(''),answer:plain('')}]),care:plain(''),suitability:plain(''),specifications:plain('')};
  const dom=await main(p);try{
    assert.equal(dom.window.document.querySelector('#ProductInformation'),null);assert.equal(dom.window.document.querySelector('.description-jump'),null);assert.equal(dom.window.document.querySelector('.product-benefits'),null);
    assert.equal(dom.window.document.querySelector('.product-info h1').textContent,p.title);
  }finally{dom.window.close();}
});

test('benefits stay near the price without creating duplicate feature cards or replacing the description',async()=>{
  const p=product();p.metafields.upswing.benefits=plain(['',' ',{},[],false,42,'Erster', 'Zweiter','Dritter','Vierter','Fünfter'],'list.single_line_text_field');
  let dom=await main(p);try{assert.deepEqual([...dom.window.document.querySelectorAll('.product-benefits li')].map(node=>node.textContent.trim()),['Erster','Zweiter','Dritter','Vierter','Fünfter']);assert.equal(dom.window.document.querySelector('#ProductOverview'),null);assert.equal(dom.window.document.querySelector('[data-native-product-description]').innerHTML,p.description);}finally{dom.window.close();}
  p.metafields.upswing.benefits=plain(['Nicht als typisierte Vorteilsliste veröffentlicht'],'json');
  dom=await main(p);try{assert.equal(dom.window.document.querySelector('.product-benefits, #ProductOverview'),null);assert.equal(dom.window.document.querySelector('[data-native-product-description]').innerHTML,p.description);}finally{dom.window.close();}
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

const categorySettings={main_category_footwear_tags:'category_126, category_231',main_category_workplace_tags:'category_152',main_category_regeneration_tags:'category_131',main_category_training_tags:'category_130'};
async function knowledgeWithSettings(p,settings=categorySettings){return new JSDOM(await engine.renderFile('product-knowledge',{product:p,consultation_url:'/pages/filialubersicht'},{globals:{settings}}));}

test('AICO JSON lists render features, topics and questions with their HTML bodies and skip incomplete entries',async()=>{
  const p=product();
  p.metafields.upswing={
    features:plain([{label:'Material',title:'Material <und> Verarbeitung',body:'<p>Leder mit <strong>Membran</strong>.</p>'},{title:'Ohne Text',body:'<p>&nbsp;</p>'},{title:'',body:''},'kein Objekt',{title:'Objektbody',body:{nicht:'ausgeben'}}],'json'),
    everyday_topics:plain([{title:'Wirkung und Gehgefühl',body:'<p>Weich <a href="/pages/joya">federnd</a>.</p>'},{title:'',body:'<p></p>'}],'json'),
    faq_items:plain([{question:'Was bedeutet STX?',answer:'<p>Sympatex-Membran.</p>'},{question:'Ohne Antwort?',answer:''},{question:'',answer:'<p>Ohne Frage.</p>'}],'json')
  };
  const dom=await knowledge(p);try{
    const document=dom.window.document;
    const features=[...document.querySelectorAll('.product-feature')];
    assert.deepEqual(features.map(feature=>feature.querySelector('h3')?.textContent),['Material <und> Verarbeitung']);
    assert.equal(features[0].querySelector('.product-feature-number').textContent,'Material');
    assert.equal(features[0].querySelector('strong').textContent,'Membran');
    assert.equal(features.length,1,'Missing, invisible and structured bodies cannot create incomplete cards');
    assert.equal(document.querySelector('.product-topic h3').textContent,'Wirkung und Gehgefühl');
    assert.equal(document.querySelector('.product-topic a').getAttribute('href'),'/pages/joya');
    assert.equal(document.querySelectorAll('.product-topic').length,1);
    assert.deepEqual([...document.querySelectorAll('.product-faq-item summary')].map(summary=>summary.firstChild.textContent),['Was bedeutet STX?']);
    assert(!document.body.textContent.includes('[object Object]'));assert(!document.body.textContent.includes('ausgeben'));assert(!document.body.textContent.includes('kein Objekt'));
    assert.equal(document.querySelector('[data-native-product-description]').innerHTML,p.description);
  }finally{dom.window.close();}
});

test('JSON content lists require arrays and never interpret strings, wrappers or scalar values as entries',async()=>{
  const entry={title:'Kein Arraytitel',body:'<p>Kein Arraytext.</p>',question:'Keine Arrayfrage?',answer:'<p>Keine Arrayantwort.</p>'};
  for(const value of [null,{},entry,{items:[entry]},JSON.stringify([entry]),'[]',42,true]){
    const p=product();p.metafields.upswing={features:plain(value,'json'),everyday_topics:plain(value,'json'),faq_items:plain(value,'json'),benefits:plain(['Vorteil bleibt am Preis'],'list.single_line_text_field')};
    const dom=await knowledge(p);try{
      const document=dom.window.document;
      assert.equal(document.querySelector('#ProductOverview, #ProductEveryday, #ProductQuestions'),null,JSON.stringify(value));
      assert.equal(document.querySelector('[data-native-product-description]').innerHTML,p.description);
      assert(!document.body.textContent.includes('Kein Array'));
      assert(!document.body.textContent.includes('Vorteil bleibt am Preis'));
      assert(!document.body.textContent.includes('[object Object]'));
    }finally{dom.window.close();}
  }
});

test('JSON titles, labels and questions accept only nonempty strings and skip incomplete records',async()=>{
  const invalid=[null,{},['Liste'],{text:'Objekt'},42,true,'','  ',' '];
  const p=product();p.metafields.upswing={
    knowledge_heading:plain({text:'Kein Überschriftenobjekt'}),knowledge_intro:plain(['Kein Leadobjekt'],'multi_line_text_field'),
    features:plain([
      ...invalid.map(title=>({title,body:'<p>Nur mit gültigem Titel.</p>'})),
      {title:'Gültiges Merkmal',label:'  Live-Label  ',body:'<p>Aktueller Merkmalstext.</p>'},
      {title:'Gültig ohne optionales Label',label:{text:'Kein Labelobjekt'},body:'<p>Weiterer Merkmalstext.</p>'},
      {title:'Ohne Erklärung',body:''},{title:'Leere Erklärung',body:'<p>&nbsp;</p>'},{title:'Objekt als Erklärung',body:{html:'<p>Objekt</p>'}},
      'Kein Eintragsobjekt',[],false,
    ],'json'),
    everyday_topics:plain([
      ...invalid.map(title=>({title,body:'<p>Nur mit gültigem Thementitel.</p>'})),
      {title:'Gültiges Thema',body:'<p>Aktueller Thementext.</p>'},{title:'Ohne Thementext',body:''},{body:'<p>Ohne Titel.</p>'},
    ],'json'),
    faq_items:plain([
      ...invalid.map(question=>({question,answer:'<p>Nur mit gültiger Frage.</p>'})),
      {question:'Gültige Frage?',answer:'<p>Aktuelle Antwort.</p>'},{question:'Ohne Antwort?',answer:'<p></p>'},{answer:'<p>Ohne Frage.</p>'},
    ],'json'),
  };
  const dom=await knowledge(p);try{
    const document=dom.window.document;
    assert.equal(document.querySelector('#ProductInformationTitle').textContent,'Produkt verstehen.');
    assert.equal(document.querySelector('.product-knowledge-lead'),null);
    assert.deepEqual([...document.querySelectorAll('.product-feature h3')].map(node=>node.textContent),['Gültiges Merkmal','Gültig ohne optionales Label']);
    assert.equal(document.querySelector('.product-feature-number').textContent,'Live-Label');
    assert.equal(document.querySelectorAll('.product-feature-number[aria-hidden="true"]').length,1,'A malformed optional label is omitted without discarding an otherwise complete feature');
    assert.deepEqual([...document.querySelectorAll('.product-topic h3')].map(node=>node.textContent),['Gültiges Thema']);
    assert.deepEqual([...document.querySelectorAll('.product-faq-item summary')].map(node=>node.firstChild.textContent),['Gültige Frage?']);
    assert(!document.body.textContent.includes('[object Object]'));
    assert(!document.body.textContent.includes('Kein Labelobjekt'));
    assert(!document.body.textContent.includes('Nur mit gültigem'));
    assert.equal(document.querySelector('[data-native-product-description]').innerHTML,p.description);
  }finally{dom.window.close();}
});

test('legacy metaobject records also require a text title and visible body while optional labels cannot leak objects',async()=>{
  const p=product();p.metafields.upswing={
    features:plain([{title:plain({text:'Objekt'}),body:plain('Text')},{title:plain('Ohne Body'),body:plain('')},{title:plain('Vollständiges Merkmal'),label:plain(['Kein Label']),body:plain('Aktueller Text')}],'list.metaobject_reference'),
    everyday_topics:plain([{title:plain({text:'Objekt'}),body:plain('Text')},{title:plain('Vollständiges Thema'),body:plain('Aktueller Alltag')}],'list.metaobject_reference'),
    faq_items:plain([{question:plain({text:'Objekt'}),answer:plain('Text')},{question:plain('Vollständige Frage?'),answer:plain('Aktuelle Antwort')}],'list.metaobject_reference'),
  };
  const dom=await knowledge(p);try{
    const document=dom.window.document;
    assert.deepEqual([...document.querySelectorAll('.product-feature h3')].map(node=>node.textContent),['Vollständiges Merkmal']);
    assert.deepEqual([...document.querySelectorAll('.product-topic h3')].map(node=>node.textContent),['Vollständiges Thema']);
    assert.equal(document.querySelector('.product-faq-item summary').firstChild.textContent,'Vollständige Frage?');
    assert(!document.body.textContent.includes('[object Object]'));
    assert(!document.body.textContent.includes('Kein Label'));
  }finally{dom.window.close();}
});

test('the size-guide anchor exists only when its actual content is visible',async()=>{
  const p=product();p.metafields.upswing={care:plain('Gepflegte Pflegehinweise'),size_guide:plain('  ')};
  let dom=await knowledge(p);try{assert.equal(dom.window.document.querySelector('#ProductSizeGuide'),null);assert.match(dom.window.document.querySelector('.product-practical').textContent,/Gepflegte Pflegehinweise/);}finally{dom.window.close();}
  p.metafields.upswing.size_guide=richField('Aktuelle Auswahlhilfe');
  dom=await knowledge(p);try{assert.equal(dom.window.document.querySelectorAll('article#ProductSizeGuide').length,1);assert.match(dom.window.document.querySelector('#ProductSizeGuide').textContent,/Aktuelle Auswahlhilfe/);}finally{dom.window.close();}
});

test('selection-help links target the real guide and stay absent when no visible guide exists',async()=>{
  for(const [tags,label] of [[['category_231'],'Hilfe bei der Grösse'],[['category_152'],'Hilfe bei der Auswahl']]){
    const p=product({tags,has_only_default_variant:false});p.metafields.upswing.size_guide=richField('Veröffentlichte Auswahlhilfe');
    const dom=await main(p,categorySettings);try{
      const document=dom.window.document,link=document.querySelector('.product-selection-help');
      assert.equal(link.textContent,label);
      assert.equal(link.getAttribute('href'),'#ProductSizeGuide');
      assert.equal(document.querySelectorAll(link.getAttribute('href')).length,1);
      assert.match(document.querySelector(link.getAttribute('href')).textContent,/Veröffentlichte Auswahlhilfe/);
    }finally{dom.window.close();}
  }
  for(const field of [undefined,plain('  '),plain({html:'Nicht als Text veröffentlicht'},'json'),{type:'rich_text_field',value:{type:'root',children:[]}}]){
    const p=product({has_only_default_variant:false});p.metafields.upswing.size_guide=field;
    const dom=await main(p,categorySettings);try{assert.equal(dom.window.document.querySelector('.product-selection-help, #ProductSizeGuide'),null);}finally{dom.window.close();}
  }
});

test('section headings follow the main category from the configured product tags',async()=>{
  const fields=()=>({suitability:richField('Eignung'),introduction:richField('Start'),size_guide:richField('Grösse'),care:richField('Pflege'),everyday_topics:plain([{title:'Thema',body:'<p>Text</p>'}],'json'),faq_items:plain([{question:'Frage?',answer:'<p>Antwort</p>'}],'json')});
  const headings=document=>({navigation:document.querySelector('a[href="#ProductEveryday"]').textContent,everyday:document.querySelector('#ProductEveryday h2').textContent,suitability:document.querySelector('.product-suitability h3').textContent,practical:[...document.querySelectorAll('.product-practical h3')].map(h=>h.textContent),faq:document.querySelector('#ProductQuestionsTitle').textContent});
  const cases=[
    [['category_231'],{navigation:'Gehgefühl',everyday:'Im Alltag.',suitability:'Für wen und wofür?',practical:['Eingewöhnung','Passform und Grössenwahl','Schuhpflege'],faq:'Fragen zu diesem Modell.'}],
    [['category_130'],{navigation:'Training',everyday:'Trainingsmöglichkeiten.',suitability:'Trainingsziel und Voraussetzungen',practical:['Aufbau und erster Einsatz','Passende Ausführung auswählen','Reinigung, Wartung und Aufbewahrung'],faq:'Fragen zur Nutzung.'}],
    [['category_130','category_131'],{navigation:'Anwendung',everyday:'Nutzung im Alltag.',suitability:'Eignung und wichtige Einschränkungen',practical:['Erste Anwendung','Passform und Kompatibilität','Reinigung und Lagerung'],faq:'Fragen zum Artikel.'}],
    [['category_130','category_152'],{navigation:'Arbeitsalltag',everyday:'Einbindung in den Arbeitstag.',suitability:'Passender Arbeitsplatz',practical:['Aufstellung und Einrichtung','Passende Grösse und Ausführung','Reinigung und Wartung'],faq:'Fragen zum Arbeitsalltag.'}],
    [['category_1260','sonstiges'],{navigation:'Alltag',everyday:'Im Alltag.',suitability:'Für wen passend?',practical:['Anwendung & Eingewöhnung','Grösse & Passform','Pflege'],faq:'Fragen & Antworten.'}]
  ];
  for(const [tags,expected] of cases){
    const p=product({tags});p.metafields.upswing=fields();
    const dom=await knowledgeWithSettings(p);try{assert.deepEqual(headings(dom.window.document),expected,tags.join(','));assert.equal(dom.window.document.querySelectorAll('#ProductSizeGuide').length,1);assert.equal(dom.window.document.querySelector('#ProductSizeGuide h3').textContent,expected.practical[1]);}finally{dom.window.close();}
  }
  const p=product({tags:['category_126']});p.metafields.upswing=fields();
  const dom=await knowledgeWithSettings(p,{});try{assert.equal(dom.window.document.querySelector('.product-suitability h3').textContent,'Für wen passend?','Without configured tags the neutral headings remain');}finally{dom.window.close();}
});
