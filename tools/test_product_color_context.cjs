const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, VirtualConsole} = require('jsdom');
const script = fs.readFileSync(path.join(__dirname, '../assets/product-media-context.js'), 'utf8');
const nativeScript = fs.readFileSync(path.join(__dirname, '../assets/upswing.js'), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 30));

test('Late legacy colours update the open viewer purchase controls without losing size or quantity', async () => {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(`<!doctype html><html><body><header class="site-header"></header>
    <section data-product-section data-product-media-context>
      <div data-product-overview>
        <div class="product-gallery"><div data-product-gallery-sticky><div class="product-gallery-main"><img data-product-image src="/black.jpg" alt="Aarau black"></div>
          <div>${['black','second','third','fourth'].map(name => `<button type="button" data-gallery-image="/${name}.jpg"><img src="/${name}-thumb.jpg"></button>`).join('')}</div>
        </div></div>
        <div class="product-info"><h1>Aarau black</h1><span data-product-price>CHF 330.00</span>
          <form data-product-form><fieldset data-option-group="1" data-option-name="Grösse"><legend>Grösse</legend>
            <input type="radio" id="size-42" name="options[Grösse]" value="42" data-option-select data-option-position="1"><label for="size-42">42</label>
            <input type="radio" id="size-43" name="options[Grösse]" value="43" data-option-select data-option-position="1" checked><label for="size-43">43</label>
          </fieldset><input name="quantity" type="number" min="1" value="3"><input name="id" value="1001" type="hidden">
          <p data-product-availability>Online verfügbar</p><button type="submit" class="enhanced-add-button"><span data-add-label>In den Warenkorb</span></button></form>
        </div>
      </div>
      <aside data-product-image-preview hidden><button data-image-preview-top><img data-context-image><span data-context-color>Aarau black</span></button><div class="product-image-preview-copy"><strong>Aarau black</strong></div><strong data-context-price>CHF 330.00</strong><span data-context-availability></span><div data-context-options></div><input data-context-quantity type="number" value="3" min="1"><button data-context-add><span data-context-add-label>In den Warenkorb</span></button><p data-context-error hidden></p></aside>
      <section id="ProductInformation"></section><div class="product-policies"></div>
    </section></body></html>`, {url:'https://example.test/products/kybun-aarau-black-women', runScripts:'outside-only', pretendToBeVisual:true, virtualConsole:console});
  const {window} = dom;
  const document = window.document;
  window.ResizeObserver = class {observe(){} disconnect(){}};
  window.matchMedia = () => ({matches:false});
  window.scrollTo = () => {};
  window.HTMLDialogElement.prototype.showModal = function(){this.open=true;};
  window.HTMLDialogElement.prototype.close = function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
  const warmCalls = []; let clearCalls = 0;
  window.upswingGalleryImagePreload = {create:() => ({warm:urls => warmCalls.push([...urls]), clear:() => clearCalls++, destroy(){}})};
  document.querySelectorAll('[data-gallery-image]').forEach(button => button.addEventListener('click', () => {document.querySelector('[data-product-image]').src = button.dataset.galleryImage;}));
  try {
    window.eval(script);
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    await tick();
    const size = document.querySelector('[data-context-options] select');
    assert.equal(size.value, '43');
    assert.equal(warmCalls.length, 0, 'A hidden viewer must not start full-size preloads during page sync');
    document.querySelector('[data-product-image-open]').click();
    const viewer = document.querySelector('[data-product-viewer]');
    assert.equal(viewer.open, true);
    assert.deepEqual(warmCalls.at(-1), ['/second.jpg','/fourth.jpg','/third.jpg']);
    viewer.querySelector('[data-viewer-next]').click();
    assert.equal(viewer.querySelector('[data-viewer-image]').getAttribute('src'), '/second.jpg');
    assert.deepEqual(warmCalls.at(-1), ['/third.jpg','/black.jpg','/fourth.jpg']);
    const colours = document.createElement('div');
    colours.className='model-colors';
    colours.innerHTML='<div class="swatches"><a href="/products/kybun-aarau-black-women" aria-current="page" title="Aarau black"><img src="/black.jpg"></a><a href="/products/kybun-aarau-blue-women" title="Aarau blue"><img src="/blue.jpg"></a></div>';
    document.querySelector('.product-info').prepend(colours);
    const root = document.querySelector('[data-product-section]');
    root.dispatchEvent(new window.CustomEvent('upswing:colors-ready', {bubbles:true}));
    await tick();
    assert.equal(viewer.open, true, 'An asynchronously resolved colour must not close the image viewer');
    assert.equal(document.querySelector('[data-context-options] select'), size, 'Keep the existing size control');
    assert.equal(size.value, '43');
    assert.equal(document.querySelector('[data-context-quantity]').value, '3');
    assert.equal(document.querySelector('form input[name="quantity"]').value, '3');
    assert.equal(viewer.querySelectorAll('[data-context-color-toggle]').length, 1);
    assert.deepEqual([...viewer.querySelectorAll('.product-context-color-choice')].map(e=>e.textContent), ['Aarau black','Aarau blue']);
    root.dispatchEvent(new window.CustomEvent('upswing:colors-ready', {bubbles:true}));
    await tick();
    assert.equal(viewer.querySelectorAll('[data-context-color-toggle]').length, 1, 'Repeated ready events must not duplicate colour controls');
    const beforeClose = warmCalls.length;
    document.querySelector('[data-viewer-close]').click();
    assert.equal(viewer.open, false);
    await tick();
    assert.equal(warmCalls.length, beforeClose, 'Restoring focus on close must not restart the pending preload queue');
    assert.ok(clearCalls > 0);
    assert.equal(document.querySelector('[data-product-image-preview] [data-context-options] select'), size);
    assert.equal(document.querySelector('[data-product-image-preview] [data-context-color-toggle]').textContent, 'Aarau black');
    assert.deepEqual(errors, []);
  } finally {dom.window.close();}
});

for (const picker of ['radio', 'select']) {
  for (const variantField of ['hidden', 'select']) {
    test(`An unavailable inherited shoe size clears ${picker} options and the ${variantField} variant field until a new selection`, async () => {
      const errors = [];
      const virtualConsole = new VirtualConsole();
      virtualConsole.on('jsdomError', error => errors.push(error));
      const choices = picker === 'radio'
        ? '<input type="radio" id="size-43" name="options[Grösse]" value="43" data-option-select data-option-position="1" checked><label for="size-43">43</label><input type="radio" id="size-44" name="options[Grösse]" value="44" data-option-select data-option-position="1"><label for="size-44">44</label>'
        : '<select name="options[Grösse]" data-option-select data-option-position="1"><option value="43" selected>43</option><option value="44">44</option></select>';
      const idField = variantField === 'hidden'
        ? '<input name="id" type="hidden" value="2043" data-variant-id>'
        : '<div data-variant-fallback><select name="id" data-variant-id><option value="2043" selected>43</option><option value="2044">44</option></select></div>';
      const variants = [43,44].map(size => ({id:2000 + size,options:[String(size)],available:true,price_formatted:'CHF 330.00'}));
      const dom = new JSDOM(`<!doctype html><html><body><header class="site-header"></header>
        <section data-product-section data-product-media-context data-product-context-kind="Damenschuhe">
          <div data-product-overview><div class="product-gallery"><div data-product-gallery-sticky><div class="product-gallery-main"><img data-product-image src="/blue.jpg" alt="Aarau blue"></div></div></div>
            <div class="product-info"><h1>Aarau blue</h1><span data-product-price>CHF 330.00</span>
              <form data-product-form data-high-variants="2"><fieldset data-option-group="1" data-option-name="Grösse"><legend>Grösse <span data-option-selected="1">43</span></legend>${choices}</fieldset>
                ${idField}<input name="quantity" type="number" value="1" min="1">
                <script type="application/json" data-variants>${JSON.stringify(variants)}</script>
                <p data-product-availability>Online verfügbar</p><button type="submit" class="enhanced-add-button"><span data-add-label>In den Warenkorb</span></button>
              </form>
            </div>
          </div>
          <aside data-product-image-preview hidden><button data-image-preview-top><img data-context-image><span data-context-color>Blau</span></button><div class="product-image-preview-copy"><strong>Aarau blue</strong></div><strong data-context-price>CHF 330.00</strong><span data-context-availability></span><div data-context-options></div><input data-context-quantity type="number" value="1" min="1"><button data-context-add><span data-context-add-label>In den Warenkorb</span></button><p data-context-error hidden></p></aside>
          <section id="ProductInformation"></section><div class="product-policies"></div>
        </section></body></html>`, {url:'https://example.test/products/kybun-aarau-blue-women',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
      const {window} = dom, document = window.document;
      window.ResizeObserver = class {observe(){} disconnect(){}};
      window.matchMedia = () => ({matches:false});
      window.scrollTo = () => {};
      window.HTMLDialogElement.prototype.showModal = function(){this.open=true;};
      window.HTMLDialogElement.prototype.close = function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
      window.sessionStorage.setItem('upswing-product-viewer-transition',JSON.stringify({at:Date.now(),path:window.location.pathname,action:'color',viewer:true,index:0,selections:[{name:'Grösse',label:'42'}],quantity:'3'}));
      try {
        window.eval(nativeScript);
        window.eval(script);
        document.dispatchEvent(new window.Event('DOMContentLoaded'));
        await tick();
        const form = document.querySelector('[data-product-form]');
        const id = form.querySelector('[name="id"]');
        const add = form.querySelector('.enhanced-add-button');
        const mirror = document.querySelector('[data-context-options] select');
        const viewer = document.querySelector('[data-product-viewer]');
        assert.equal(viewer.open,true,'Preserve the fullscreen viewer while requiring a new size');
        assert.equal(id.value,'','The target default variant must not remain selected');
        assert.equal(id.disabled,true,'An unconfirmed target default variant must not be submitted');
        assert.equal(add.disabled,true);
        assert.match(add.textContent,/Bitte Schuhgrösse neu wählen/);
        assert.equal(document.querySelector('[data-context-add]').disabled,true);
        assert.equal(mirror.value,'','The mirrored picker must not display the target default size');
        assert.equal(mirror.selectedOptions[0].textContent,'Bitte wählen');
        assert.equal(form.querySelector('input[name="quantity"]').value,'3','Keep the chosen quantity');
        if (picker === 'radio') assert.equal(form.querySelector('input[type="radio"]:checked'),null);
        else assert.equal(form.querySelector('select[data-option-select]').value,'');
        const control = picker === 'radio' ? form.querySelector('input[value="44"]') : form.querySelector('select[data-option-select]');
        if (picker === 'radio') control.checked = true;
        else control.value = '44';
        control.dispatchEvent(new window.Event('change',{bubbles:true}));
        await tick();
        assert.equal(id.value,'2044','A new explicit choice selects the actual target variant');
        assert.equal(id.disabled,false);
        assert.equal(add.disabled,false);
        assert.equal(document.querySelector('[data-context-add]').disabled,false);
        assert.equal(mirror.value,'44');
        assert.equal(viewer.open,true);
        assert.deepEqual(errors,[]);
      } finally {dom.window.close();}
    });
  }
}

for (const missingFeature of ['main-image-area', 'dialog-api']) {
  test(`Colour section replacement can prepare safely without ${missingFeature}`, async () => {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => errors.push(error));
    const dom = new JSDOM(`<!doctype html><html><body><header class="site-header"></header>
      <section data-product-section data-product-media-context>
        <div data-product-overview><div class="product-gallery"><div data-product-gallery-sticky><div${missingFeature === 'main-image-area' ? '' : ' class="product-gallery-main"'}><img data-product-image src="/black.jpg"></div></div></div>
          <div class="product-info"><h1>Aarau black</h1><span data-product-price>CHF 330.00</span>
            <form data-product-form><input name="id" type="hidden" value="1043"><input name="quantity" type="number" value="2" min="1"><button type="submit" class="enhanced-add-button"><span data-add-label>In den Warenkorb</span></button></form>
          </div>
        </div>
        <aside data-product-image-preview hidden><button data-image-preview-top><img data-context-image></button><div class="product-image-preview-copy"><strong>Aarau black</strong></div><strong data-context-price>CHF 330.00</strong><span data-context-availability></span><div data-context-options></div><input data-context-quantity type="number" value="2" min="1"><button data-context-add><span data-context-add-label>In den Warenkorb</span></button><p data-context-error hidden></p></aside>
        <section id="ProductInformation"></section><div class="product-policies"></div>
      </section></body></html>`, {url:'https://example.test/products/kybun-aarau-black-women',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
    const {window} = dom, document = window.document;
    window.ResizeObserver = class {observe(){} disconnect(){}};
    window.matchMedia = () => ({matches:false});
    window.scrollTo = () => {};
    if (missingFeature === 'dialog-api') window.HTMLDialogElement.prototype.showModal = undefined;
    else window.HTMLDialogElement.prototype.showModal = function(){this.open=true;};
    try {
      window.eval(script);
      document.dispatchEvent(new window.Event('DOMContentLoaded'));
      await tick();
      const root = document.querySelector('[data-product-section]');
      assert.doesNotThrow(() => window.upswingProductMedia.prepareColor(root,'/products/kybun-aarau-blue-women'));
      assert.equal(document.querySelector('[data-product-viewer]'),null,'An unavailable viewer retains the normal page flow');
      assert.equal(root.querySelector('form [name="id"]').value,'1043');
      assert.equal(root.querySelector('form [name="quantity"]').value,'2');
      assert.deepEqual(errors,[]);
    } finally {dom.window.close();}
  });
}

test('The mobile quick-buy bar waits for a measured original button to scroll entirely above the header',async()=>{
  const errors=[];
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error));
  const dom=new JSDOM(`<!doctype html><html><body><header class="site-header"></header>
    <section data-product-section data-product-media-context>
      <div data-product-overview><div class="product-gallery"><div data-product-gallery-sticky><div class="product-gallery-main"><img data-product-image src="/black.jpg"></div></div></div>
        <div class="product-info"><h1>Aarau black</h1><span data-product-price>CHF 330.00</span>
          <form data-product-form><input name="id" type="hidden" value="1043"><input name="quantity" type="number" value="1" min="1"><button type="submit" class="enhanced-add-button"><span data-add-label>In den Warenkorb</span></button></form>
        </div>
      </div>
      <aside class="product-image-preview" data-product-image-preview hidden><button data-image-preview-top><img data-context-image></button><div class="product-image-preview-copy"><strong>Aarau black</strong></div><strong data-context-price>CHF 330.00</strong><span data-context-availability></span><div data-context-options></div><input data-context-quantity type="number" value="1" min="1"><button data-context-add><span data-context-add-label>In den Warenkorb</span></button><p data-context-error hidden></p></aside>
      <section id="ProductInformation"></section><div class="product-policies"></div>
    </section></body></html>`,{url:'https://example.test/products/kybun-aarau-black-women',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
  const {window}=dom,document=window.document;
  window.ResizeObserver=class{observe(){} disconnect(){}};
  window.matchMedia=query=>({matches:query==='(max-width:600px)'});
  window.innerWidth=390;window.innerHeight=844;
  window.scrollTo=()=>{};
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
  const button=document.querySelector('.enhanced-add-button');
  const preview=document.querySelector('[data-product-image-preview]');
  const rectangle=(top,width=300,height=46)=>({top,left:20,right:20+width,bottom:top+height,width,height,x:20,y:top});
  let bounds=rectangle(0,0,0),hasBox=false;
  button.getBoundingClientRect=()=>bounds;
  button.getClientRects=()=>hasBox?[bounds]:[];
  document.querySelector('.site-header').getBoundingClientRect=()=>rectangle(0,390,100);
  const scroll=async(top,width=300,height=46,box=true)=>{bounds=rectangle(top,width,height);hasBox=box;window.dispatchEvent(new window.Event('scroll'));await tick();};
  try{
    window.eval(script);document.dispatchEvent(new window.Event('DOMContentLoaded'));await tick();
    assert.equal(preview.classList.contains('is-active'),false,'Initial zero bounds must not count as a scrolled-away purchase button');
    assert.equal(preview.getAttribute('aria-hidden'),'true');
    await scroll(1500);
    assert.equal(preview.classList.contains('is-active'),false,'A button below the viewport has not been scrolled past');
    await scroll(300);
    assert.equal(preview.classList.contains('is-active'),false,'Keep the bar hidden while the original purchase button is visible');
    await scroll(70);
    assert.equal(preview.classList.contains('is-active'),false,'Wait until the whole button disappears behind the header');
    await scroll(30);
    assert.equal(preview.classList.contains('is-active'),true);
    assert.equal(preview.getAttribute('aria-hidden'),'false');
    const quantity=preview.querySelector('[data-context-quantity]');quantity.focus();
    await scroll(300);
    assert.equal(preview.classList.contains('is-active'),false,'Focus restoration must not keep the duplicate purchase bar visible');
    assert.equal(document.activeElement,document.querySelector('form input[name="quantity"]'));
    await scroll(30,0,46);
    assert.equal(preview.classList.contains('is-active'),false,'Zero-width or collapsed original controls are not valid scroll anchors');
    await scroll(30,300,0);
    assert.equal(preview.classList.contains('is-active'),false);
    await scroll(30,300,46,false);
    assert.equal(preview.classList.contains('is-active'),false,'A hidden original control has no client rectangles');
    await scroll(30);
    assert.equal(preview.classList.contains('is-active'),true);
    button.remove();window.dispatchEvent(new window.Event('scroll'));await tick();
    assert.equal(preview.classList.contains('is-active'),false,'A removed purchase button must not activate the bar');
    assert.deepEqual(errors,[]);
  }finally{dom.window.close();}
});
