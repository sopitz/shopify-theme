const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');

async function render(name, {image, logo, logoWidth = 180} = {}) {
  const requests = [];
  const nativeRequests = [];
  const engine = new Liquid({root:path.join(root,'snippets'),extname:'.liquid',strictFilters:true});
  engine.registerFilter('asset_url', filename => `/assets/${filename}`);
  engine.registerFilter('asset_img_url', (filename, size) => {
    requests.push({filename,size});
    return `/assets/${filename.replace(/(\.[^.]+)$/, `_${size}$1`)}`;
  });
  engine.registerFilter('image_url', (selected, ...attributes) => {
    assert.ok(selected?.src, 'merchant image must remain an actual selected image');
    nativeRequests.push({selected, ...Object.fromEntries(attributes)});
    return selected.src;
  });
  engine.registerFilter('image_tag', (url, ...attributes) => {
    const attrs = Object.fromEntries(attributes);
    return `<img src="${escape(url)}" ${Object.entries(attrs).map(([key,value]) => `${key}="${escape(value)}"`).join(' ')}>`;
  });
  engine.registerFilter('stylesheet_tag', url => `<link rel="stylesheet" href="${url}">`);
  engine.registerFilter('payment_type_svg_tag', () => '');
  engine.registerFilter('handleize', value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g,'-'));
  const source = readFileSync(path.join(root,'sections',`${name}.liquid`),'utf8');
  const schema = JSON.parse(source.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
  const defaults = Object.fromEntries((schema.settings || []).filter(field => 'default' in field).map(field => [field.id,field.default]));
  const context = {
    section:{id:'ImageQA',settings:{...defaults,image},blocks:[]},
    settings:{logo,logo_width:logoWidth}, shop:{name:'upswing & Beratung'},cart:{item_count:0},request:{design_mode:false},
    routes:{root_url:'/',all_products_collection_url:'/collections/all',cart_url:'/cart',search_url:'/search'}, collections:{},pages:{},
  };
  const markup = await engine.parseAndRender(source.replace(/{% schema %}[\s\S]*?{% endschema %}/,''),context,{globals:context});
  return {dom:new JSDOM(markup),requests,nativeRequests};
}

const cases = [
  {section:'home-hero',selector:'.hero-media>img',filename:'hero-mobile.jpg',width:1000,height:1250,loading:'eager',highest:1122},
  {section:'advice-banner',selector:'.advice-media>img',filename:'shop-thun.jpg',width:1200,height:800,loading:'lazy',highest:1400},
  {section:'header',selector:'.site-logo>img',filename:'upswing-logo.png',width:180,height:58,loading:'eager',highest:460},
  {section:'footer',selector:'.footer-brand>a>img',filename:'upswing-logo.png',width:160,height:44,loading:'lazy',highest:460},
];

for (const item of cases) test(`${item.section}: original bundled image has genuinely resized responsive candidates and retains presentation`, async () => {
  const {dom,requests} = await render(item.section);
  try {
    const image = dom.window.document.querySelector(item.selector);
    assert.ok(image);
    assert.equal(Number(image.getAttribute('width')),item.width);
    assert.equal(Number(image.getAttribute('height')),item.height);
    assert.equal(image.getAttribute('loading'),item.loading);
    assert.ok(image.getAttribute('sizes')?.includes('px'));
    assert.notEqual(image.getAttribute('src'),`/assets/${item.filename}`,'default request must no longer download the unresized asset');
    const candidates = image.getAttribute('srcset').split(',').map(value => value.trim().match(/^(.+) (\d+)w$/));
    assert.ok(candidates.every(Boolean));
    const widths = candidates.map(([,url,width]) => {
      assert.equal(url,`/assets/${item.filename.replace(/(\.[^.]+)$/, `_${width}x$1`)}`,'descriptor must match the actual CDN requested width');
      assert.doesNotMatch(url,/format=|quality=|crop=/);
      return Number(width);
    });
    assert.deepEqual(widths,[...new Set(widths)].sort((a,b) => a-b));
    assert.equal(widths.at(-1),item.highest,'retain the full original resolution for high-density screens');
    assert.ok(requests.every(request => request.filename===item.filename));
    if (item.section==='home-hero') assert.equal(image.getAttribute('fetchpriority'),'high');
    else assert.equal(image.getAttribute('fetchpriority'),null);
    assert.ok(image.alt);
  } finally {dom.window.close();}
});

test('hero and advice keep the selected merchant photo and native image_url responsive delivery', async () => {
  for (const [section,selector] of [['home-hero','.hero-media>img'],['advice-banner','.advice-media>img']]) {
    const selected = {src:'/shopify/actual-selected-photo.jpg',alt:'Eigenes Motiv'};
    const {dom,requests,nativeRequests} = await render(section,{image:selected});
    try {
      assert.equal(dom.window.document.querySelector(selector).getAttribute('src'),selected.src);
      assert.equal(nativeRequests[0].selected,selected);
      assert.ok(nativeRequests[0].width>=1400,'keep high-density merchant-image resolution');
      assert.equal(requests.length,0,'a selected photo cannot silently switch to the default asset');
      assert.match(dom.window.document.querySelector(selector).getAttribute('sizes'),/min-width: 1400px/);
    } finally {dom.window.close();}
  }
});

test('merchant logo selection and small configured width remain authoritative', async () => {
  const selected = {src:'/shopify/selected-logo.png'};
  const {dom,nativeRequests} = await render('header',{logo:selected,logoWidth:70});
  try {
    const logo = dom.window.document.querySelector('.site-logo>img');
    assert.equal(logo.getAttribute('src'),selected.src);
    assert.equal(logo.getAttribute('width'),'70');
    assert.equal(logo.getAttribute('sizes'),'(max-width: 360px) 70px, (max-width: 600px) 70px, 70px');
    assert.equal(nativeRequests[0].selected,selected);
    assert.equal(nativeRequests[0].width,420);
  } finally {dom.window.close();}
});
