interface SubmenuItem extends HTMLElement {
  submenuElement?: HTMLElement;
  submenuOpen: boolean;
}

interface PopupMenuDropdown extends HTMLElement {
  menu?: HTMLElement;
  positionSubmenu(item: SubmenuItem): void;
}

const installed = new WeakSet<object>();
const phoneWidth = '(max-width: 480px)';
const viewportInset = 8;
const menuGap = 4;

/** Place a phone-width submenu beside its parent menu in the vertical axis. */
export function phoneSubmenuPosition(
  parent: DOMRect,
  submenu: DOMRect,
  viewport: { width: number; height: number },
  rtl: boolean,
) {
  const width = Math.min(submenu.width, viewport.width - 2 * viewportInset);
  const height = submenu.height;
  const below = Math.max(
    0,
    viewport.height - parent.bottom - menuGap - viewportInset,
  );
  const above = Math.max(0, parent.top - menuGap - viewportInset);
  const useBelow = height <= below || (height > above && below >= above);
  const availableHeight = useBelow ? below : above;
  const left = rtl ? parent.right - width : parent.left;
  return {
    left: Math.max(
      viewportInset,
      Math.min(left, viewport.width - viewportInset - width),
    ),
    top: useBelow
      ? parent.bottom + menuGap
      : parent.top - menuGap - Math.min(height, availableHeight),
    maxHeight: availableHeight,
    maxWidth: viewport.width - 2 * viewportInset,
  };
}

function clearPhoneStyles(submenu: HTMLElement) {
  for (const property of [
    'position',
    'left',
    'top',
    'max-width',
    'max-height',
    'box-sizing',
    'overflow-y',
  ])
    submenu.style.removeProperty(property);
}

/**
 * Web Awesome's horizontal flip can place a submenu over the parent menu on a
 * phone. Its own auto-update loop calls this method on scroll and resize, so
 * override only PopupMenu's narrow placement and leave native menu navigation
 * and selection intact.
 */
export function installPopupMenuSubmenuPlacement(prototype: object): void {
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const target = prototype as PopupMenuDropdown;
  const positionSubmenu = target.positionSubmenu;
  target.positionSubmenu = function (this: PopupMenuDropdown, item): void {
    if (!this.classList.contains('kui-popup-menu')) {
      positionSubmenu.call(this, item);
      return;
    }
    const submenu = item.submenuElement;
    if (!window.matchMedia(phoneWidth).matches || !submenu || !this.menu) {
      if (submenu) clearPhoneStyles(submenu);
      positionSubmenu.call(this, item);
      return;
    }

    // The opening event starts positioning before Web Awesome unhides the
    // submenu. Measure in the next microtask, after showPopover has run.
    window.queueMicrotask(() => {
      if (
        !this.isConnected ||
        !item.submenuOpen ||
        !window.matchMedia(phoneWidth).matches ||
        !this.menu ||
        !submenu.isConnected
      )
        return;
      const parentItem =
        item.parentElement?.localName === 'wa-dropdown-item'
          ? (item.parentElement as SubmenuItem)
          : undefined;
      const parentMenu = parentItem?.submenuElement ?? this.menu;
      submenu.style.position = 'fixed';
      submenu.style.maxWidth = `calc(100vw - ${2 * viewportInset}px)`;
      submenu.style.maxHeight = 'none';
      submenu.style.boxSizing = 'border-box';
      submenu.style.overflowY = 'auto';
      const placement = phoneSubmenuPosition(
        parentMenu.getBoundingClientRect(),
        submenu.getBoundingClientRect(),
        { width: window.innerWidth, height: window.innerHeight },
        window.getComputedStyle(this).direction === 'rtl',
      );
      submenu.style.left = `${placement.left}px`;
      submenu.style.top = `${placement.top}px`;
      submenu.style.maxHeight = `${placement.maxHeight}px`;
      submenu.style.maxWidth = `${placement.maxWidth}px`;
      submenu.setAttribute(
        'data-placement',
        placement.top >= parentMenu.getBoundingClientRect().bottom
          ? 'bottom-start'
          : 'top-start',
      );
    });
  };
}
