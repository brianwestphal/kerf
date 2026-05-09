/**
 * Focus snapshot/restore for the keyed list reconciler.
 *
 * Some engines (older Safari, happy-dom) drop focus state on `insertBefore`
 * even when the focused element survives the move connected to the document.
 * The reconciler snapshots the active element + selection range before its
 * move pass, then re-applies them afterwards. Engines that already preserve
 * focus across DOM moves see a no-op; engines that don't get a transparent
 * fix.
 *
 * Lives in its own file (rather than inside `list-reconcile.ts`) to keep that
 * file under the 200-LOC project guideline and to isolate the engine-quirk
 * handling described in `docs/4-render.md` §4.4.
 */

export interface FocusSnapshot {
  el: HTMLElement;
  selStart: number | null;
  selEnd: number | null;
}

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
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    try {
      selStart = (el as HTMLInputElement).selectionStart;
      selEnd = (el as HTMLInputElement).selectionEnd;
    } catch {
      // Some input types (number, range, color, …) reject selection APIs.
    }
  }
  return { el, selStart, selEnd };
}

export function restoreFocus(snap: FocusSnapshot): void {
  if (document.activeElement === snap.el) return;
  if (!snap.el.isConnected) return;
  snap.el.focus();
  if (snap.selStart !== null && snap.selEnd !== null) {
    try {
      (snap.el as HTMLInputElement).setSelectionRange(snap.selStart, snap.selEnd);
    } catch {
      // Selection may have been clobbered by .focus(); not fatal.
    }
  }
}
