const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
// Independent source text fingerprints captured from the public original pages
// on 24 November 2026. Whitespace is ignored, but no editorial words are omitted.
const evidence = {
  "kybun": {
    "hero": "Der Schuh mit dem Trampolin Effekt",
    "faq_count": 10,
    "faq_sha256": "acdcd0073829b914824829193c1cb4fdc79d8ce68aa0cc42602b4aa40c41ab62",
    "detail_sha256": "17a1a8a229592dcc5ac53d7ae3b16de5f88959ad60669ac18e19683f5e448492",
    "benefits_sha256": "a051d7778c8e7e24bec0fcea2771be3b1523985ccbe7a8edfc5019fcda0eccfc",
    "trust_sha256": "a646c72356b9e923e004c6e5f00e0084cf78532604fbef800f4d749cacaa7f5e"
  },
  "joya": {
    "hero": "Gesunde Dämpfung weniger Schmerz",
    "faq_count": 10,
    "faq_sha256": "acdcd0073829b914824829193c1cb4fdc79d8ce68aa0cc42602b4aa40c41ab62",
    "detail_sha256": "070e6fc962d7e1353d5e5eb12c162c737a40d0f55cd106c8f732d29f76886cc4",
    "benefits_sha256": "5a630b91fd1ea682b1e186f4e1de2f6f8125b777d6797ebc7bf61317a81c3e61",
    "trust_sha256": "a646c72356b9e923e004c6e5f00e0084cf78532604fbef800f4d749cacaa7f5e"
  },
  "leguano": {
    "hero": "Natürlich barfuss - leicht, flexibel, bequem",
    "faq_count": 10,
    "faq_sha256": "a59bd3da35164f8dbd6da679185d217047745f80463118d27daa79661e7590d1",
    "detail_sha256": "0e8f3deb30c9bf428c07d868fcc90118b6bb6de3fe31c322a27bfb2f096196ba",
    "benefits_sha256": "9b0c27f9e14de58ea01d576002cd3667a7d18d8cc3cda24ceb1c44b5a8bac130",
    "trust_sha256": "a646c72356b9e923e004c6e5f00e0084cf78532604fbef800f4d749cacaa7f5e"
  },
  "kingnature": {
    "hero": "Natürliche Vitalität für Ihr Wohlbefinden",
    "faq_count": 10,
    "faq_sha256": "dd16273b538e597d78205dd41cc8c8dc2e83fc562717f160ff2701a11362c921",
    "detail_sha256": "4e2ab313bc4fca802371cff9c7fcc94abe79d2729b5f64cf0ce7f3f4a2bce5d5",
    "benefits_sha256": "96c0495454d79d59d013cb77eb6eb5be38e573bbbe0f8242adb01604794d3da7",
    "trust_sha256": "2483c77d55c86fd31492734cb298f89b3db22a8fdedf938c900e96d7cedcce36"
  },
  "anders": {
    "hero": "Mehr Komfort und Beweglichkeit im Alltag",
    "faq_count": 2,
    "faq_sha256": "a9b46302622e49f0d34db495f8c5cb35d4e6fc5df65e4eb7d10efeb3d8cf7d98",
    "detail_sha256": "d1c3ee49119fa57fa6cca043ae0ffc3dd729588b7fb31537d7ce1981172efea4",
    "benefits_sha256": "7c91f7d169f9aedc370efa5afb740f2959ed1d6fc509465f2152852c2e731d02",
    "trust_sha256": "c0ad07f9e20c5f698a674783efbfb6f39feac59ce2db952dc63ce77155f7d398"
  },
  "venenengel": {
    "hero": "Leichte Beine durch spürbare Gleitwellenmassage",
    "faq_count": 9,
    "faq_sha256": "76cbe86f9f9cc0451c3ac91b2177f28b30842cd17a7fd0e057fea2ae49d519b4",
    "detail_sha256": "4ed44029c1d8f53831f119cfd1d466e3218ac338528fd3b58cf2ed68d0ea2830",
    "benefits_sha256": "53db5d907827cb3604d4ff50417782d071a1da2a3624630c115caa12710bac81",
    "trust_sha256": "c3865bad053b5f08093900a7421185ad15336952789420575291e84f348b5bfd"
  },
  "elten": {
    "hero": "Maximale Sicherheit, spürbarer Tragekomfort am Arbeitsplatz",
    "faq_count": 10,
    "faq_sha256": "14d86ca920da5804051e5bfe32ddb413ecc6dcc717a8b8030714ddc783a693dd",
    "detail_sha256": "f0847cfec00c1e50cefa501122f16ebbfb67383714ad835f06c2dbc0a572eda9",
    "benefits_sha256": "2273337a73344b54292bdc9ba7a42c74a2332717f2a2ec69bd69586bedca5ae9",
    "trust_sha256": "a646c72356b9e923e004c6e5f00e0084cf78532604fbef800f4d749cacaa7f5e"
  },
  "bellabambi": {
    "hero": "Faszientraining durch spürbaren Unterdruck",
    "faq_count": 10,
    "faq_sha256": "b12394ee4e68d0c7ffe1dd44271080c1bb81f6fa5fda51c6d6484775f0ddc775",
    "detail_sha256": "080e17a3764cb567b79def7a4450af6e5847c6ae1259d2b9da6597891c0c3aec",
    "benefits_sha256": "8dce81076010cdd17304fa4431f89cf5d1fe7df5f02b633a99f2e7695b810b50",
    "trust_sha256": "c5413734ddc7ca61e120501786dd71287fa1a208781ba75b5ca57a8986375954"
  },
  "bellicon": {
    "hero": "Gelenkschonendes Schwingen für maximale Vitalität",
    "faq_count": 10,
    "faq_sha256": "29ee987b0621d68992d83ee1920a352499b963ed01e7ac1b48e9615c684d5e20",
    "detail_sha256": "b3c562fa4fa17e757cd09256fb92fd20cca09ab40589766f969e6ad71a5a26cf",
    "benefits_sha256": "1a75863344c9046bca298c411c1ebd3c763a1a7907cb9415ebdd043f6db819bf",
    "trust_sha256": "aa15312b18d28155680dbf5aca107f32bc0ce4091c453341c4bd00708b37bfa5"
  },
  "blackroll": {
    "hero": "Faszientraining und Regeneration für Muskeln sowie Gewebe",
    "faq_count": 10,
    "faq_sha256": "eab2c58ab0838f4a9f9ed1b8c311d747ec8d0e85af20b9527d0a69f1352f1268",
    "detail_sha256": "71c545e97fda59f8e8a61a7ea0f5ca1686ff0aa2f5a5eb6bf55c27f173b99752",
    "benefits_sha256": "de1e9115b9706d59358e63d9b69498f07fe2844ddbf8f89f39118efe25e90db4",
    "trust_sha256": "63e9878888fcb7351b3f366f2560c1fc2d9ac060805eeba5a57ddf158220cd7d"
  },
  "theraband": {
    "hero": "Maximale Trainingsvielfalt für Zuhause und unterwegs.",
    "faq_count": 8,
    "faq_sha256": "d42890a300f698b166ba7d20c889ce4b6bf7c985280efe67c849814ba98153c0",
    "detail_sha256": "0e6ddb961c2b40f758165adf909d11fb524c0a6b8336b140d2d2199709edbb35",
    "benefits_sha256": "cf41fcbed87d0661dca9a1f766031b70bedbfe39038daac2b818fc39eb4309fd",
    "trust_sha256": "0b9345a90ce3be5a3daa9d5142100fc90634a7092de5023dd31fa81af484018f"
  },
  "pepup": {
    "hero": "Natürliche Pflege für deine Lieblingsstücke",
    "faq_count": 8,
    "faq_sha256": "57b6596a825bc25694ccfeb4c3a3925a4385a347d04f6969d9636e02f36e297d",
    "detail_sha256": "1915de3193227528c92c4791a766b54f23174baf1380faa195df0fb426ccf592",
    "benefits_sha256": "66f97716c0a90bf87cc1a35b565316dc159c223874c4cae80e8f7b6d5e3a03dd",
    "trust_sha256": "714b3652f0774a1e4d5b81d5ffdbbc2fd62407137a980d5d7d30798a7b62bf18"
  }
};
const collectionHandles = {
  kybun:'kybun-schuhe', joya:'joya-schuhe', leguano:'leguano-barfussschuhe',
  kingnature:'kingnature', anders:'anders-1', venenengel:'venen-engel-massagegerate',
  elten:'elten-sicherheitsschuhe', bellabambi:'bella-bambi',
  blackroll:'blackroll-faszientraining', theraband:'therabander-loops', pepup:'pepup-1',
};
const fingerprint = value => createHash('sha256').update(value.replace(/\s+/g, '')).digest('hex');
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function engine() {
  // The configurator has its own live-resource and interaction suite. This
  // isolated adapter tests its placement, leaving the real brand/catalogue HTML.
  const nativeFs = new Liquid().options.fs;
  const adapt = (file, source) => path.basename(file) === 'venen-engel-configurator.liquid'
    ? '<section data-venen-engel-configurator></section>' : source;
  const liquid = new Liquid({root:path.join(root, 'snippets'), extname:'.liquid', strictFilters:true,
    fs:{...nativeFs, readFile:async file => adapt(file, await nativeFs.readFile(file)), readFileSync:file => adapt(file, nativeFs.readFileSync(file))}});
  liquid.registerFilter('file_img_url', filename => 'https://upswing.ch/cdn/shop/files/' + encodeURIComponent(filename) + '?width=1600');
  liquid.registerFilter('asset_url', name => `/assets/${name}`);
  liquid.registerFilter('image_url', image => image?.src || image?.url || '');
  liquid.registerFilter('image_tag', url => `<img src="${escape(url)}">`);
  liquid.registerFilter('placeholder_svg_tag', () => '<svg data-placeholder></svg>');
  liquid.registerFilter('money', value => `CHF ${(Number(value) / 100).toFixed(2)}`);
  liquid.registerFilter('money_with_currency', value => `CHF ${(Number(value) / 100).toFixed(2)}`);
  liquid.registerFilter('metafield_tag', field => escape(field?.value));
  return liquid;
}
function context(handle, extra = {}) {
  return {page:{id:12, handle, title:handle, content:''}, section:{id:'BrandQA', settings:{}},
    routes:{root_url:'/'}, collections:{}, pages:{}, all_products:{}, settings:{}, shop:{currency:'CHF'}, ...extra};
}
async function render(handle, extra = {}) {
  const data=context(handle,extra);
  return new JSDOM(await engine().renderFile('migrated-brand-pages', data, {globals:data}));
}

test('all 12 exact brands retain every original answered FAQ, benefit, trust fact and complete detail story', async () => {
  assert.equal(Object.keys(evidence).length, 12);
  for (const [handle, source] of Object.entries(evidence)) {
    const dom = await render(handle);
    try {
      const doc = dom.window.document;
      assert.equal(doc.querySelectorAll('.migrated-brand-page').length, 1, handle);
      assert.equal(doc.querySelectorAll('h1').length, 1, handle);
      assert.equal(doc.querySelector('h1').textContent, source.hero, handle);
      const faq = doc.querySelector('.migration-faq');
      assert.equal(faq.querySelectorAll('details').length, source.faq_count, handle);
      for (const icon of faq.querySelectorAll('[aria-hidden]')) icon.remove();
      const faqText = [...faq.querySelectorAll('details')].map(item => item.textContent).join('');
      assert.equal(fingerprint(faqText), source.faq_sha256, `${handle}: full FAQ words and order`);
      assert.equal(fingerprint(doc.querySelector('.migration-story').textContent), source.detail_sha256, `${handle}: entire original detail story`);
      assert.equal(fingerprint(doc.querySelector('.migration-benefits').textContent), source.benefits_sha256, `${handle}: all benefits`);
      assert.equal(fingerprint(doc.querySelector('.migration-trust').textContent), source.trust_sha256, `${handle}: all trust facts`);
      assert.equal(doc.querySelectorAll('.migration-benefits .migration-benefit').length, 4, handle);
      assert.equal(doc.querySelectorAll('.migration-trust .migration-benefit').length, ['anders','bellabambi','blackroll','theraband'].includes(handle)?3:4, handle);
      assert.ok(doc.querySelector('.migration-brand-hero-media > img'), handle);
      assert.ok(doc.querySelector('.migration-brand-logo img'), handle);
      for (const image of doc.querySelectorAll('img')) {
        assert.ok(Number(image.getAttribute('width')) > 0 && Number(image.getAttribute('height')) > 0, `${handle}: natural image proportions`);
        assert.ok(image.src.startsWith('https://upswing.ch/cdn/shop/files/'), `${handle}: actual original editorial images`);
      }
      assert.equal(doc.querySelector('[style],rte-formatter,[class*="upswing-benefits"],script,iframe'), null, `${handle}: no legacy styles/scripts`);
    } finally {dom.window.close();}
  }
});

test('brand catalogue cards always use current native product data and hide absent catalogue resources', async () => {
  for (const [handle, collectionHandle] of Object.entries(collectionHandles)) {
    const product = {id:78, handle:'current-live-model', title:'Aktuelles Modell aus Shopify', url:'/products/current-live-model',
      price:12345, price_min:12345, price_max:12345, available:true, description:'<p>Aktuell synchronisierter Text.</p>', images:[], metafields:{}};
    const collection = {id:91, url:'/collections/current-verified-destination', title:'Aktuelle Shopify Kollektion', products_count:1, products:[product]};
    const dom = await render(handle, {collections:{[collectionHandle]:collection}});
    try {
      const doc = dom.window.document;
      const catalogue = doc.querySelector('.migration-products');
      assert.ok(catalogue, handle);
      assert.equal(catalogue.querySelectorAll('[data-product-card]').length, 1, handle);
      assert.equal(catalogue.querySelector('.product-title').textContent, product.title, handle);
      assert.ok(catalogue.textContent.includes('CHF 123.45'), handle);
      assert.ok(catalogue.querySelector('a[href="/products/current-live-model"]'), handle);
      assert.ok(catalogue.querySelector('a[href="/collections/current-verified-destination"]'), handle);
      assert.equal(catalogue.querySelector('[data-featured-count]').dataset.featuredCount, '4', handle);
    } finally {dom.window.close();}
    const missing = await render(handle);
    try {
      assert.equal(missing.window.document.querySelector('.migration-products,[data-product-card]'), null, handle);
      assert.equal(missing.window.document.querySelector(`a[href="/collections/${collectionHandle}"]`), null, handle);
    } finally {missing.window.close();}
  }
});

test('actual affiliate, expert and booking content is preserved without inventing unavailable destinations', async () => {
  const booking = {id:33, url:'/de/pages/bellicon-beratung-buchen'};
  const dom = await render('bellicon', {pages:{'bellicon-beratung-buchen':booking}});
  try {
    const doc = dom.window.document;
    assert.ok(doc.querySelector('a[href="https://www.bellicon.com/?acc=upswing_Thun&a_bid=f1c026c9"]'));
    assert.ok(doc.querySelector('a[href="/de/pages/bellicon-beratung-buchen"]'));
    assert.equal(doc.querySelector('a[href="https://www.upswing.ch/Beratungstermin-buchen"]'), null);
    assert.equal(doc.querySelector('.migration-products'), null, 'bellicon has no fabricated collection');
  } finally {dom.window.close();}
  const missing = await render('bellicon');
  try {assert.equal(missing.window.document.querySelector('a[href*="bellicon-beratung-buchen"]'), null);} finally {missing.window.close();}
  const joya = await render('joya');
  try {
    assert.ok(joya.window.document.body.textContent.includes('«Dank der weich-elastischen Sohle ist der Joya Schuh besonders gelenkschonend. Auch Gesunde profitieren davon.»'));
    assert.ok(joya.window.document.body.textContent.includes('PD Dr. med. Andreas L. Oberholzer, Facharzt für Orthopädie und Unfallchirurgie FMH, Zürich'));
  } finally {joya.window.close();}
});

test('Venen Engel keeps one dedicated live configurator between trust and locations', async () => {
  const dom = await render('venenengel');
  try {
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('[data-venen-engel-configurator]').length, 1);
    const widget = doc.querySelector('[data-venen-engel-configurator]');
    const following = doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING;
    assert.ok(doc.querySelector('.migration-trust').compareDocumentPosition(widget) & following);
    assert.ok(widget.compareDocumentPosition(doc.querySelector('.migration-locations')) & following);
  } finally {dom.window.close();}
});

test('documented source defects do not become wrong-brand headings or empty FAQ controls', async () => {
  const dom = await render('leguano');
  try {
    const doc = dom.window.document;
    assert.ok(doc.querySelector('.migration-locations').textContent.includes('Besuche uns in deiner Nähe'));
    assert.ok(!doc.querySelector('.migration-locations').textContent.includes('kybun anprobieren'));
    assert.ok(!doc.querySelector('.migration-faq').textContent.includes('Was zeichnet leguano Barfussschuhe aus?'));
    for (const detail of doc.querySelectorAll('.migration-faq details')) assert.ok(detail.querySelector('.rte').textContent.trim());
  } finally {dom.window.close();}
});

test('unsupported routes never receive an inferred brand body', async () => {
  for (const handle of ['unbekannt', 'KYBUN', 'kybun-schuhe', 'joya-outlet', '']) {
    const dom = await render(handle);
    try {assert.equal(dom.window.document.body.innerHTML.trim(), '', handle);} finally {dom.window.close();}
  }
  const router = readFileSync(path.join(root, 'snippets/migrated-brand-pages.liquid'), 'utf8');
  assert.doesNotMatch(router, /page\.title\s+contains|all_products\[page|page\.content\s*=/);
});
