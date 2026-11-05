/**
 * A set of selection containers that are each one Tab stop: a multi-select
 * grid of rows or a single-select listbox of options.
 */
export interface RovingCollection {
  /** Matches every container that is one Tab stop. */
  containerSelector: string;
  /** The enabled items of one container, in document order. */
  items(container: Element): HTMLElement[];
  /** The managed item a focus target sits in, if any. */
  itemFor(target: Element): HTMLElement | null;
}

/**
 * Keep one Tab stop per container (roving `tabindex`): the last focused item,
 * else the first `aria-selected="true"` item, else the first enabled item.
 * A re-render resets each item's template `tabindex`, so the stop is restored
 * after every relevant DOM change (deduplicated per microtask). Returns a
 * disposer.
 */
export function wireRovingTabindex(
  root: HTMLElement,
  collection: RovingCollection,
): () => void {
  const activeItems = new WeakMap<Element, HTMLElement>();
  const rove = (container: Element) => {
    const items = collection.items(container);
    const remembered = activeItems.get(container);
    const stop =
      remembered && items.includes(remembered)
        ? remembered
        : (items.find(
            (item) => item.getAttribute('aria-selected') === 'true',
          ) ?? items[0]);
    for (const item of items) {
      const want = item === stop ? '0' : '-1';
      if (item.getAttribute('tabindex') !== want)
        item.setAttribute('tabindex', want);
    }
  };
  const containers = () =>
    [
      ...(root.matches(collection.containerSelector) ? [root] : []),
      ...root.querySelectorAll(collection.containerSelector),
    ] as Element[];
  let roving = false;
  const scheduleRove = () => {
    if (roving) return;
    roving = true;
    globalThis.queueMicrotask(() => {
      roving = false;
      for (const container of containers()) rove(container);
    });
  };
  const View = root.ownerDocument.defaultView;
  const observer =
    View && 'MutationObserver' in View
      ? new View.MutationObserver(scheduleRove)
      : null;
  observer?.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['tabindex', 'aria-selected', 'data-disabled'],
  });
  for (const container of containers()) rove(container);

  const focusin = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const item = collection.itemFor(target);
    const container = item?.closest(collection.containerSelector);
    if (!item || !container || !root.contains(container)) return;
    activeItems.set(container, item);
    rove(container);
  };
  root.addEventListener('focusin', focusin);
  return () => {
    observer?.disconnect();
    root.removeEventListener('focusin', focusin);
  };
}

/** The keys a vertical list of options or rows moves focus with. */
export const LINEAR_NAVIGATION_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End'];

/**
 * The item Up/Down/Home/End moves to in a vertical list, or `undefined` at an
 * edge or for any other key.
 */
export function linearNavigationTarget(
  items: HTMLElement[],
  index: number,
  key: string,
): HTMLElement | undefined {
  switch (key) {
    case 'Home':
      return items[0];
    case 'End':
      return items[items.length - 1];
    case 'ArrowDown':
      return items[index + 1];
    case 'ArrowUp':
      return items[index - 1];
    default:
      return undefined;
  }
}
