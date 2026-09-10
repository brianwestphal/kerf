/**
 * Focus snapshot/restore for the keyed list reconciler.
 *
 * Some engines drop focus state on `insertBefore`; Firefox's `moveBefore()`
 * keeps focus but can retarget a contenteditable Selection to the list parent.
 * The reconciler snapshots the active element + exact selection before its
 * move pass, then re-applies them afterwards.
 *
 * Lives in its own file (rather than inside `list-reconcile.ts`) to isolate
 * the engine-quirk handling — a concern separable from the reconcile
 * algorithm — described in `docs/4-render.md` §4.4.
 */

export type FocusSnapshot = [
  el: HTMLElement,
  selStart: number | null,
  selEnd: number | null,
  domSelection: [anchorNode: Node, anchorOffset: number, focusNode: Node, focusOffset: number] | null,
];

/**
 * Capture focus + selection on a focused descendant of `liveParent`.
 *
 * Returns null when the active element is outside the list (the diff path
 * handles those cases) or when there's no useful focus state to capture.
 */
export function captureFocus(liveParent: Element): FocusSnapshot | null {
  const active = document.activeElement;
  if (active === null || active === document.body) return null;
  if (!liveParent.contains(active)) return null;
  const el = active as HTMLElement;
  let selStart: number | null = null;
  let selEnd: number | null = null;
  let domSelection: FocusSnapshot[3] = null;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    try {
      selStart = (el as HTMLInputElement).selectionStart;
      selEnd = (el as HTMLInputElement).selectionEnd;
    } catch {
      // Some input types (number, range, color, …) reject selection APIs.
    }
  }
  if (el.isContentEditable) {
    const selection = document.getSelection();
    if (selection !== null && selection.anchorNode !== null && selection.focusNode !== null) {
      // Keep the live boundary-node references and numeric offsets. Firefox's
      // moveBefore() can retarget both Selection and cloned Range boundaries
      // to the row's parent during a keyed move, so neither object is a safe
      // snapshot on that engine.
      domSelection = [
        selection.anchorNode,
        selection.anchorOffset,
        selection.focusNode,
        selection.focusOffset,
      ];
    }
  }
  return [el, selStart, selEnd, domSelection];
}

export function restoreFocus(snap: FocusSnapshot): void {
  const [el, selStart, selEnd, domSelection] = snap;
  if (!el.isConnected) return;
  if (document.activeElement !== el) el.focus();
  if (selStart !== null && selEnd !== null) {
    try {
      (el as HTMLInputElement).setSelectionRange(selStart, selEnd);
    } catch {
      // Selection may have been clobbered by .focus(); not fatal.
    }
  }
  if (domSelection === null) return;
  const [anchorNode, anchorOffset, focusNode, focusOffset] = domSelection;
  try {
    // Preserve selection direction where the engine supports the direct API.
    document.getSelection()?.setBaseAndExtent(
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset,
    );
  } catch {
    // A caller may have mutated the editable subtree during reconciliation.
  }
}
