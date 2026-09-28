interface PopupMenuDropdown extends HTMLElement {
  makeSelection(
    item: HTMLElement & { disabled?: boolean },
    event?: Event,
  ): void;
}

const installed = new WeakSet<object>();

/**
 * Route a keyboard choice in a `PopupMenu` through the item's click. Web Awesome
 * selects a pointer choice from the item's click event but a keyboard choice
 * (Enter or Space) directly, so delegated `data-action` click handlers would
 * never run for keyboard users. Clicking the item makes Web Awesome select it
 * exactly as it does for a pointer — one `wa-select`, then close and focus
 * return — while the click reaches the application's delegation. Raw
 * `wa-dropdown`s outside `PopupMenu` are unaffected.
 */
export function installPopupMenuKeyboard(prototype: object): void {
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const target = prototype as PopupMenuDropdown;
  const makeSelection = target.makeSelection;
  target.makeSelection = function (this: PopupMenuDropdown, item, event): void {
    if (
      event instanceof KeyboardEvent &&
      this.classList.contains('kui-popup-menu') &&
      !item.disabled
    ) {
      item.click();
      return;
    }
    makeSelection.call(this, item, event);
  };
}
