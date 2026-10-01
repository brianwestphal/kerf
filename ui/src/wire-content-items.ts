const ITEM_SELECTOR =
  '[data-component="content-item"][data-interactive="true"]';
const NESTED_CONTROL_SELECTOR =
  'button, a[href], input, select, textarea, [contenteditable="true"], [role="button"]';

function actionItem(root: HTMLElement, target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const item = target.closest<HTMLElement>(ITEM_SELECTOR);
  if (!item || !root.contains(item) || item.dataset.disabled === 'true')
    return null;
  const nested = target.closest(NESTED_CONTROL_SELECTOR);
  if (nested && nested !== item && item.contains(nested)) return null;
  return item;
}

/**
 * Give interactive ContentItems native-like Enter/Space activation with one
 * delegated listener pair. Space activates on release and is cancelled if
 * focus moves; the item's own `data-action` still goes through the app's
 * ordinary delegated click handler. Returns a disposer.
 */
export function wireContentItems(root: HTMLElement): () => void {
  let pendingSpace: HTMLElement | null = null;

  const clearSpace = () => {
    pendingSpace?.removeAttribute('data-kui-pressed');
    pendingSpace = null;
  };

  const keydown = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const item = actionItem(root, event.target);
    if (!item) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      item.click();
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (event.repeat) return;
      clearSpace();
      pendingSpace = item;
      item.setAttribute('data-kui-pressed', 'true');
    }
  };

  const keyup = (event: KeyboardEvent) => {
    if (event.key !== ' ' && event.key !== 'Spacebar') return;
    const item = pendingSpace;
    if (!item) return;
    event.preventDefault();
    clearSpace();
    if (
      item === actionItem(root, event.target) &&
      item.ownerDocument.activeElement === item
    )
      item.click();
  };

  const focusout = (event: FocusEvent) => {
    if (event.target === pendingSpace) clearSpace();
  };

  root.addEventListener('keydown', keydown);
  root.addEventListener('keyup', keyup);
  root.addEventListener('focusout', focusout);
  return () => {
    clearSpace();
    root.removeEventListener('keydown', keydown);
    root.removeEventListener('keyup', keyup);
    root.removeEventListener('focusout', focusout);
  };
}
