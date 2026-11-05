import { createKeyActivation } from '../../../../shared/dom/key-activation.js';
import {
  LINEAR_NAVIGATION_KEYS,
  linearNavigationTarget,
  wireRovingTabindex,
} from '../../../../shared/dom/roving-tabindex.js';

const OPTION_SELECTOR = '[data-component="summary-row"][role="option"]';
const LISTBOX_SELECTOR = '[role="listbox"]:not([aria-multiselectable="true"])';

/** The SummaryRow options of one single-select listbox, in order. */
function listboxOptions(listbox: Element): HTMLElement[] {
  return Array.from(
    listbox.querySelectorAll<HTMLElement>(OPTION_SELECTOR),
  ).filter((option) => option.closest(LISTBOX_SELECTOR) === listbox);
}

/** The single-select listbox option a key event targets directly, if any. */
function eventOption(event: Event): HTMLElement | null {
  const target = event.target;
  if (
    !(target instanceof HTMLElement) ||
    !target.matches(OPTION_SELECTOR) ||
    !target.closest(LISTBOX_SELECTOR)
  )
    return null;
  return target;
}

/**
 * Give `SummaryRow` options in a `List selectionMode="single"` listbox the
 * listbox keyboard with one delegated listener set: the listbox is one Tab
 * stop (roving `tabindex` on the last focused option, else the selected one,
 * else the first), Up/Down/Home/End move focus between options, and
 * Enter/Space select the focused option by dispatching its click (Space on
 * release), so the app's ordinary delegated `data-action` click handler
 * changes the selection. The click mirrors the key's Shift, Ctrl, and Meta
 * state; Alt-modified keys and Ctrl/Meta-modified movement keys are left to
 * the platform. Kerf skips any key event that is already `defaultPrevented`,
 * so an app overrides a key by handling it first (on the option, in the
 * capture phase, or from a listener added to the same root before wiring) and
 * calling `preventDefault()`. A `semanticRole="group"` row is not managed.
 * Returns a disposer.
 */
export function wireSummaryRows(root: HTMLElement): () => void {
  const stopRoving = wireRovingTabindex(root, {
    containerSelector: LISTBOX_SELECTOR,
    items: listboxOptions,
    itemFor: (target) => target.closest<HTMLElement>(OPTION_SELECTOR),
  });
  const activation = createKeyActivation(eventOption);

  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey) return;
    const option = eventOption(event);
    if (!option) return;
    if (LINEAR_NAVIGATION_KEYS.includes(event.key)) {
      if (event.ctrlKey || event.metaKey) return;
      const options = listboxOptions(option.closest(LISTBOX_SELECTOR)!);
      const next = linearNavigationTarget(
        options,
        options.indexOf(option),
        event.key,
      );
      if (next) {
        event.preventDefault();
        next.focus();
      }
      return;
    }
    activation.keydown(event, option);
  };

  root.addEventListener('keydown', keydown);
  root.addEventListener('keyup', activation.keyup);
  root.addEventListener('focusout', activation.focusout);
  return () => {
    activation.clear();
    stopRoving();
    root.removeEventListener('keydown', keydown);
    root.removeEventListener('keyup', activation.keyup);
    root.removeEventListener('focusout', activation.focusout);
  };
}
