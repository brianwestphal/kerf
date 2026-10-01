interface FocusableDropdownItem extends HTMLElement {
  active: boolean;
}

interface FocusableDropdown extends HTMLElement {
  open: boolean;
  popup?: { active: boolean };
  menu?: HTMLElement;
  getItems(): FocusableDropdownItem[];
  showMenu(): Promise<void>;
}

const installed = new WeakSet<object>();
const showEpoch = new WeakMap<FocusableDropdown, number>();

/** Preserve item navigation that Web Awesome receives during its show animation. */
export function installDropdownShowFocus(prototype: object): void {
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const target = prototype as FocusableDropdown;
  const showMenu = target.showMenu;
  target.showMenu = async function (this: FocusableDropdown): Promise<void> {
    const scoped =
      this.classList.contains('kui-popup-menu') ||
      this.closest('.kui-popup-surface') !== null;
    if (!scoped) return showMenu.call(this);

    const epoch = (showEpoch.get(this) ?? 0) + 1;
    showEpoch.set(this, epoch);
    let navigatedItem: FocusableDropdownItem | undefined;
    const rememberFocus = (event: FocusEvent) => {
      const item = event.target;
      if (
        this.menu?.classList.contains('show') &&
        item instanceof HTMLElement &&
        item.localName === 'wa-dropdown-item' &&
        this.contains(item)
      ) {
        navigatedItem = item as FocusableDropdownItem;
      }
    };
    this.addEventListener('focusin', rememberFocus);
    try {
      await showMenu.call(this);
    } finally {
      this.removeEventListener('focusin', rememberFocus);
    }
    if (
      showEpoch.get(this) !== epoch ||
      !this.open ||
      !this.popup?.active ||
      !navigatedItem?.isConnected ||
      !this.contains(navigatedItem)
    )
      return;

    const siblings =
      navigatedItem.slot === 'submenu'
        ? Array.from(navigatedItem.parentElement?.children ?? []).filter(
            (item): item is FocusableDropdownItem =>
              item.localName === 'wa-dropdown-item',
          )
        : this.getItems();
    siblings.forEach((item) => {
      item.active = item === navigatedItem;
    });
    navigatedItem.focus({ preventScroll: true });
  };
}
