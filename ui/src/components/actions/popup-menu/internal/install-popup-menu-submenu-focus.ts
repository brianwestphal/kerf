interface SubmenuItem extends HTMLElement {
  active: boolean;
}

interface PopupMenuParentItem extends HTMLElement {
  submenuElement?: HTMLElement;
  submenuOpen: boolean;
  getSubmenuItems(): SubmenuItem[];
  openSubmenu(): Promise<void>;
  closeSubmenu(): Promise<void>;
}

const installed = new WeakSet<object>();

/** Preserve a rapid keyboard move past Web Awesome's late first-item focus. */
export function installPopupMenuSubmenuFocus(prototype: object): void {
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const target = prototype as PopupMenuParentItem;
  const openSubmenu = target.openSubmenu;
  const closeSubmenu = target.closeSubmenu;
  const submenuOpen = Object.getOwnPropertyDescriptor(prototype, 'submenuOpen');
  if (submenuOpen?.set) {
    Object.defineProperty(prototype, 'submenuOpen', {
      ...submenuOpen,
      set(this: PopupMenuParentItem, value: boolean) {
        const wasOpen = this.submenuOpen;
        submenuOpen.set!.call(this, value);
        // Web Awesome's pointer, click, and ArrowRight paths assign true. A
        // repeated assignment does not schedule updated(), so repair a stale
        // open flag over a hidden submenu at the point of that user action.
        if (
          value &&
          wasOpen &&
          this.submenuElement?.hidden &&
          this.closest('wa-dropdown.kui-popup-menu')
        )
          void this.openSubmenu();
      },
    });
  }
  target.closeSubmenu = async function (
    this: PopupMenuParentItem,
  ): Promise<void> {
    const submenu = this.submenuElement;
    await closeSubmenu.call(this);
    // A new open can start while Web Awesome awaits its hide animation. Its
    // late completion must not leave submenuOpen=true over a hidden submenu.
    if (
      this.submenuOpen &&
      submenu?.hidden &&
      this.isConnected &&
      this.closest('wa-dropdown.kui-popup-menu')
    )
      void this.openSubmenu();
  };
  target.openSubmenu = async function (
    this: PopupMenuParentItem,
  ): Promise<void> {
    const submenu = this.submenuElement;
    if (!this.closest('wa-dropdown.kui-popup-menu') || !submenu)
      return openSubmenu.call(this);

    // WA's animation helper never resolves if asked to add an animation class
    // already on the element. A second open while showing needs no new show;
    // a stale hidden popup needs the old show canceled before reopening.
    if (submenu.classList.contains('show')) {
      if (!submenu.hidden) return;
      submenu.classList.remove('show');
    }

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
