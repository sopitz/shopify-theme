/* Take location-overview links directly to its existing store selection. */
(() => {
  let pending = 0;
  const normalize = link => {
    let url;
    try { url = new URL(link.getAttribute('href'), location.href); } catch (_) { return; }
    const internal = url.origin === location.origin || /^(www\.)?upswing\.ch$/i.test(url.hostname);
    if (!internal || url.pathname.replace(/\/$/, '') !== '/pages/filialubersicht') return;
    const target = '/pages/filialubersicht' + url.search + (url.hash || '#Filialen');
    if (link.getAttribute('href') !== target) link.setAttribute('href', target);
  };
  const bind = (scope = document) => {
    scope.querySelectorAll('a[href]').forEach(normalize);
    const section = document.getElementById('Filialen');
    const header = document.querySelector('.site-header');
    if (section && header) {
      const pagePadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      section.style.scrollMarginTop = Math.max(0, header.offsetHeight + 12 - pagePadding) + 'px';
    }
  };
  const schedule = () => { if (!pending) pending = requestAnimationFrame(() => {pending = 0; bind();}); };
  window.upswingFilialLinks = {bind};
  const start = () => {bind(); new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
  document.addEventListener('click', event => {const link = event.target.closest('a[href]'); if (link) normalize(link);}, {capture:true});
  document.addEventListener('shopify:section:load', event => bind(event.target));
  window.addEventListener('resize', schedule, {passive:true});
})();
