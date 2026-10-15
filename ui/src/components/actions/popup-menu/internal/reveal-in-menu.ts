/**
 * Scroll `item`'s own menu panel by the least amount that brings the item
 * fully inside it, leaving the page and every other scroller alone. Pairs
 * with `focus({ preventScroll: true })`: a menu in the top layer is fixed, so
 * the browser's own focus scrolling would move the page beneath it.
 */
export function revealInMenu(item: HTMLElement, menu: HTMLElement): void {
  if (menu.scrollHeight <= menu.clientHeight) return;
  const box = item.getBoundingClientRect();
  const top = menu.getBoundingClientRect().top + menu.clientTop;
  const bottom = top + menu.clientHeight;
  if (box.top < top) menu.scrollTop -= top - box.top;
  else if (box.bottom > bottom) menu.scrollTop += box.bottom - bottom;
}
