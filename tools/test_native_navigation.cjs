const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');
const {Liquid} = require('liquidjs');

const repo = path.resolve(__dirname, '..');
const engine = new Liquid({root:path.join(repo, 'snippets'), extname:'.liquid', strictFilters:true});
engine.registerFilter('asset_url', name => `/assets/${name}`);
engine.registerFilter('image_url', image => image.src);
engine.registerFilter('image_tag', url => `<img src="${url}" alt="">`);
engine.registerFilter('payment_type_svg_tag', () => '<svg></svg>');
engine.registerFilter('handleize', value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

const routes = {
  root_url:'/de/', search_url:'/de/search', predictive_search_url:'/de/search/suggest',
  account_url:'/de/account', cart_url:'/de/cart', collections_url:'/de/collections',
  all_products_collection_url:'/de/collections/all',
};
function link(title, url, extra={}) { return {title, url, type:'http_link', links:[], ...extra}; }
function context(links=[], extra={}) {
  return {
    routes, settings:{logo_width:160}, shop:{name:'Testshop', customer_accounts_enabled:true}, cart:{item_count:2},
    request:{design_mode:false}, collections:{}, all_products:{},
    section:{id:'Header', settings:{menu:{links}, about_label:'Über uns', guide_label:'Wissen & Ratgeber'}, blocks:[]},
    ...extra,
  };
}
async function sectionMarkup(name, values) {
  const source = readFileSync(path.join(repo, 'sections', `${name}.liquid`), 'utf8').split('{% schema %}')[0];
  return engine.parseAndRender(source, values, {globals:values});
}
async function headerDocument(links=[], extra={}) {
  const dom = new JSDOM(await sectionMarkup('header', context(links, extra)));
  return dom.window.document;
}

test('flat Shopify menus keep their configured links and titles in desktop and mobile navigation', async () => {
  const links = [link('Trainingsgeräte', '/de/collections/neu-benannt'), link('Vitalität', '/de/products/neues-produkt')];
  const values = context(links);
  values.section.settings.use_original_fallback = true; // An obsolete saved value cannot replace a native menu.
  const document = await headerDocument(links, values);
  for (const selector of ['.desktop-navigation', '#MobileNavigation']) {
    const nav = document.querySelector(selector);
    assert.equal(nav.querySelector('[href="/de/collections/neu-benannt"]').textContent, 'Trainingsgeräte');
    assert.equal(nav.querySelector('[href="/de/products/neues-produkt"]').textContent, 'Vitalität');
    assert.equal(nav.querySelector('[href*="/collections/kybun-schuhe"]'), null);
    assert.equal(nav.querySelector('[href="/pages/gesundheitsschuhe"]'), null);
  }
});

test('renamed nested collections use the current Shopify target, label and image', async () => {
  const child = link('Neu im Alltag', '/de/collections/alltag-neu', {type:'collection_link', object:{image:{src:'/shopify/current-collection.jpg'}}});
  const document = await headerDocument([link('Unser Sortiment', '/de/collections', {links:[child]})]);
  for (const selector of ['.desktop-navigation .mega-card', '#MobileNavigation .mobile-nav-link']) {
    const card = document.querySelector(`${selector}[href="${child.url}"]`);
    assert.ok(card);
    assert.equal(card.textContent.trim(), child.title);
    assert.equal(card.querySelector('img').getAttribute('src'), '/shopify/current-collection.jpg');
  }
  assert.equal(document.querySelector('[src*="nav-schuhe-"]'), null);
});

test('third-level links join the regular card grid with full native titles while preserving menu nesting and targets', async () => {
  const titles = ['Venen Engel Massagegeräte', 'Venen Engel Zubehör', 'Venen Engel Mietgeräte', 'Venen Engels Beratung', 'Tipps für Venen Engel', 'Venen Engel', 'Venen Engel Zubehör & <Pflege>'];
  const grandchildren = titles.map((title, index) => link(title, `/de/collections/engel-${index}?view=nav&sort_by=title`, {
    current:index === 1, type:'collection_link', object:{image:{src:`/shopify/grandchild-${index}.jpg`}},
  }));
  const child = link('Venen Engel', '/de/collections/venen-engel', {links:grandchildren, type:'collection_link', object:{image:{src:'/shopify/venen-engel.jpg'}}});
  const links = [link('Regeneration', '/de/collections/regeneration', {links:[child, link('Schlafen', '/de/collections/schlafen')]})];
  const originalMenu = JSON.stringify(links);
  const document = await headerDocument(links);
  for (const selector of ['.desktop-navigation .mega-submenu-link', '#MobileNavigation .mobile-nav-sublink']) {
    const anchors = [...document.querySelectorAll(selector)];
    assert.deepEqual(anchors.map(anchor => anchor.textContent.trim()), titles);
    assert.deepEqual(anchors.map(anchor => anchor.getAttribute('aria-label')), titles);
    assert.deepEqual(anchors.map(anchor => anchor.getAttribute('href')), grandchildren.map(item => item.url));
    assert.deepEqual(anchors.map(anchor => anchor.getAttribute('aria-current')), titles.map((_, index) => index === 1 ? 'page' : null));
    if (selector.startsWith('.desktop-navigation')) {
      assert.deepEqual(anchors.map(anchor => anchor.querySelector('img').getAttribute('src')), grandchildren.map((_, index) => `/shopify/grandchild-${index}.jpg`));
      assert.ok(anchors.every(anchor => anchor.querySelector('.mega-card-title').childElementCount === 0), 'Card titles remain escaped text');
      assert.ok(anchors.every(anchor => anchor.parentElement.parentElement.matches('ul.mega-submenu')));
    } else {
      assert.ok(anchors.every(anchor => anchor.childElementCount === 0), 'Mobile third-level links remain escaped text without thumbnails');
    }
  }
  assert.equal(document.querySelector('.mega-card-title').textContent, 'Venen Engel');
  assert.equal(document.querySelector('.mega-card img').getAttribute('src'), '/shopify/venen-engel.jpg');
  assert.equal(document.querySelectorAll('.mega-card-grid > li').length, 2);
  assert.deepEqual([...document.querySelectorAll('.mega-card-grid .mega-card-title')].map(title => title.textContent), ['Venen Engel', ...titles, 'Schlafen']);
  assert.equal(JSON.stringify(links), originalMenu);
  const style = document.createElement('style');
  style.textContent = readFileSync(path.join(repo, 'assets/mega-menu.css'), 'utf8');
  document.head.append(style);
  const computedStyle = element => document.defaultView.getComputedStyle(element);
  assert.equal(computedStyle(document.querySelector('.mega-child--has-submenu')).display, 'contents');
  assert.equal(computedStyle(document.querySelector('.mega-submenu')).display, 'contents');
  for (const card of document.querySelectorAll('.mega-card-grid .mega-card')) {
    assert.equal(computedStyle(card).padding, '9px 10px');
    assert.equal(computedStyle(card.querySelector('.mega-card-media')).height, '96px');
  }
});

test('a blank main menu has only an editor onboarding prompt and keeps about, search, account and cart', async () => {
  for (const links of [[], undefined]) {
    for (const designMode of [false, true]) {
      const values = context([], {request:{design_mode:designMode}});
      values.section.settings.menu = links ? {links} : null;
      const document = await headerDocument([], values);
      assert.equal(document.querySelector('.desktop-navigation [href*="/collections/"], #MobileNavigation [href*="/collections/"]'), null);
      assert.equal(document.body.textContent.includes('Wählen Sie im Theme-Editor ein Hauptmenü aus.'), designMode);
      for (const selector of ['.desktop-navigation', '#MobileNavigation']) {
        const nav = document.querySelector(selector);
        assert.ok(nav.querySelector('[href="/pages/ueber-uns"]'));
        assert.ok(nav.querySelector('[href="/pages/geschichte"]'));
        assert.ok(nav.querySelector('[href="/pages/standort-thun"] img[src="/assets/about-thun-1.jpg"]'));
      }
      assert.equal(document.querySelectorAll('form[action="/de/search"]').length, 2);
      assert.ok(document.querySelector('[href="/de/account"]'));
      assert.equal(document.querySelector('[href="/de/cart"] [data-cart-count]').textContent, '2');
    }
  }
});

test('catalogue navigation never uses saved theme assets when current Shopify images are missing', async () => {
  for (const target of [
    link('Schuhe', '/collections/kybun-schuhe', {type:'collection_link', object:{}}),
    link('Produkt', '/products/altes-produkt', {type:'product_link', object:{}}),
    link('Katalog', routes.collections_url, {type:'catalog_link'}),
  ]) {
    const html = await engine.renderFile('header-navigation-image', context([], {
      nav_link:target, fallback_asset:'stale-passed-image.jpg',
      header_blocks:[{type:'menu_image', settings:{url:target.url, fallback_asset:'nav-schuhe-01.jpg'}}],
    }));
    const document = new JSDOM(html).window.document;
    assert.equal(document.querySelector('img'), null);
    assert.ok(document.querySelector('.nav-image-placeholder'));
  }
});

test('a current Shopify image survives an obsolete asset override, and an uploaded image can override it', async () => {
  const target = link('Neu', '/collections/neuer-handle?sort_by=title#Produkte', {type:'collection_link', object:{image:{src:'/shopify/current.jpg'}}});
  const values = context([], {
    nav_link:target,
    header_blocks:[{type:'menu_image', settings:{url:'/collections/neuer-handle', fallback_asset:'nav-schuhe-01.jpg'}}],
  });
  let document = new JSDOM(await engine.renderFile('header-navigation-image', values)).window.document;
  assert.equal(document.querySelector('img').getAttribute('src'), '/shopify/current.jpg');
  values.header_blocks[0].settings.image = {src:'/merchant/uploaded.jpg'};
  document = new JSDOM(await engine.renderFile('header-navigation-image', values)).window.document;
  assert.equal(document.querySelector('img').getAttribute('src'), '/merchant/uploaded.jpg');
});

test('real collection product images and native product images remain available without copied mappings', async () => {
  for (const [target, lookup, expected] of [
    [link('Kollektion', '/collections/new-collection', {type:'collection_link', object:{products:[{featured_image:{src:'/shopify/collection-product.jpg'}}]}}), {}, '/shopify/collection-product.jpg'],
    [link('Produkt', '/products/new-product'), {all_products:{'new-product':{featured_image:{src:'/shopify/product.jpg'}}}}, '/shopify/product.jpg'],
    [link('Kollektion', '/collections/new-collection'), {collections:{'new-collection':{image:{src:'/shopify/collection.jpg'}}}}, '/shopify/collection.jpg'],
  ]) {
    const html = await engine.renderFile('header-navigation-image', context([], {nav_link:target, ...lookup}));
    assert.equal(new JSDOM(html).window.document.querySelector('img').getAttribute('src'), expected);
  }
});

test('the footer shopping column follows its native menu or the generic localized all-products route', async () => {
  for (const links of [[link('Aktuelles Sortiment', '/de/collections/aktuelles-sortiment')], [], undefined]) {
    const values = context();
    values.section = {settings:{}, blocks:[{type:'shopping', settings:{heading:'Entdecken', menu:links ? {links} : null}}]};
    const document = new JSDOM(await sectionMarkup('footer', values)).window.document;
    const shoppingLinks = [...document.querySelectorAll('.footer-column a')];
    assert.deepEqual(shoppingLinks.map(anchor => [anchor.getAttribute('href'), anchor.textContent]), links?.length ? [['/de/collections/aktuelles-sortiment', 'Aktuelles Sortiment']] : [[routes.all_products_collection_url, 'Alle Produkte']]);
    assert.equal(document.querySelector('[href*="/collections/kybun-schuhe"], [href*="/collections/kybun-matten"], [href*="/collections/blackroll-faszientraining"]'), null);
  }
});
