/** The flat-tree parent: the assigned slot, the parent, or a shadow host. */
function composedParent(node: Element): Element | null {
  return (
    node.assignedSlot ??
    node.parentElement ??
    (node.parentNode instanceof ShadowRoot ? node.parentNode.host : null)
  );
}

/**
 * The nearest scrolling ancestor of `node` across shadow boundaries,
 * following slot assignment, so a slotted menu item reaches the shadow
 * `[part~="submenu"]` or menu panel that scrolls it.
 */
function scrollerOf(node: Element): HTMLElement | undefined {
  for (
    let current = composedParent(node);
    current;
    current = composedParent(current)
  ) {
    if (
      current instanceof HTMLElement &&
      current.scrollHeight > current.clientHeight &&
      /auto|scroll/.test(globalThis.getComputedStyle(current).overflowY)
    )
      return current;
  }
  return undefined;
}

/**
 * Scroll `item`'s own scroll container by the least amount that brings the
 * item fully into its clip, leaving the page and every other ancestor alone.
 * Pairs with `focus({ preventScroll: true })` when a restore refocuses an
 * item whose container a later focus scrolled away from it.
 */
export function revealInScroller(item: HTMLElement): void {
  const scroller = scrollerOf(item);
  if (!scroller) return;
  const box = item.getBoundingClientRect();
  const top = scroller.getBoundingClientRect().top + scroller.clientTop;
  const bottom = top + scroller.clientHeight;
  if (box.top < top) scroller.scrollTop -= top - box.top;
  else if (box.bottom > bottom) scroller.scrollTop += box.bottom - bottom;
}
