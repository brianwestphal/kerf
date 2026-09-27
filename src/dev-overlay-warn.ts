/**
 * Dev warning for an overlay surface opened while a modal `<dialog>` is open
 * (KF-0V9RTE). Always on when `kerfjs/dev` is installed — no switch, because
 * the surface is broken in a way the author cannot see from the code.
 *
 * A browser makes everything outside an open modal dialog inert, and a plain
 * element in the document paints beneath the dialog's top layer. `overlay()`
 * therefore lifts a non-native surface opened in that state into the top
 * layer itself (the Popover API for a non-modal surface, `showModal()` for a
 * modal one). Two cases remain that it cannot repair, and each is reported
 * once per page:
 *
 * - `hidden`: the engine lacks the API needed for the lift, so the surface
 *   renders beneath the dialog and cannot be used at all.
 * - `inert`: a non-modal surface WAS lifted and is visible, but it contains
 *   focusable controls — and browsers keep a popover outside the modal dialog
 *   inert even in the top layer, so those controls cannot be focused or
 *   clicked. (A tooltip has no controls, so the lift fully repairs it.) It
 *   fires only when no in-dialog host slot was used (KF-FBHQEP): a
 *   `popover()` anchored inside the dialog renders into the dialog's
 *   `[data-kerf-overlay-host]` element instead, is never lifted, and so
 *   never warns.
 *
 * Reachable only through the `overlayBlockedByModal` hook slot, so it drops out
 * of production bundles with the rest of the family.
 */

/** Why a surface opened over a modal `<dialog>` is still not fully usable. */
export type OverlayBlockedReason = 'hidden' | 'inert';

// One-shot dedup per reason (dev-only bookkeeping, Design rule 5).
const warned = new Set<OverlayBlockedReason>();

const MESSAGES: Record<OverlayBlockedReason, string> = {
  hidden:
    'kerf overlay(): a surface was opened while a modal <dialog> is open, and this engine lacks the ' +
    '<dialog>.showModal() / Popover API needed to lift it into the top layer. It renders beneath the ' +
    'dialog and is inert, so the user can neither see nor use it. Render the content inside the ' +
    "dialog's own markup, or open the dialog without `native: true`.",
  inert:
    'kerf overlay(): a non-modal surface opened while a modal <dialog> is open was lifted into the top ' +
    'layer so it is visible, but browsers keep everything outside a modal dialog inert — its focusable ' +
    'controls cannot be focused or clicked. Anchor the popover inside the dialog and give the dialog a ' +
    '`data-kerf-overlay-host` element (dialogs kerf opens get one automatically), or pass a `container` ' +
    'inside the dialog.',
};

export function maybeWarnOverlayBlockedByModal(
  reason: OverlayBlockedReason,
): void {
  if (warned.has(reason)) return;
  warned.add(reason);
  console.warn(MESSAGES[reason]);
}

/** Test-only: forget which reasons already warned. */
export function _resetWarnedForTests(): void {
  warned.clear();
}
