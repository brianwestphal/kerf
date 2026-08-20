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
 * `left`/`top` are viewport coordinates, matching `getBoundingClientRect`). This is
 * `popover()`'s placement core, usable on any element (an inline hint, a tooltip) —
 * no overlay lifecycle. Pair with {@link autoReposition} to keep it glued while open.
 */
export function positionAnchored(el: HTMLElement, anchor: Element, options: AnchorPositionOptions = {}): void {
  const { placement = 'bottom', align = 'start', gap = 4 } = options;
  // Fix `el` FIRST, then measure it. Measuring a still-`display:block` wrapper
  // reports the full body-content width (≈ viewport minus body margins), which
  // collapses the horizontal clamp below and lands the element at the body's left
  // edge. As a fixed, shrink-to-fit box its `width`/`height` are its real size.
  el.style.position = 'fixed';
  el.style.margin = '0';
  const a = anchor.getBoundingClientRect();
  const p = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Vertical: preferred side, flipped only if it overflows and the other side fits.
  const belowTop = a.bottom + gap;
  const aboveTop = a.top - gap - p.height;
  let below = placement !== 'top';
  if (below && belowTop + p.height > vh && aboveTop >= 0) below = false;
  else if (!below && aboveTop < 0 && belowTop + p.height <= vh) below = true;

  // Horizontal: align to an anchor edge, then clamp into the viewport.
  let left = align === 'end' ? a.right - p.width : a.left;
  left = Math.max(0, Math.min(left, vw - p.width));

  el.style.left = `${left}px`;
  el.style.top = `${below ? belowTop : aboveTop}px`;
}

/**
 * Keep `el` positioned against `anchor` (via {@link positionAnchored}) as the page
 * scrolls or resizes. Positions once immediately, then re-runs on `scroll`
 * (capture phase — catches scrolls in any inner container, not just `window`) and
 * `resize`. Returns a disposer that removes the listeners.
 */
export function autoReposition(el: HTMLElement, anchor: Element, options: AnchorPositionOptions = {}): () => void {
  const reposition = (): void => positionAnchored(el, anchor, options);
  reposition();
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
  return () => {
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition);
  };
}
