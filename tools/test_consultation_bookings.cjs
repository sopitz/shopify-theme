const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {Liquid} = require('liquidjs');
const {JSDOM} = require('jsdom');
const {readThemeJson} = require('./read_theme_json.cjs');

const root = path.resolve(__dirname, '..');
const source = readFileSync(path.join(root, 'sections/consultation-bookings.liquid'), 'utf8');
const schema = JSON.parse(source.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
const defaults = Object.fromEntries(schema.settings.filter(field => 'default' in field).map(field => [field.id, field.default]));
const template = name => readThemeJson(path.join(root, `templates/page.${name}.json`)).sections.main;
const engine = new Liquid({root: path.join(root, 'snippets'), extname: '.liquid', strictFilters: true});
engine.registerFilter('asset_url', name => `/assets/${name}`);
engine.registerFilter('stylesheet_tag', url => `<link rel="stylesheet" href="${url}">`);

async function render(definition, editor=false) {
  const blocks = (definition.block_order || []).map(id => ({id, ...definition.blocks[id]}));
  const markup = await engine.parseAndRender(source.replace(/{% schema %}[\s\S]*?{% endschema %}/, ''), {
    section: {id: 'BookingQA', settings: {...defaults, ...definition.settings}, blocks},
    page: {title: 'Beratung', content: '<form>Ein altes Formular nicht übernehmen</form>'},
    request: {design_mode: editor}, routes: {root_url: '/'},
  });
  return new JSDOM(markup);
}

test('consultation templates show all three real booking subjects and five locations each without a contact form', async () => {
  for (const name of ['beratung', 'termine']) {
    const dom = await render(template(name));
    try {
      const document = dom.window.document;
      const cards = [...document.querySelectorAll('.consultation-booking-card')];
      assert.deepEqual(cards.map(card => card.querySelector('h2').textContent), ['Venen Engel', 'bellicon', 'BLACKROLL Matratze']);
      assert.equal(document.querySelectorAll('form, input, iframe, script').length, 0);
      assert.equal(document.querySelectorAll('h1').length, 1);
      assert.equal(document.querySelector('[href="/assets/consultation-bookings.css"]').tagName, 'LINK');
      for (const card of cards) {
        const links = [...card.querySelectorAll('.consultation-booking-locations a')];
        assert.deepEqual(links.map(link => link.querySelector('span').textContent), ['Thun', 'Zürich', 'Winterthur', 'Rüti ZH', 'Basel']);
        for (const link of links) {
          const url = new URL(link.href);
          assert.equal(url.protocol, 'https:');
          assert.ok(['outlook.office365.com', 'outlook.office.com'].includes(url.hostname));
          assert.ok(decodeURIComponent(url.pathname).includes('@upswing.ch'));
          assert.equal(link.target, '_blank');
          assert.equal(link.rel, 'noopener noreferrer');
          assert.ok(link.querySelector('.visually-hidden').textContent.includes(card.querySelector('h2').textContent));
        }
      }
    } finally {dom.window.close();}
  }
});

test('booking URLs remain bound to each exact topic and location rather than using one general calendar', async () => {
  const definition = template('beratung');
  const dom = await render(definition);
  try {
    const cards = [...dom.window.document.querySelectorAll('.consultation-booking-card')];
    const keys = ['thun_url', 'zurich_url', 'winterthur_url', 'ruti_url', 'basel_url'];
    for (const [index, id] of definition.block_order.entries()) {
      const links = [...cards[index].querySelectorAll('.consultation-booking-locations a')];
      assert.deepEqual(links.map(link => link.getAttribute('href')), keys.map(key => definition.blocks[id].settings[key]));
    }
    assert.equal(new Set(cards.flatMap(card => [...card.querySelectorAll('.consultation-booking-locations a')].map(link => link.href))).size, 15);
  } finally {dom.window.close();}
});

test('missing and non-HTTPS destinations have no enabled booking links or invented fallback', async () => {
  const definition = structuredClone(template('beratung'));
  const first = definition.blocks.venen_engel.settings;
  first.thun_url = '';
  first.zurich_url = 'javascript:alert(1)';
  first.winterthur_url = 'http://outlook.office365.com/not-secure';
  first.ruti_url = undefined;
  const dom = await render(definition);
  try {
    const firstCard = dom.window.document.querySelector('.consultation-booking-card');
    const links = [...firstCard.querySelectorAll('a')];
    assert.equal(links.length, 1);
    assert.equal(links[0].getAttribute('href'), first.basel_url);
    assert.doesNotMatch(firstCard.textContent, /Thun|Zürich|Winterthur|Rüti/);
  } finally {dom.window.close();}
});

test('empty topics are omitted and a useful merchant hint appears only in the Theme Editor', async () => {
  const definition = {settings: {}, blocks: {}, block_order: []};
  for (const editor of [false, true]) {
    const dom = await render(definition, editor);
    try {
      assert.equal(dom.window.document.querySelector('.consultation-booking-card'), null);
      assert.equal(Boolean(dom.window.document.querySelector('.consultation-bookings-empty')), editor);
      assert.equal(dom.window.document.querySelector('form'), null);
    } finally {dom.window.close();}
  }
});

test('merchant titles and destination attributes are escaped while editorial description formatting is preserved', async () => {
  const definition = structuredClone(template('beratung'));
  definition.settings.heading = 'Beratung <script>nicht ausführen</script>';
  definition.blocks.venen_engel.settings.title = 'Venen Engel <b>testen</b>';
  definition.blocks.venen_engel.settings.description = '<p>Vor Ort <strong>ausprobieren</strong>.</p>';
  definition.blocks.venen_engel.settings.thun_url = 'https://example.test/book?topic=massage&location="thun"';
  const dom = await render(definition);
  try {
    const document = dom.window.document;
    assert.equal(document.querySelector('h1').textContent, definition.settings.heading);
    assert.equal(document.querySelector('h1 script, h2 b'), null);
    const card = document.querySelector('.consultation-booking-card');
    assert.equal(card.querySelector('h2').textContent, definition.blocks.venen_engel.settings.title);
    assert.equal(card.querySelector('.rte strong').textContent, 'ausprobieren');
    assert.equal(card.querySelector('a').getAttribute('href'), definition.blocks.venen_engel.settings.thun_url);
  } finally {dom.window.close();}
});

test('the real contact page keeps its native Shopify contact form and its existing template', () => {
  const contact = readThemeJson(path.join(root, 'templates/page.contact.json'));
  assert.equal(contact.sections.main.type, 'main-contact');
  const contactSource = readFileSync(path.join(root, 'sections/main-contact.liquid'), 'utf8');
  assert.match(contactSource, /{% form 'contact', id: contact_form_id/);
  assert.match(contactSource, /name="contact\[body\]"/);
});
