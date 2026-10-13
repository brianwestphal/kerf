/**
 * Anchored positioning primitives for `kerfjs/overlay` — position an element
 * relative to an anchor, with viewport flip + clamp. These are standalone: they
 * take any element and have no overlay lifecycle, so `popover()` / `tooltip()`
 * build on them but you can also position your own element (an inline hint, a
 * custom menu). Re-exported from `src/overlay.ts` so the public `kerfjs/overlay`
 * surface is unchanged (KF-511 split out of overlay.ts's dialog + toast code).
 */

/** Vertical placement relative to an anchor (used by `popover`, {@link positionAnchored}, `tooltip`). */
export type PopoverPlacement = 'bottom' | 'top';

/** Placement options for {@link positionAnchored} / {@link autoReposition}. */
export interface AnchorPositionOptions {
  /** Preferred side of the anchor; flips to the other side if it would overflow the viewport. Default `'bottom'`. */
  placement?: PopoverPlacement;
  /** Horizontal edge to line up with the anchor: `'start'` (left edges) or `'end'` (right edges). Default `'start'`. */
  align?: 'start' | 'end';
  /** Gap in px between the anchor and the element. Default `4`. */
  gap?: number;
  /**
   * Gutter in px kept between the element and the viewport edges: the
   * horizontal clamp stops this far inside the left and right edges, and a
   * side fits only when the element ends this far inside the top or bottom
   * edge. Default `0` (the bare viewport edge).
   */
  viewportMargin?: number;
  /**
   * The element's height can shrink (it scrolls its overflow). When neither
   * side has room for its full height, it takes the side with more room, and
   * that room — from the gap to the viewport margin, in `el`'s CSS px — is
   * published on `el` as the `--kerf-anchor-available-height` custom property
   * on every reposition. Cap the element with it, for example
   * `max-height: var(--kerf-anchor-available-height); overflow: auto`. Default
   * `false`.
   */
  fitHeight?: boolean;
}

/** The custom property `fitHeight` publishes on the positioned element. */
const AVAILABLE_HEIGHT = '--kerf-anchor-available-height';

/**
 * One-shot: position `el` relative to `anchor` — below by default, flipping above
 * if it would overflow the viewport, aligned to a horizontal edge and clamped into
 * view. Sets `el.style` `position: fixed`, `margin: 0`, `left`, and `top` (fixed so
 * `left`/`top` are viewport coordinates, matching `getBoundingClientRect`). When an
 * ancestor makes itself the containing block for fixed descendants (a
 * `transform`, `filter`, `perspective`, or `contain` on a wrapping `<dialog>`),
 * `left`/`top` are translated (and unscaled) into that box's coordinates so `el`
 * still lands next to the anchor. `viewportMargin` keeps a gutter from the
 * viewport edges; `fitHeight` publishes the room on the chosen side so CSS can
 * cap a scrolling element to it. This is
 * `popover()`'s placement core, usable on any element (an inline hint, a tooltip) —
 * no overlay lifecycle. Pair with {@link autoReposition} to keep it glued while open.
 */
export function positionAnchored(
  el: HTMLElement,
  anchor: Element,
  options: AnchorPositionOptions = {},
): void {
  const {
    placement = 'bottom',
    align = 'start',
    gap = 4,
    viewportMargin = 0,
    fitHeight = false,
  } = options;
  // Fix `el` FIRST, then measure it. Measuring a still-`display:block` wrapper
  // reports the full body-content width (≈ viewport minus body margins), which
  // collapses the horizontal clamp below and lands the element at the body's left
  // edge. As a fixed, shrink-to-fit box its `width`/`height` are its real size.
  el.style.position = 'fixed';
  el.style.margin = '0';
  const anchorRect = anchor.getBoundingClientRect();
  const elementRect = el.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Vertical: preferred side, flipped only if it overflows and the other side
  // fits. A height-flexible element that fits neither side takes the roomier one.
  const height = fitHeight ? fullHeight(el, elementRect) : elementRect.height;
  const belowTop = anchorRect.bottom + gap;
  const roomBelow = viewportHeight - viewportMargin - belowTop;
  const roomAbove = anchorRect.top - gap - viewportMargin;
  let below = placement !== 'top';
  if (height > roomBelow && height > roomAbove) {
    if (fitHeight) below = roomBelow >= roomAbove;
  } else if (below && height > roomBelow) below = false;
  else if (!below && height > roomAbove) below = true;

  // Horizontal: align to an anchor edge, then clamp inside the viewport gutter.
  let left =
    align === 'end' ? anchorRect.right - elementRect.width : anchorRect.left;
  left = Math.max(
    viewportMargin,
    Math.min(left, viewportWidth - viewportMargin - elementRect.width),
  );

  // `left`/`top` so far are viewport coordinates. They are only the CSS values
  // too when `el`'s fixed-position containing block is the viewport; an
  // ancestor with a `transform`, `filter`, `perspective`, `contain`, … (say a
  // modal `<dialog>` holding an overlay host slot) captures fixed descendants,
  // so map the coordinates into that box's space.
  const [originX, originY, scaleX, scaleY] = fixedOrigin(el);
  let placedHeight = height;
  if (fitHeight) {
    const room = Math.max(0, below ? roomBelow : roomAbove);
    el.style.setProperty(AVAILABLE_HEIGHT, `${room / scaleY}px`);
    // Above, the element hangs from its bottom edge: use the height its CSS
    // cap actually lays out.
    if (!below) placedHeight = el.getBoundingClientRect().height;
  }
  const top = below ? belowTop : anchorRect.top - gap - placedHeight;
  el.style.left = `${(left - originX) / scaleX}px`;
  el.style.top = `${(top - originY) / scaleY}px`;
}

/**
 * The height `el` would take without the cap a previous reposition published:
 * its laid-out height plus whatever it currently scrolls. Read from scroll
 * metrics rather than by lifting the cap, which would reset the element's own
 * scroll position — and every scroll inside it repositions it. Scroll metrics
 * are CSS px, so they are scaled into the viewport px of `rect`.
 */
function fullHeight(el: HTMLElement, rect: DOMRect): number {
  const scale = el.offsetHeight ? rect.height / el.offsetHeight : 1;
  return rect.height + Math.max(0, el.scrollHeight - el.clientHeight) * scale;
}

/**
 * Where `left: 0; top: 0` actually lands for a fixed-position child of `el`'s
 * parent, plus that containing block's scale — `[x, y, scaleX, scaleY]`, which
 * is `[0, 0, 1, 1]` when the viewport is the containing block. Measured with a
 * 1px probe rather than `el` itself so `el`'s own transform or running entrance
 * animation cannot skew it. The probe is inserted and removed synchronously, so
 * it is never painted. Translation and scale are compensated; a rotated or
 * skewed containing block is not.
 */
function fixedOrigin(el: HTMLElement): [number, number, number, number] {
  const parent = el.parentNode;
  if (!parent) return [0, 0, 1, 1];
  const probe = el.ownerDocument.createElement('div');
  probe.style.cssText =
    'position:fixed;left:0;top:0;width:1px;height:1px;margin:0;padding:0;border:0';
  parent.insertBefore(probe, el);
  const rect = probe.getBoundingClientRect();
  probe.remove();
  // A zero size (a containing block mid `scale(0)` animation, or a DOM without
  // layout) would divide by zero; treat it as unscaled.
  return [rect.left, rect.top, rect.width || 1, rect.height || 1];
}

/**
 * Keep `el` positioned against `anchor` (via {@link positionAnchored}) as the page
 * scrolls or resizes. Positions once immediately, then re-runs on `scroll`
 * (capture phase — catches scrolls in any inner container, not just `window`) and
 * `resize`. Returns a disposer that removes the listeners.
 */
export function autoReposition(
  el: HTMLElement,
  anchor: Element,
  options: AnchorPositionOptions = {},
): () => void {
  const reposition = (): void => positionAnchored(el, anchor, options);
  reposition();
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
  return () => {
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition);
  };
}
