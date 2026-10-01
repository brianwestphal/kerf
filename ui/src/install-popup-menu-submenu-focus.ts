interface SubmenuItem extends HTMLElement {
  active: boolean;
}

interface PopupMenuParentItem extends HTMLElement {
  submenuElement?: HTMLElement;
  submenuOpen: boolean;
  getSubmenuItems(): SubmenuItem[];
  openSubmenu(): Promise<void>;
}

const installed = new WeakSet<object>();

/** Preserve a rapid keyboard move past Web Awesome's late first-item focus. */
export function installPopupMenuSubmenuFocus(prototype: object): void {
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const target = prototype as PopupMenuParentItem;
  const openSubmenu = target.openSubmenu;
  target.openSubmenu = async function (
    this: PopupMenuParentItem,
  ): Promise<void> {
    const submenu = this.submenuElement;
    if (!this.closest('wa-dropdown.kui-popup-menu') || !submenu)
      return openSubmenu.call(this);

    let desired: SubmenuItem | undefined;
    const trackFocus = (event: FocusEvent) => {
      const item = event
        .composedPath()
        .find(
          (node): node is SubmenuItem =>
            node instanceof HTMLElement &&
            node.localName === 'wa-dropdown-item' &&
            node.getAttribute('slot') === 'submenu',
        );
      if (item && this.getSubmenuItems().includes(item)) desired = item;
    };
    submenu.addEventListener('focusin', trackFocus);
    try {
      await openSubmenu.call(this);
    } finally {
      submenu.removeEventListener('focusin', trackFocus);
    }

    const items = this.getSubmenuItems();
    if (!desired || desired === items[0]) return;
    const selected = desired;
    // Web Awesome queues its first-item focus after the show animation. This
    // timer follows that one, restoring a user's later arrow choice only if
    // the queued focus actually reset it. Pointer/blur/close paths are left alone.
    window.setTimeout(() => {
      if (
        !this.isConnected ||
        !this.submenuOpen ||
        submenu.hidden ||
        document.activeElement !== items[0]
      )
        return;
      items.forEach((item) => (item.active = item === selected));
      selected.focus({ preventScroll: true });
    }, 0);
  };
}
