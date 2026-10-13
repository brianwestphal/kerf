type Root = HTMLElement | Document;

const SCROLLABLE_LIST = '[data-component="list"][data-scrollable="true"]';

/**
 * Sub-pixel slack, in px: a row resting exactly on the clip (a fractional
 * layout position) is not worth a scroll.
 */
const TOLERANCE = 0.5;

/**
 * Whether `element`'s focus ring (its border box grown by the outline's width
 * and offset) crosses the block edges of `list`'s scroll clip (its padding
 * box).
 */
function ringCrossesClip(element: HTMLElement, list: HTMLElement): boolean {
  const style = globalThis.getComputedStyle(element);
  const reach =
    style.outlineStyle === 'none'
      ? 0
      : (Number.parseFloat(style.outlineWidth) || 0) +
        (Number.parseFloat(style.outlineOffset) || 0);
  const box = element.getBoundingClientRect();
  const clipTop =
    list.getBoundingClientRect().top +
    (Number.parseFloat(globalThis.getComputedStyle(list).borderTopWidth) || 0);
  const clipBottom = clipTop + list.clientHeight;
  return (
    box.top - reach < clipTop - TOLERANCE ||
    box.bottom + reach > clipBottom + TOLERANCE
  );
}

/**
 * Bring a keyboard-focused row of a `scrollable` List below `root` fully into
 * view, focus ring included. Engines differ on how `focus()` scrolls a partly
 * hidden row: Chromium scrolls it to the nearest edge plus scroll padding,
 * Firefox waits until about half of it is hidden and then centers it, and
 * WebKit leaves it where it is. On `focusin`, when the newly focused element
 * matches `:focus-visible` and its ring crosses the nearest scrollable List's
 * clip, this calls `scrollIntoView({ block: 'nearest', inline: 'nearest' })`,
 * which honors the List's ring-room scroll padding in every engine. Pointer
 * focus is left alone, so a click never scrolls the row out from under the
 * pointer. Returns a disposer.
 */
export function wireListFocusScroll(root: Root): () => void {
  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches(':focus-visible'))
      return;
    const list = target.closest<HTMLElement>(SCROLLABLE_LIST);
    if (list === null || list === target || !ringCrossesClip(target, list))
      return;
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  root.addEventListener('focusin', onFocusIn as EventListener);
  return () => root.removeEventListener('focusin', onFocusIn as EventListener);
}
