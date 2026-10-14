/* A single reversible card image preview for alternate views and colour intent. */
(() => {
  'use strict';
  if (window.upswingProductCards) {window.upswingProductCards.bind();return;}
  const controllers = new WeakMap();
  const mouseHover = window.matchMedia?.('(any-hover: hover) and (any-pointer: fine)');
  let keyboardIntent = true, frame = 0, imageCache;
  const safeImage = value => {
    if (!value) return '';
    try {const url = new URL(value,document.baseURI);return /^https?:$/.test(url.protocol) ? url.href : '';} catch (_) {return '';}
  };
  const warm = value => {
    const url=safeImage(value);
    if (!url) return;
    imageCache ||= window.upswingGalleryImagePreload?.create();
    imageCache?.warm([url]);
  };
  const bindCard = card => {
    if (controllers.has(card)) return;
    const image=card.querySelector('.product-media img');
    if (!image) return;
    const snapshot = () => Object.fromEntries(['src','srcset','sizes','alt'].map(name=>[name,image.getAttribute(name)]));
    const state={original:snapshot(),hovered:false,focused:false,hoverSwatch:null,focusSwatch:null};
    const restore = () => {
      for (const [name,value] of Object.entries(state.original)) {
        if (value===null) image.removeAttribute(name);else if (image.getAttribute(name)!==value) image.setAttribute(name,value);
      }
      card.dataset.cardImageState='default';
    };
    const render = () => {
      const swatch=state.hoverSwatch?.isConnected ? state.hoverSwatch : state.focusSwatch?.isConnected ? state.focusSwatch : null;
      const alternate=(state.hovered || state.focused) && safeImage(card.dataset.cardSecondaryImage);
      const source=swatch ? safeImage(swatch.dataset.cardSwatch) : alternate;
      if (!source) {restore();return;}
      warm(source);
      if (image.getAttribute('src')!==source) image.setAttribute('src',source);
      image.removeAttribute('srcset');
      const color=swatch?.getAttribute('aria-label') || swatch?.title;
      const title=card.querySelector('.product-title')?.textContent.trim();
      const alt=swatch ? color && title ? `${title} · ${color}` : state.original.alt : card.dataset.cardSecondaryAlt || state.original.alt;
      if (alt===null) image.removeAttribute('alt');else image.setAttribute('alt',alt || '');
      card.dataset.cardImageState=swatch ? 'swatch' : 'secondary';
    };
    const allowsHover = event => event.pointerType==='mouse' && mouseHover?.matches;
    card.addEventListener('pointerenter',event=>{
      if (!allowsHover(event)) return;
      state.hovered=true;render();
    });
    card.addEventListener('pointerleave',()=>{
      state.hovered=false;state.hoverSwatch=null;render();
    });
    card.addEventListener('pointerover',event=>{
      if (!allowsHover(event)) return;
      const swatch=event.target.closest('[data-card-swatch]');
      if (swatch && card.contains(swatch) && !swatch.contains(event.relatedTarget)) {state.hoverSwatch=swatch;render();}
    });
    card.addEventListener('pointerout',event=>{
      const swatch=event.target.closest('[data-card-swatch]');
      if (swatch && state.hoverSwatch===swatch && !swatch.contains(event.relatedTarget)) {state.hoverSwatch=null;render();}
    });
    card.addEventListener('pointerdown',event=>{
      state.focused=false;state.focusSwatch=null;
      if (event.pointerType!=='mouse') {state.hovered=false;state.hoverSwatch=null;}
      render();
    });
    card.addEventListener('focusin',event=>{
      state.focused=keyboardIntent;
      state.focusSwatch=keyboardIntent ? event.target.closest('[data-card-swatch]') : null;
      render();
    });
    card.addEventListener('focusout',()=>queueMicrotask(()=>{
      if (!card.isConnected) return;
      state.focused=keyboardIntent && card.contains(document.activeElement);
      state.focusSwatch=state.focused ? document.activeElement?.closest('[data-card-swatch]') : null;
      render();
    }));
    const reset = () => {state.hovered=false;state.focused=false;state.hoverSwatch=null;state.focusSwatch=null;restore();};
    controllers.set(card,{reset,refresh:render,commit() {state.original=snapshot();render();}});
  };
  const bind = (scope=document) => {
    if (scope.matches?.('.product-card')) bindCard(scope);
    scope.querySelectorAll('.product-card').forEach(bindCard);
  };
  const schedule = () => {
    if (frame) return;
    frame=requestAnimationFrame(()=>{frame=0;bind();});
  };
  document.addEventListener('pointerdown',()=>{keyboardIntent=false;},true);
  document.addEventListener('keydown',event=>{if (event.key==='Tab' || event.key.startsWith('Arrow')) keyboardIntent=true;},true);
  document.addEventListener('shopify:section:load',event=>bind(event.target));
  document.addEventListener('upswing:colors-ready',event=>{
    bind(event.target);controllers.get(event.target.closest?.('.product-card'))?.refresh();
  });
  // The local preview commits a chosen colour in place; native swatches navigate normally.
  document.addEventListener('upswing:card-color-selected',event=>{
    const card=event.target.closest?.('.product-card');
    if (card) {bindCard(card);controllers.get(card)?.commit();}
  });
  window.addEventListener('pagehide',()=>{
    document.querySelectorAll('.product-card').forEach(card=>controllers.get(card)?.reset());
    imageCache?.destroy();imageCache=null;
  });
  window.upswingProductCards={bind};
  const start = () => {bind();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});};
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
