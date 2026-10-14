/* Location photos use the same selection in the page and its fullscreen gallery. */
(() => {
  if (window.upswingLocationGallery) return;
  window.upswingLocationGallery = true;
  let active = null;
  let restoringFocus = false;
  const preloaders = new WeakMap();
  const thumbs = root => [...root.querySelectorAll('[data-location-thumb]')];
  const selectedIndex = root => Math.max(0, thumbs(root).findIndex(button => button.getAttribute('aria-pressed') === 'true'));
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function preloaderFor(root) {
    if (!preloaders.has(root) && window.upswingGalleryImagePreload) {
      preloaders.set(root, window.upswingGalleryImagePreload.create());
    }
    return preloaders.get(root);
  }

  function warmNeighbours(root, index) {
    const photos = thumbs(root);
    if (photos.length < 2) return;
    preloaderFor(root)?.warm([1, -1, 2]
      .map(offset => (index + offset + photos.length) % photos.length)
      .filter(position => position !== index)
      .map(position => photos[position].dataset.imageSrc));
  }

  function destroyPreloader(root) {
    preloaders.get(root)?.destroy();
    preloaders.delete(root);
  }

  function updateView(container, photo, index) {
    const image = container.querySelector('[data-location-main-image]');
    image.src = photo.dataset.imageSrc;
    image.alt = photo.dataset.imageAlt || '';
    container.querySelector('[data-location-gallery-index]').textContent = index + 1;
    const caption = container.querySelector('[data-location-caption]');
    if (caption) {
      caption.textContent = photo.dataset.imageCaption || '';
      caption.hidden = !caption.textContent;
    }
    thumbs(container).forEach((button, position) => button.setAttribute('aria-pressed', String(position === index)));
  }

  function select(root, index) {
    const photos = thumbs(root);
    if (!photos.length) return;
    index = (index + photos.length) % photos.length;
    updateView(root, photos[index], index);
    if (active?.root === root) {
      updateView(active.dialog, photos[index], index);
      warmNeighbours(root, index);
    }
  }

  function open(root) {
    if (active || document.querySelector('dialog[open]')) return;
    const photos = thumbs(root);
    if (!photos.length) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'location-lightbox';
    dialog.setAttribute('aria-label', root.getAttribute('aria-label') || 'Filialbilder');
    dialog.innerHTML = '<div class="location-lightbox-toolbar"><strong data-location-lightbox-title></strong><button type="button" class="location-lightbox-close" data-location-close aria-label="Vollbildansicht schliessen" autofocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div><div class="location-lightbox-stage"><img data-location-main-image><button type="button" class="location-gallery-arrow location-gallery-prev" data-location-gallery-prev aria-label="Vorheriges Filialbild"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m14 6-6 6 6 6"/></svg></button><button type="button" class="location-gallery-arrow location-gallery-next" data-location-gallery-next aria-label="Nächstes Filialbild"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m10 6 6 6-6 6"/></svg></button><span class="location-gallery-position" aria-live="polite" aria-atomic="true"><span data-location-gallery-index></span> / <span data-location-gallery-total></span></span></div><p class="location-lightbox-caption" data-location-caption hidden></p><div class="location-gallery-thumbs location-lightbox-thumbs" data-location-gallery-track></div>';
    dialog.querySelector('[data-location-lightbox-title]').textContent = root.getAttribute('aria-label') || 'Filialbilder';
    dialog.querySelector('[data-location-gallery-total]').textContent = photos.length;
    const track = dialog.querySelector('[data-location-gallery-track]');
    track.style.setProperty('--location-thumbnails', Math.min(4, photos.length));
    for (const photo of photos) track.append(photo.cloneNode(true));
    active = { root, dialog, focus: document.activeElement };
    dialog.addEventListener('close', () => {
      const focus = active?.focus;
      if (root.isConnected) preloaders.get(root)?.clear();
      else destroyPreloader(root);
      active = null;
      dialog.remove();
      if (focus?.isConnected) {
        restoringFocus = true;
        focus.focus({ preventScroll: true });
        restoringFocus = false;
      }
    }, { once: true });
    document.body.append(dialog);
    dialog.showModal();
    select(root, selectedIndex(root));
  }

  function anticipateOpen(event) {
    if (active || restoringFocus) return;
    const button = event.target.closest('[data-location-open]');
    if (!button || (event.relatedTarget && button.contains(event.relatedTarget))) return;
    const root = button.closest('[data-location-gallery]');
    if (root) warmNeighbours(root, selectedIndex(root));
  }
  document.addEventListener('pointerover', anticipateOpen);
  document.addEventListener('focusin', anticipateOpen);
  function stopAnticipation(event) {
    if (active) return;
    const button = event.target.closest('[data-location-open]');
    if (!button || (event.relatedTarget && button.contains(event.relatedTarget))) return;
    const root = button.closest('[data-location-gallery]');
    if (root) preloaders.get(root)?.clear();
  }
  document.addEventListener('pointerout', stopAnticipation);
  document.addEventListener('focusout', stopAnticipation);

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const inLightbox = active?.dialog.contains(button);
    const root = inLightbox ? active.root : button.closest('[data-location-gallery]');
    if (!root) return;
    if (button.matches('[data-location-close]')) { active.dialog.close(); return; }
    if (button.matches('[data-location-open]')) { open(root); return; }
    if (button.matches('[data-location-thumb]')) {
      const container = inLightbox ? active.dialog : root;
      select(root, thumbs(container).indexOf(button));
    } else if (button.matches('[data-location-gallery-prev]')) select(root, selectedIndex(root) - 1);
    else if (button.matches('[data-location-gallery-next]')) select(root, selectedIndex(root) + 1);
  });

  document.addEventListener('keydown', event => {
    const inLightbox = active?.dialog.contains(event.target);
    const root = inLightbox ? active.root : event.target.closest('[data-location-gallery]');
    if (!root || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    if (!inLightbox && !event.target.matches('[data-location-thumb]')) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? thumbs(root).length - 1 : selectedIndex(root) + (event.key === 'ArrowLeft' ? -1 : 1);
    select(root, index);
    if (event.target.matches('[data-location-thumb]')) {
      const container = inLightbox ? active.dialog : root;
      thumbs(container)[selectedIndex(root)].focus({ preventScroll: true });
    }
  });

  function watchNavigation() {
    new MutationObserver(() => {
      if (active && !active.root.isConnected) active.dialog.close();
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchNavigation, { once: true });
  else watchNavigation();
  window.addEventListener('pagehide', () => {
    if (active) destroyPreloader(active.root);
  });
})();
