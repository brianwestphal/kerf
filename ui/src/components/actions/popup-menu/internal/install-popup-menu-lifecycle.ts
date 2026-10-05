interface PopupMenuDropdown extends HTMLElement {
  open: boolean;
  popup?: { active: boolean };
  showMenu(): Promise<void>;
  hideMenu(): Promise<void>;
}

const installed = new WeakSet<object>();

/** Restore Web Awesome dismissal listeners after a rapid close/reopen. */
export function installPopupMenuLifecycle(prototype: object): void {
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const target = prototype as PopupMenuDropdown;
  const showMenu = target.showMenu;
  const hideMenu = target.hideMenu;
  const hiding = new WeakMap<PopupMenuDropdown, { reopened: boolean }>();
  target.showMenu = function (this: PopupMenuDropdown): Promise<void> {
    const transition = hiding.get(this);
    if (
      transition &&
      this.open &&
      this.popup?.active &&
      this.classList.contains('kui-popup-menu')
    ) {
      // Native showMenu would return early while the old popup is active,
      // leaving its document pointer listener absent during the hide.
      this.popup.active = false;
      transition.reopened = true;
    }
    return showMenu.call(this);
  };
  target.hideMenu = async function (this: PopupMenuDropdown): Promise<void> {
    const scoped = this.classList.contains('kui-popup-menu');
    const transition = { reopened: false };
    if (scoped) hiding.set(this, transition);
    await hideMenu.call(this);
    // WA removes its document listeners before awaiting the hide animation.
    // If Lit coalesces the intervening open request, restore the listeners
    // after hide; an explicit showMenu above has already done so immediately.
    if (
      scoped &&
      hiding.get(this) === transition &&
      this.open &&
      this.isConnected &&
      this.popup?.active &&
      !transition.reopened
    ) {
      this.popup.active = false;
      void this.showMenu();
    }
    if (hiding.get(this) === transition) hiding.delete(this);
  };
}
