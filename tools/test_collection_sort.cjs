const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');
const {Liquid} = require('liquidjs');

const repo = path.resolve(__dirname, '..');
const runtime = readFileSync(path.join(repo, 'assets/upswing.js'), 'utf8');
const engine = new Liquid({root:path.join(repo, 'snippets'), extname:'.liquid'});
const sortOptions = [{value:'best-selling',name:'Bestseller'}, {value:'price-ascending',name:'Preis aufsteigend'}];
const filters = [
  {type:'list',param_name:'filter.p.vendor',label:'Marke',values:[
    {param_name:'filter.p.vendor',value:'kybun',label:'kybun',active:true,count:4},
    {param_name:'filter.p.vendor',value:'Joya',label:'Joya',active:true,count:2},
  ],active_values:[]},
  {type:'price_range',param_name:'filter.v.price',label:'Preis',range_max:98000,min_value:{param_name:'filter.v.price.gte',value:10000},max_value:{param_name:'filter.v.price.lte',value:65000},active_values:[]},
];

async function markup(kind, pageParam='page') {
  const isSearch = kind === 'search';
  const source = readFileSync(path.join(repo, 'sections', `main-${isSearch?'search':'collection'}.liquid`), 'utf8');
  const formAt = source.indexOf('<form class="filters-sidebar"');
  const form = source.slice(formAt, source.indexOf('</form>', formAt)+7);
  const sortAt = source.indexOf('<div class="sort-control">');
  const sort = source.slice(sortAt, source.indexOf('</div>', sortAt)+6);
  return engine.parseAndRender(form+sort, {
    collection:{url:'/de/collections/gesundheitsschuhe',filters,sort_options:sortOptions},
    search:{terms:'Aarau & Füsse',filters,sort_options:sortOptions},
    routes:{search_url:'/de/search'},
    current_sort:'best-selling',
    model_filters:['filter.p.vendor','filter.v.price'],
    visible_filter_count:0,
    cart:{currency:{iso_code:'CHF'}},
    settings:{group_model_search:true},
    section:{id:`Sort-${kind}`,settings:{model_collection:false}},
    paginate:{page_param:pageParam},
    consultation_url:'/de/pages/filialubersicht#Filialen',
    onsite_consultation_url:'/de/pages/filialubersicht#Filialen',
  });
}

function enableRuntime(dom) {
  const navigations=[];
  const location = {href:dom.window.location.href,origin:dom.window.location.origin,assign:href=>navigations.push(new URL(href))};
  vm.runInNewContext(runtime,{document:dom.window.document,window:{location},URL,console});
  return navigations;
}

for (const kind of ['collection','search']) {
  test(`${kind}: sorting immediately preserves applied GET state and resets pagination`, async () => {
    const route=kind==='search'?'/de/search':'/de/collections/gesundheitsschuhe';
    const query='filter.p.vendor=kybun&filter.p.vendor=Joya&filter.v.price.gte=100&filter.v.price.lte=650&sort_by=best-selling&page=3&per_page=48&limit=24&options%5Bprefix%5D=last&options%5Bunavailable_products%5D=last'+(kind==='search'?'&q=Aarau+%26+F%C3%BCsse&type=product&filter.p.m.upswing.model_primary=true':'');
    const dom=new JSDOM(`<html class="no-js"><body>${await markup(kind)}</body></html>`,{url:`https://example.myshopify.com${route}?${query}#Products`});
    try {
      const {document,Event}=dom.window;
      const select=document.querySelector('[data-sort-select]');
      const button=document.querySelector('[data-sort-apply]');
      assert.equal(button.hidden,false,'server markup keeps the native fallback');
      const navigations=enableRuntime(dom);
      assert.equal(button.hidden,true);
      assert.ok(select.form);
      document.body.dispatchEvent(new Event('shopify:section:load',{bubbles:true}));
      const checkbox=document.querySelector('input[type="checkbox"]');
      checkbox.checked=false;checkbox.dispatchEvent(new Event('change',{bubbles:true}));
      const max=document.querySelector('[name="filter.v.price.lte"]');
      max.value='900';max.dispatchEvent(new Event('change',{bubbles:true}));
      assert.equal(navigations.length,0,'filter edits are not automatically applied');
      select.value='price-ascending';select.dispatchEvent(new Event('change',{bubbles:true}));
      assert.equal(navigations.length,1,'section rebinding does not duplicate navigation');
      const destination=navigations[0],params=destination.searchParams;
      assert.equal(destination.pathname,route,'language-specific route stays intact');
      assert.equal(params.get('sort_by'),'price-ascending');
      assert.equal(params.has('page'),false);
      assert.deepEqual(params.getAll('filter.p.vendor'),['kybun','Joya']);
      assert.equal(params.get('filter.v.price.gte'),'100');
      assert.equal(params.get('filter.v.price.lte'),'650','unapplied price edits remain unapplied');
      assert.equal(params.get('per_page'),'48');assert.equal(params.get('limit'),'24');
      assert.equal(params.get('options[prefix]'),'last');assert.equal(params.get('options[unavailable_products]'),'last');
      assert.equal(destination.hash,'');
      if(kind==='search'){
        assert.equal(params.get('q'),'Aarau & Füsse');assert.equal(params.get('type'),'product');
        assert.equal(params.get('filter.p.m.upswing.model_primary'),'true');
      }
    } finally {dom.window.close();}
  });

  test(`${kind}: without JavaScript the existing GET form and external Apply button work`, async () => {
    const dom=new JSDOM(`<html class="no-js"><body>${await markup(kind)}</body></html>`,{url:'https://example.myshopify.com/'});
    try {
      const document=dom.window.document;
      const select=document.querySelector('[data-sort-select]');
      const button=document.querySelector('[data-sort-apply]');
      assert.equal(button.hidden,false);assert.equal(button.form,select.form);
      assert.equal(select.form.method,'get');
      select.value='price-ascending';
      const params=new URLSearchParams([...new dom.window.FormData(select.form)]);
      assert.equal(params.get('sort_by'),'price-ascending');
      assert.deepEqual(params.getAll('filter.p.vendor'),['kybun','Joya']);
      assert.equal(params.get('filter.v.price.gte'),'100');assert.equal(params.get('filter.v.price.lte'),'650');
      assert.equal(params.has('page'),false);
      if(kind==='search'){
        assert.equal(params.get('q'),'Aarau & Füsse');assert.equal(params.get('type'),'product');
        assert.equal(params.get('options[prefix]'),'last');assert.equal(params.get('filter.p.m.upswing.model_primary'),'true');
      }
    } finally {dom.window.close();}
  });
}

test('Shopify pagination parameter is cleared along with page',async () => {
  const dom=new JSDOM(await markup('collection','page_products'),{url:'https://example.myshopify.com/collections/all?page=2&page_products=4&per_page=24'});
  try {
    const navigations=enableRuntime(dom),select=dom.window.document.querySelector('[data-sort-select]');
    select.value='price-ascending';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
    assert.equal(navigations[0].searchParams.has('page'),false);assert.equal(navigations[0].searchParams.has('page_products'),false);
    assert.equal(navigations[0].searchParams.get('per_page'),'24');
  } finally {dom.window.close();}
});

test('An unassociated sorting select keeps its Apply fallback visible', () => {
  const dom=new JSDOM('<div class="sort-control"><select name="sort_by" data-sort-select><option value="best-selling">Bestseller</option></select><button data-sort-apply>Anwenden</button></div>',{url:'https://example.myshopify.com/collections/all'});
  try {
    enableRuntime(dom);assert.equal(dom.window.document.querySelector('[data-sort-apply]').hidden,false);
  } finally {dom.window.close();}
});
