/**
 * The overlay host slot — the one sanctioned nested-mount boundary
 * (KF-FBHQEP: a popover opened over a modal `<dialog>` must render INSIDE the
 * dialog to be interactive, because every engine inerts content outside the
 * modal, yet the dialog is usually already a `mount()` root).
 *
 * An element carrying both `data-kerf-overlay-host` and `data-morph-skip` is a
 * boundary between two mounts: `kerfjs/overlay` mounts its surfaces inside it,
 * and the enclosing mount leaves it alone — its morph skips the subtree
 * (`data-morph-skip`), its nested-mount check stops there, and its binding and
 * list-marker scans never descend into it, so the inner mounts' markers can
 * never be mistaken for the outer mount's own.
 */
export const OVERLAY_HOST_SELECTOR =
  '[data-kerf-overlay-host][data-morph-skip]';

/** True when `el` is an overlay host slot (see the module comment). */
export function isOverlayHost(el: Element): boolean {
  return el.matches(OVERLAY_HOST_SELECTOR);
}
