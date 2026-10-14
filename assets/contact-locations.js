/* Pointer, swipe and keyboard navigation for the contact-page store cards. */
(() => {
  const controllers = new Map();
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function create(root) {
    const track = root.querySelector('[data-location-track]');
    const previous = root.querySelector('[data-location-prev]');
    const next = root.querySelector('[data-location-next]');
    const position = root.querySelector('[data-location-position]');
    const locationLinks = Array.from(root.querySelectorAll('[data-location-jump]'));
    if (!track || !previous || !next) return null;
    let frame = 0;
    const cards = () => Array.from(track.children);
    const maximum = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const offsets = () => {
      const bounds = track.getBoundingClientRect();
      return cards().map(card => card.getBoundingClientRect().left - bounds.left + track.scrollLeft);
    };
    function update() {
      const left = Math.max(0, track.scrollLeft);
      const max = maximum();
      previous.disabled = left <= 2;
      next.disabled = left >= max - 2;
      const starts = offsets();
      const index = starts.reduce((best, start, current) => Math.abs(start - left) < Math.abs(starts[best] - left) ? current : best, 0);
      if (position) {
        const label = `Filiale ${index + 1} von ${starts.length}`;
        if (position.textContent !== label) position.textContent = label;
      }
      for (const link of locationLinks) {
        if (link.dataset.locationJump === cards()[index]?.id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    function go(direction) {
      const left = Math.max(0, track.scrollLeft);
      const starts = offsets();
      const target = direction > 0 ? starts.find(start => start > left + 4) ?? maximum() : [...starts].reverse().find(start => start < left - 4) ?? 0;
      track.scrollTo({left:Math.min(maximum(),Math.max(0,target)),behavior:reduceMotion() ? 'instant' : 'smooth'});
    }
    const onPrevious = () => go(-1);
    const onNext = () => go(1);
    function onLocation(event) {
      const link = event.target.closest('[data-location-jump]');
      if (!link || !root.contains(link)) return;
      const index = cards().findIndex(card => card.id === link.dataset.locationJump);
      if (index < 0) return;
      event.preventDefault();
      event.stopPropagation();
      track.scrollTo({left:Math.min(maximum(),Math.max(0,offsets()[index])),behavior:reduceMotion() ? 'instant' : 'smooth'});
    }
    function onKey(event) {
      if (event.target !== track) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        go(event.key === 'ArrowRight' ? 1 : -1);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        track.scrollTo({left:event.key === 'Home' ? 0 : maximum(),behavior:reduceMotion() ? 'instant' : 'smooth'});
      }
    }
    previous.addEventListener('click', onPrevious);
    next.addEventListener('click', onNext);
    root.addEventListener('click', onLocation);
    track.addEventListener('scroll', schedule, {passive:true});
    track.addEventListener('keydown', onKey);
    const observer = new ResizeObserver(schedule);
    observer.observe(track);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      previous.removeEventListener('click', onPrevious);
      next.removeEventListener('click', onNext);
      root.removeEventListener('click', onLocation);
      track.removeEventListener('scroll', schedule);
      track.removeEventListener('keydown', onKey);
    };
  }
  function bind(scope = document) {
    for (const [root, destroy] of controllers) {
      if (!root.isConnected) { destroy(); controllers.delete(root); }
    }
    for (const root of scope.querySelectorAll('[data-location-carousel]')) {
      if (controllers.has(root)) continue;
      const destroy = create(root);
      if (destroy) controllers.set(root, destroy);
    }
  }
  window.upswingContactLocations = {bind};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => bind(), {once:true});
  else bind();
  document.addEventListener('shopify:section:load', () => bind());
  document.addEventListener('shopify:section:unload', () => requestAnimationFrame(() => bind()));
})();
