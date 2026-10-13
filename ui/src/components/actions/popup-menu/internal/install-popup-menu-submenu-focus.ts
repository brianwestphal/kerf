import { revealInScroller } from './reveal-in-scroller.js';

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
const inputEvents = ['keydown', 'pointerdown'] as const;

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

    // Web Awesome hands focus to the first submenu item from a timer it queues
    // once the show animation settles. Browsers may dispatch a keypress
    // between that timer being queued and running, so the handoff can land
    // after the user's own choice. Track the choice until a timer queued
    // behind Web Awesome's runs; a first-item focus outside any key or pointer
    // dispatch is that handoff, not a choice.
    let desired: SubmenuItem | undefined;
    let input: Event | undefined;
    const trackInput = (event: Event) => {
      input = event;
    };
    const trackFocus = (event: FocusEvent) => {
      const item = event
        .composedPath()
        .find(
          (node): node is SubmenuItem =>
            node instanceof HTMLElement &&
            node.localName === 'wa-dropdown-item' &&
            node.getAttribute('slot') === 'submenu',
        );
      const items = this.getSubmenuItems();
      if (!item || !items.includes(item)) return;
      const fromInput = input !== undefined && input.eventPhase !== Event.NONE;
      if (item !== items[0] || fromInput) desired = item;
    };
    for (const type of inputEvents)
      document.addEventListener(type, trackInput, true);
    submenu.addEventListener('focusin', trackFocus);
    try {
      await openSubmenu.call(this);
    } finally {
      // This timer follows Web Awesome's queued first-item focus, restoring a
      // user's later choice only if that queued focus actually reset it.
      // Pointer/blur/close paths are left alone.
      window.setTimeout(() => {
        for (const type of inputEvents)
          document.removeEventListener(type, trackInput, true);
        submenu.removeEventListener('focusin', trackFocus);
        const items = this.getSubmenuItems();
        const selected = desired;
        if (
          !selected ||
          selected === items[0] ||
          !this.isConnected ||
          !this.submenuOpen ||
          submenu.hidden ||
          document.activeElement !== items[0]
        )
          return;
        items.forEach((item) => (item.active = item === selected));
        // The handoff's focus scrolled the submenu to its first item; bring
        // the restored choice back into view within the submenu only.
        selected.focus({ preventScroll: true });
        revealInScroller(selected);
      }, 0);
    }
  };
}
