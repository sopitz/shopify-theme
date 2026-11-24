const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');
const script = readFileSync(path.join(__dirname, '../assets/navigation.js'), 'utf8');
const image = (name, extra='') => `<img loading="lazy" src="/cdn/${name}.jpg?width=720" srcset="/cdn/${name}.jpg?width=160 160w, /cdn/${name}.jpg?width=240 240w, /cdn/${name}.jpg?width=360 360w" sizes="(min-width: 1101px) 200px, 52px" ${extra}>`;
const item = (id, images) => `<li data-nav-item id="${id}"><div><a class="mega-menu-link" href="/collections/${id}">${id}</a><button data-nav-toggle aria-label="${id} öffnen"></button></div><div data-nav-panel hidden>${images}<a href="/cart/add?id=123">Normaler Link</a></div></li>`;
function fixture({desktop=true, fine=true, saveData=false, effectiveType='4g', downlink=10, hidden=false, idleSupported=true, contents}={}) {
  const dom = new JSDOM(`<header data-navigation-root><ul>${contents || item('first', image('a')+image('b')+image('c'))+item('second', image('d')+image('e')+image('f'))}</ul><button data-navigation-mobile-toggle></button><div data-navigation-mobile-panel hidden>${image('mobile')}</div></header>`, {url:'https://preview.example/', runScripts:'outside-only', pretendToBeVisual:true});
  const {window}=dom, {document}=window;
  let complete=false, isHidden=hidden, nextId=1;
  Object.defineProperty(document,'readyState',{get:()=>complete?'complete':'loading',configurable:true});
  Object.defineProperty(document,'hidden',{get:()=>isHidden,configurable:true});
  Object.defineProperty(document,'visibilityState',{get:()=>isHidden?'hidden':'visible',configurable:true});
  const desktopMedia = new window.EventTarget(), hoverMedia = new window.EventTarget();
  desktopMedia.matches=desktop;hoverMedia.matches=fine;
  window.matchMedia=query=>query.includes('min-width')?desktopMedia:hoverMedia;
  const connection = new window.EventTarget();Object.assign(connection,{saveData,effectiveType,downlink});
  Object.defineProperty(window.navigator,'connection',{value:connection,configurable:true});
  const idle = new Map(), timers = new Map(), onLoad=[];
  const originalAdd=window.addEventListener.bind(window);
  window.addEventListener=(type,callback,options)=>{
    if(type==='load') {onLoad.push({callback,signal:options?.signal});return;}
    originalAdd(type,callback,options);
  };
  window.setTimeout=(callback,ms)=>{const id=nextId++;timers.set(id,{callback,ms});return id;};
  window.clearTimeout=id=>timers.delete(id);
  if(idleSupported){window.requestIdleCallback=callback=>{const id=nextId++;idle.set(id,callback);return id;};window.cancelIdleCallback=id=>idle.delete(id);}
  const starts=[],loaded=new WeakSet();
  const attr=window.HTMLImageElement.prototype.setAttribute;
  window.HTMLImageElement.prototype.setAttribute=function(name,value){
    const previous=this.getAttribute(name);attr.call(this,name,value);
    if(name==='loading'&&value==='eager'&&previous!=='eager')starts.push({image:this,src:this.getAttribute('src'),srcset:this.getAttribute('srcset'),sizes:this.getAttribute('sizes'),priority:this.getAttribute('fetchpriority')});
  };
  const initialize = scope => scope.querySelectorAll('img').forEach(img=>{
    Object.defineProperty(img,'complete',{get:()=>loaded.has(img),configurable:true});
    Object.defineProperty(img,'naturalWidth',{get:()=>loaded.has(img)?240:0,configurable:true});
  });initialize(document);
  window.Image=()=>{throw new Error('Must reuse native responsive images, not construct duplicate requests');};
  window.fetch=()=>{throw new Error('Navigation warming must never fetch pages or action URLs');};
  window.eval(script);
  const root=document.querySelector('[data-navigation-root]');
  const pointer=(selector,type='mouse')=>{const event=new window.Event('pointerenter');Object.defineProperty(event,'pointerType',{value:type});document.querySelector(selector).dispatchEvent(event);};
  const flushIdle=()=>{const entry=idle.entries().next().value;if(!entry)return false;idle.delete(entry[0]);entry[1]({didTimeout:false,timeRemaining:()=>50});return true;};
  const finish=img=>{loaded.add(img);img.dispatchEvent(new window.Event('load'));};
  return {window,document,root,starts,idle,timers,connection,desktopMedia,hoverMedia,initialize,pointer,flushIdle,finish,
    load(){complete=true;for(const entry of onLoad)if(!entry.signal?.aborted)entry.callback();},
    focus(selector){document.querySelector(selector).dispatchEvent(new window.FocusEvent('focusin',{bubbles:true}));},
    hidden(value){isHidden=value;document.dispatchEvent(new window.Event('visibilitychange'));},
    viewport(value){desktopMedia.matches=value;desktopMedia.dispatchEvent(new window.Event('change'));},
    network(values){Object.assign(connection,values);connection.dispatchEvent(new window.Event('change'));},
    timer(ms){const entry=[...timers.entries()].find(([,value])=>value.ms===ms);if(!entry)return false;timers.delete(entry[0]);entry[1].callback();return true;},
    close(){dom.window.close();}
  };
}

test('background images wait for load and idle, use low priority and keep their exact responsive URLs',()=>{
  const f=fixture();const img=f.document.querySelector('#first img');const original={src:img.getAttribute('src'),srcset:img.getAttribute('srcset'),sizes:img.getAttribute('sizes')};
  assert.equal(f.starts.length,0);assert.equal(f.idle.size,0);
  f.load();assert.equal(f.starts.length,0);assert.equal(f.idle.size,1);
  f.flushIdle();assert.equal(f.starts.length,2);
  assert.ok(f.starts.every(start=>start.priority==='low'));
  assert.deepEqual({src:f.starts[0].src,srcset:f.starts[0].srcset,sizes:f.starts[0].sizes},original);
  assert.equal(img.getAttribute('decoding'),'async');assert.equal(f.document.querySelector('[rel=preload]'),null);
  assert.equal(f.document.querySelector('[data-nav-toggle]').getAttribute('aria-expanded'),'false');f.close();
});

test('the bounded idle queue eventually covers all desktop menu images rather than a permanent first-menu budget',()=>{
  const contents=Array.from({length:12},(_,i)=>item('item'+i,image('img'+i+'a')+image('img'+i+'b')+image('img'+i+'c'))).join('');
  const f=fixture({contents});f.load();f.flushIdle();let finished=0;
  while(finished<f.starts.length){
    const batch=f.starts.slice(finished);assert.ok(batch.length<=2,'Only two background requests can be active');
    batch.forEach(start=>{f.finish(start.image);finished++;});
    assert.equal(f.starts.length,finished,'Completion schedules the next batch for idle, never immediately');f.flushIdle();
  }
  assert.equal(f.starts.length,36);assert.equal(f.document.querySelector('[data-navigation-mobile-panel] img').getAttribute('loading'),'lazy');f.close();
});

test('automatic warming skips mobile, coarse pointers, Save-Data and slow network conditions',()=>{
  for(const options of [{desktop:false},{fine:false},{saveData:true},{effectiveType:'slow-2g'},{effectiveType:'2g'},{effectiveType:'3g'},{downlink:1},{hidden:true}]){
    const f=fixture(options);f.load();f.flushIdle();assert.equal(f.starts.length,0,JSON.stringify(options));assert.equal(f.idle.size,0);f.close();
  }
});

test('network and visibility changes pause queued background work and resume it when appropriate',()=>{
  const f=fixture();f.load();assert.equal(f.idle.size,1);f.hidden(true);assert.equal(f.idle.size,0);f.flushIdle();assert.equal(f.starts.length,0);
  f.hidden(false);f.flushIdle();assert.equal(f.starts.length,2);
  f.network({saveData:true});f.starts.slice().forEach(start=>f.finish(start.image));assert.equal(f.idle.size,0);
  f.network({saveData:false});assert.equal(f.idle.size,1);f.flushIdle();assert.equal(f.starts.length,4);
  f.viewport(false);f.starts.slice(2).forEach(start=>f.finish(start.image));assert.equal(f.idle.size,0);f.close();
});

test('pointer intent warms only its requested menu immediately, before the normal hover opening delay',()=>{
  const f=fixture();f.pointer('#second');assert.equal(f.starts.length,3);
  assert.ok(f.starts.every(start=>start.image.closest('#second')));
  assert.ok(f.starts.every(start=>start.priority==='low'));
  assert.equal(f.document.querySelector('#second [data-nav-toggle]').getAttribute('aria-expanded'),'false');
  assert.equal(f.document.querySelector('#second [data-nav-panel]').hidden,true);
  assert.equal(f.starts[0].src,'/cdn/d.jpg?width=720','Visible DOM order gets warmed first');
  assert.equal(f.document.querySelector('#first img').getAttribute('loading'),'lazy');f.close();
});

test('keyboard focus is intentional even on Save-Data, while touch hover and hidden tabs do not speculate',()=>{
  const f=fixture({saveData:true});f.load();f.focus('#second .mega-menu-link');assert.equal(f.starts.length,3);assert.ok(f.starts.every(start=>start.image.closest('#second')));f.close();
  const touch=fixture();touch.pointer('#second','touch');assert.equal(touch.starts.length,0);touch.close();
  const hidden=fixture({hidden:true});hidden.pointer('#second');hidden.focus('#second .mega-menu-link');assert.equal(hidden.starts.length,0);hidden.close();
});

test('intent jumps ahead of background jobs and keeps speculative concurrency at four',()=>{
  const f=fixture({contents:item('first',image('a')+image('b')+image('c'))+item('second',image('d')+image('e')+image('f')+image('g')+image('h'))});
  f.load();f.flushIdle();assert.equal(f.starts.length,2);f.pointer('#second');assert.equal(f.starts.length,4);
  assert.ok(f.starts.slice(2).every(start=>start.image.closest('#second')));
  f.finish(f.starts[0].image);assert.equal(f.starts.length,5);assert.ok(f.starts[4].image.closest('#second'));
  assert.equal(f.document.querySelector('#first img[src*="/c.jpg"]').getAttribute('loading'),'lazy');f.close();
});

test('identical responsive images share one warm request and loaded native images are skipped',()=>{
  const f=fixture({contents:item('first',image('same')+image('done'))+item('second',image('same')+image('unique'))});
  const done=f.document.querySelector('img[src*="/done.jpg"]');f.finish(done);
  f.pointer('#first');f.pointer('#second');f.pointer('#second');f.focus('#first .mega-menu-link');
  assert.equal(f.starts.length,2);assert.equal(f.starts.filter(start=>start.src.includes('/same.jpg')).length,1);
  assert.equal(done.getAttribute('loading'),'lazy');f.close();
});

test('different responsive sizes remain distinct instead of falsely deduplicating a different browser candidate',()=>{
  const narrow=image('same');const wide=image('same').replace('200px, 52px','400px, 52px');
  const f=fixture({contents:item('first',narrow)+item('second',wide)});f.pointer('#first');f.pointer('#second');assert.equal(f.starts.length,2);assert.notEqual(f.starts[0].sizes,f.starts[1].sizes);f.close();
});

test('opening a menu uses ordinary image demand and leaves navigation/action links intact',()=>{
  const f=fixture({saveData:true});const button=f.document.querySelector('#second [data-nav-toggle]');button.click();
  assert.equal(f.document.querySelector('#second [data-nav-panel]').hidden,false);
  assert.equal(f.starts.length,3);assert.ok(f.starts.every(start=>start.priority===null));
  assert.equal(f.document.querySelector('#second a[href^="/cart/add"]').getAttribute('href'),'/cart/add?id=123');
  button.click();assert.equal(f.document.querySelector('#second [data-nav-panel]').hidden,true);f.close();
});

test('unsupported idle API falls back to a delayed low-priority batch after page load',()=>{
  const f=fixture({idleSupported:false});assert.equal(f.timers.size,0);f.load();assert.equal(f.starts.length,0);assert.ok(f.timer(1500));assert.equal(f.starts.length,2);assert.ok(f.starts.every(start=>start.priority==='low'));f.close();
});

test('Theme Editor unload cancels idle/timers/listeners and reloading does not duplicate previously warmed sources',()=>{
  const f=fixture();f.load();assert.equal(f.idle.size,1);
  f.root.dispatchEvent(new f.window.CustomEvent('shopify:section:unload',{bubbles:true}));assert.equal(f.idle.size,0);f.pointer('#first');assert.equal(f.starts.length,0);
  f.root.dispatchEvent(new f.window.CustomEvent('shopify:section:load',{bubbles:true}));f.flushIdle();assert.equal(f.starts.length,2);
  f.root.dispatchEvent(new f.window.CustomEvent('shopify:section:unload',{bubbles:true}));f.starts.slice().forEach(start=>f.finish(start.image));assert.equal(f.idle.size,0);
  f.root.dispatchEvent(new f.window.CustomEvent('shopify:section:load',{bubbles:true}));f.flushIdle();assert.equal(f.starts.length,4);assert.equal(new Set(f.starts.map(start=>start.src)).size,4);
  f.window.eval(script);f.window.upswingNavigation.bind(f.document);f.pointer('#first');assert.ok(f.starts.length<=5);f.close();
});

test('missing, malformed and inline image URLs cannot break menu operation or become speculative requests',()=>{
  const f=fixture({contents:item('first','<img loading="lazy"><img loading="lazy" src="http://%"><img loading="lazy" src="data:image/gif;base64,AAAA">'+image('valid'))});
  f.pointer('#first');assert.equal(f.starts.length,1);assert.equal(f.starts[0].src,'/cdn/valid.jpg?width=720');f.document.querySelector('[data-nav-toggle]').click();assert.equal(f.document.querySelector('[data-nav-panel]').hidden,false);f.close();
});
