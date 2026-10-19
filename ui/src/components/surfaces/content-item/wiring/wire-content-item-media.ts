const CARD = '[data-component="content-item"][data-media-state]';
const LEAD = '.kui-content-item__media-image';
const BLURRED = '.kui-content-item__media-blurred';

/** Image state uses one load/error listener pair and one observer per feed root. */
export function wireContentItemMedia(root: HTMLElement): () => void {
  const tint = (card: HTMLElement, enabled: boolean) => {
    const media = card.querySelector<HTMLElement>('.kui-content-item__media');
    const scheme = media?.dataset.tintScheme;
    if (!scheme) return;
    if (enabled) {
      card.setAttribute('data-kui-tint', scheme);
      card.classList.add(`wa-${scheme}`);
      if (media?.hasAttribute('data-tint-accent')) {
        card.setAttribute('data-kui-tint-accent', '');
      }
    } else {
      card.removeAttribute('data-kui-tint');
      card.removeAttribute('data-kui-tint-accent');
      card.classList.remove('wa-light', 'wa-dark');
    }
  };
  const sync = (card: HTMLElement) => {
    const lead = card.querySelector<HTMLImageElement>(LEAD);
    if (!lead) return;
    const state = !lead.complete
      ? 'pending'
      : lead.naturalWidth > 0
        ? 'ready'
        : 'error';
    if (card.dataset.mediaState !== state) card.dataset.mediaState = state;
    tint(card, state !== 'error');
    const blurred = card.querySelector<HTMLImageElement>(BLURRED);
    if (blurred?.complete && blurred.naturalWidth === 0)
      blurred.dataset.imageError = 'true';
    else blurred?.removeAttribute('data-image-error');
  };
  const all = () => {
    if (root.matches(CARD)) sync(root);
    root.querySelectorAll<HTMLElement>(CARD).forEach(sync);
  };
  const onImage = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.matches(`${LEAD}, ${BLURRED}`))
      return;
    const card = target.closest<HTMLElement>(CARD);
    if (card && root.contains(card)) sync(card);
  };
  const observer = new MutationObserver(all);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'srcset'],
  });
  root.addEventListener('load', onImage, true);
  root.addEventListener('error', onImage, true);
  all();
  return () => {
    observer.disconnect();
    root.removeEventListener('load', onImage, true);
    root.removeEventListener('error', onImage, true);
  };
}
