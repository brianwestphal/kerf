interface NamedDropdown extends HTMLElement {
  menu?: HTMLElement | null;
  firstUpdated(changed: unknown): void;
  showMenu(): Promise<void>;
}

interface NamedDropdownItem extends HTMLElement {
  submenuElement?: HTMLElement | null;
  openSubmenu(): Promise<void>;
}

/** The host attribute `PopupMenu` renders its menu's accessible name into. */
export const POPUP_MENU_LABEL_ATTRIBUTE = 'data-menu-label';

const installed = new WeakSet<object>();

/** Copy the host's rendered name onto Web Awesome's shadow `role="menu"` panel. */
function syncMenuName(dropdown: NamedDropdown): void {
  const menu = dropdown.menu;
  if (!menu || !dropdown.classList.contains('kui-popup-menu')) return;
  const name = dropdown.getAttribute(POPUP_MENU_LABEL_ATTRIBUTE)?.trim();
  if (name) menu.setAttribute('aria-label', name);
  else menu.removeAttribute('aria-label');
}

/**
 * Name a `PopupMenu`'s open menu from its trigger. Web Awesome renders the
 * `role="menu"` panel in the dropdown's shadow root, and the trigger's name
 * lives either on an `aria-hidden` context anchor or inside `wa-button`'s own
 * shadow root, so no ID reference can reach across. `PopupMenu` renders the
 * name it already knows as `data-menu-label`; this copies it to the panel as
 * `aria-label` on first render and on every open, so a re-rendered label is
 * current whenever the menu is shown. Lit only owns the attributes it binds,
 * so the imperative name persists.
 */
export function installPopupMenuAccessibleName(prototype: object): void {
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const target = prototype as NamedDropdown;
  const firstUpdated = target.firstUpdated;
  const showMenu = target.showMenu;
  target.firstUpdated = function (this: NamedDropdown, changed): void {
    firstUpdated.call(this, changed);
    syncMenuName(this);
  };
  target.showMenu = function (this: NamedDropdown): Promise<void> {
    syncMenuName(this);
    return showMenu.call(this);
  };
}

const installedItems = new WeakSet<object>();

/**
 * Name each `PopupMenu` submenu from its parent item. The item's `#submenu`
 * (`role="menu"`) and `#label` share one shadow root, so a real
 * `aria-labelledby` reference follows the item's text.
 */
export function installPopupMenuSubmenuName(prototype: object): void {
  if (installedItems.has(prototype)) return;
  installedItems.add(prototype);
  const target = prototype as NamedDropdownItem;
  const openSubmenu = target.openSubmenu;
  target.openSubmenu = function (this: NamedDropdownItem): Promise<void> {
    const submenu = this.submenuElement;
    if (submenu && this.closest('.kui-popup-menu'))
      submenu.setAttribute('aria-labelledby', 'label');
    return openSubmenu.call(this);
  };
}
