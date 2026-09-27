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
}

/**
 * One-shot: position `el` relative to `anchor` — below by default, flipping above
 * if it would overflow the viewport, aligned to a horizontal edge and clamped into
 * view. Sets `el.style` `position: fixed`, `margin: 0`, `left`, and `top` (fixed so
 * `left`/`top` are viewport coordinates, matching `getBoundingClientRect`). When an
 * ancestor makes itself the containing block for fixed descendants (a
 * `transform`, `filter`, `perspective`, or `contain` on a wrapping `<dialog>`),
 * `left`/`top` are translated (and unscaled) into that box's coordinates so `el`
 * still lands next to the anchor. This is
 * `popover()`'s placement core, usable on any element (an inline hint, a tooltip) —
 * no overlay lifecycle. Pair with {@link autoReposition} to keep it glued while open.
 */
export function positionAnchored(
  el: HTMLElement,
  anchor: Element,
  options: AnchorPositionOptions = {},
): void {
  const { placement = 'bottom', align = 'start', gap = 4 } = options;
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

  // Vertical: preferred side, flipped only if it overflows and the other side fits.
  const belowTop = anchorRect.bottom + gap;
  const aboveTop = anchorRect.top - gap - elementRect.height;
  let below = placement !== 'top';
  if (below && belowTop + elementRect.height > viewportHeight && aboveTop >= 0)
    below = false;
  else if (
    !below &&
    aboveTop < 0 &&
    belowTop + elementRect.height <= viewportHeight
  )
    below = true;

  // Horizontal: align to an anchor edge, then clamp into the viewport.
  let left =
    align === 'end' ? anchorRect.right - elementRect.width : anchorRect.left;
  left = Math.max(0, Math.min(left, viewportWidth - elementRect.width));

  // `left`/`top` so far are viewport coordinates. They are only the CSS values
  // too when `el`'s fixed-position containing block is the viewport; an
  // ancestor with a `transform`, `filter`, `perspective`, `contain`, … (say a
  // modal `<dialog>` holding an overlay host slot) captures fixed descendants,
  // so map the coordinates into that box's space.
  const [originX, originY, scaleX, scaleY] = fixedOrigin(el);
  el.style.left = `${(left - originX) / scaleX}px`;
  el.style.top = `${((below ? belowTop : aboveTop) - originY) / scaleY}px`;
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
