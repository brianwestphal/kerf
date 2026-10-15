import {
  followAnchor,
  PHONE_SUBMENU_QUERY,
  phoneSubmenuPosition,
  pointAnchor,
  type PopupAnchor,
  type PopupPlacement,
  positionPopup,
} from '../../../../shared/popup/position-popup.js';
import {
  POPUP_MENU_CLOSE_EVENT,
  POPUP_MENU_OPEN_EVENT,
  POPUP_MENU_SELECT_EVENT,
  type PopupMenuOpenDetail,
  type PopupMenuSelectDetail,
} from './popup-menu-events.js';
import { revealInMenu } from './reveal-in-menu.js';

const ROOT = '.kui-popup-menu';
const MENU = '.kui-popup-menu__menu';
const ITEM = '.kui-popup-menu__item';
const TRIGGER = '.kui-popup-menu__trigger';
const ROOT_OPENER =
  ':scope > .kui-popup-menu__trigger, :scope > .kui-popup-menu__context-anchor';

/** A typeahead query resets after this long without a keystroke. */
export const TYPEAHEAD_RESET = 1000;

/** A submenu the pointer has left closes after this grace period. */
export const SUBMENU_CLOSE_DELAY = 100;

/**
 * A submenu lifts by its own inset plus border, so its first row lines up
 * with the item that opened it.
 */
const SUBMENU_CROSS_OFFSET = -5;

/** How far ahead of the pointer, toward the submenu, the safe triangle starts. */
const SAFE_TRIANGLE_LEAD = 2;

/** The submenu attribute marking a pointer opening, which gets the safe triangle. */
export const POINTER_OPENED = 'data-pointer-opened';

type Focus = 'first' | 'last' | 'none';

const installed = new WeakSet<Document>();

const isOpen = (menu: Element): boolean => {
  try {
    return menu.matches(':popover-open');
  } catch {
    return false;
  }
};

const isDisabled = (item: Element): boolean =>
  item.getAttribute('aria-disabled') === 'true';

const rootMenuOf = (root: Element): HTMLElement | null =>
  root.querySelector<HTMLElement>(`:scope > ${MENU}`);

const rootOpenerOf = (root: Element): HTMLElement | null =>
  root.querySelector<HTMLElement>(ROOT_OPENER);

/** A submenu item's own menu, the sibling after it in its host. */
const submenuOf = (item: Element): HTMLElement | null =>
  item.parentElement?.classList.contains('kui-popup-menu__submenu-host') &&
  item.nextElementSibling?.matches(MENU)
    ? (item.nextElementSibling as HTMLElement)
    : null;

/** The control a menu opened from: the root trigger, or a submenu's item. */
function openerOf(menu: Element): HTMLElement | null {
  if (menu.hasAttribute('data-submenu')) {
    const item = menu.previousElementSibling;
    return item instanceof HTMLElement && item.matches(ITEM) ? item : null;
  }
  const root = menu.parentElement;
  return root?.matches(ROOT) ? rootOpenerOf(root) : null;
}

/** The items of one menu level, in order; disabled items are skipped by default. */
function levelItems(menu: Element, includeDisabled = false): HTMLElement[] {
  return Array.from(menu.querySelectorAll<HTMLElement>(ITEM)).filter(
    (item) =>
      item.closest(MENU) === menu && (includeDisabled || !isDisabled(item)),
  );
}

/** The open submenus a menu level shows directly. */
function openSubmenus(menu: Element): HTMLElement[] {
  return levelItems(menu, true)
    .map(submenuOf)
    .filter((submenu): submenu is HTMLElement => !!submenu && isOpen(submenu));
}

const isRtl = (element: Element): boolean =>
  element.ownerDocument.defaultView!.getComputedStyle(element).direction ===
  'rtl';

// Every rendered item holds its label span.
const labelOf = (item: Element): string =>
  item.querySelector('.kui-popup-menu__item-label')!.textContent!.trim();

function focusItem(menu: HTMLElement, focus: Focus): void {
  if (focus === 'none') return;
  const items = levelItems(menu);
  const target = focus === 'last' ? items[items.length - 1] : items[0];
  // A menu with nothing to focus still takes focus, so its keys work.
  (target ?? menu).focus({ preventScroll: true });
  if (target) revealInMenu(target, menu);
}

interface Typeahead {
  query: string;
  timer: number | undefined;
}

/**
 * Wire every PopupMenu in `doc`: opening from its trigger (and from the
 * open/close requests the component helpers send), placement in the top
 * layer, keyboard navigation and typeahead, hover-opened submenus with a
 * pointer safe triangle, the `kui-menu-select` choice event, focus return, and
 * cleanup when a menu closes for any reason. Idempotent per document.
 */
export function installPopupMenus(doc: Document = document): void {
  if (installed.has(doc)) return;
  installed.add(doc);
  const win = doc.defaultView!;
  const following = new WeakMap<HTMLElement, () => void>();
  const pendingClose = new WeakMap<HTMLElement, number>();
  const typeahead = new WeakMap<HTMLElement, Typeahead>();
  // Open root menus, for dismissal by a press outside them.
  const openRoots = new Set<HTMLElement>();
  // Menus closing without returning focus (a press outside moves it).
  const quiet = new WeakSet<HTMLElement>();
  // Each menu's toggle count, so a deferred focus return from an earlier
  // close never acts after the menu has opened or closed again.
  const toggles = new WeakMap<HTMLElement, number>();

  const follow = (
    menu: HTMLElement,
    anchor: PopupAnchor,
    place: () => Promise<void> | void,
  ) => {
    following.get(menu)?.();
    // A placement can cap the menu after a key has already moved focus
    // inside it (End pressed as it opens): keep that item in view.
    const reveal = () => {
      const active = doc.activeElement;
      if (active instanceof HTMLElement && active.closest(MENU) === menu)
        revealInMenu(active, menu);
    };
    const stop = followAnchor(anchor, menu, () => {
      if (!menu.isConnected || !isOpen(menu)) {
        stopFollowing(menu);
        return;
      }
      void Promise.resolve(place()).then(reveal);
    });
    following.set(menu, stop);
  };

  const stopFollowing = (menu: HTMLElement) => {
    following.get(menu)?.();
    following.delete(menu);
  };

  const placeSubmenu = (item: HTMLElement, submenu: HTMLElement) => {
    const parent = item.closest<HTMLElement>(MENU);
    if (parent && win.matchMedia(PHONE_SUBMENU_QUERY).matches) {
      submenu.style.removeProperty('max-height');
      submenu.style.removeProperty('max-width');
      const size = submenu.getBoundingClientRect();
      const placement = phoneSubmenuPosition(
        parent.getBoundingClientRect(),
        size,
        {
          width: doc.documentElement.clientWidth || win.innerWidth,
          height: doc.documentElement.clientHeight || win.innerHeight,
        },
        isRtl(submenu),
      );
      submenu.style.left = `${placement.left}px`;
      submenu.style.top = `${placement.top}px`;
      submenu.style.maxHeight = `${placement.maxHeight}px`;
      submenu.style.maxWidth = `${placement.maxWidth}px`;
      submenu.setAttribute('data-placement', placement.placement);
      return;
    }
    return positionPopup(item, submenu, {
      placement: isRtl(submenu) ? 'left-start' : 'right-start',
      crossOffset: SUBMENU_CROSS_OFFSET,
    });
  };

  const openRoot = (
    root: HTMLElement,
    { point, focus }: { point?: { x: number; y: number }; focus: Focus },
  ) => {
    const opener = rootOpenerOf(root);
    const menu = rootMenuOf(root);
    if (!opener || !menu) return;
    if (opener instanceof HTMLButtonElement && opener.disabled) return;
    if (isOpen(menu)) closeMenu(menu, false);
    const context = root.getAttribute('data-trigger') === 'context';
    const anchor: PopupAnchor =
      point && !context ? pointAnchor(point.x, point.y) : opener;
    const placement = (
      point || context
        ? 'bottom-start'
        : (root.getAttribute('data-placement') ?? 'bottom-start')
    ) as PopupPlacement;
    try {
      menu.showPopover();
    } catch {
      return;
    }
    openRoots.add(menu);
    opener.setAttribute('aria-expanded', 'true');
    follow(menu, anchor, () => positionPopup(anchor, menu, { placement }));
    focusItem(menu, focus);
  };

  const openSubmenu = (
    item: HTMLElement,
    submenu: HTMLElement,
    focus: Focus,
    pointer: boolean,
  ) => {
    cancelClose(submenu);
    if (!isOpen(submenu)) {
      // One submenu per level: a sibling's (and its own submenus) close.
      for (const open of openSubmenus(item.closest(MENU)!))
        closeMenu(open, false);
      try {
        submenu.showPopover();
      } catch {
        return;
      }
      item.setAttribute('aria-expanded', 'true');
      submenu.toggleAttribute(POINTER_OPENED, pointer);
      follow(submenu, item, () => placeSubmenu(item, submenu));
    }
    focusItem(submenu, focus);
  };

  /**
   * Hide one menu (its open submenus follow, below), returning focus to its
   * opener if asked. A silent close leaves focus where the user is moving it.
   */
  const closeMenu = (
    menu: HTMLElement,
    restoreFocus: boolean,
    silent = false,
  ) => {
    if (!isOpen(menu)) return;
    const opener = openerOf(menu);
    const focusInside = menu.contains(doc.activeElement);
    if (silent) quiet.add(menu);
    try {
      menu.hidePopover();
    } catch {
      quiet.delete(menu);
      return;
    }
    if (restoreFocus && focusInside) opener?.focus({ preventScroll: true });
  };

  const closeRoot = (root: Element, restoreFocus: boolean) => {
    const menu = rootMenuOf(root);
    if (menu) closeMenu(menu, restoreFocus);
  };

  const cancelClose = (submenu: HTMLElement) => {
    const timer = pendingClose.get(submenu);
    if (timer !== undefined) win.clearTimeout(timer);
    pendingClose.delete(submenu);
  };

  /** Close a submenu the pointer left, unless it returns within the grace period. */
  const scheduleClose = (submenu: HTMLElement) => {
    if (pendingClose.has(submenu)) return;
    pendingClose.set(
      submenu,
      win.setTimeout(() => {
        pendingClose.delete(submenu);
        const opener = openerOf(submenu);
        if (submenu.matches(':hover') || opener?.matches(':hover')) return;
        closeMenu(submenu, false);
      }, SUBMENU_CLOSE_DELAY),
    );
  };

  // A checkbox choice reports the state it asks for; the application owns
  // the state and renders it, so the item itself is not toggled here.
  const choose = (root: HTMLElement, item: HTMLElement) => {
    const checked =
      item.getAttribute('role') === 'menuitemcheckbox'
        ? item.getAttribute('aria-checked') !== 'true'
        : undefined;
    const proceed = root.dispatchEvent(
      new CustomEvent<PopupMenuSelectDetail>(POPUP_MENU_SELECT_EVENT, {
        bubbles: true,
        cancelable: true,
        detail: {
          item,
          value: item.getAttribute('value') ?? undefined,
          checked,
        },
      }),
    );
    if (proceed) closeRoot(root, true);
  };

  const runTypeahead = (menu: HTMLElement, key: string): boolean => {
    const state = typeahead.get(menu) ?? { query: '', timer: undefined };
    typeahead.set(menu, state);
    win.clearTimeout(state.timer);
    state.timer = win.setTimeout(() => {
      state.query = '';
    }, TYPEAHEAD_RESET);
    state.query += key.toLowerCase();
    const match = levelItems(menu).find((item) =>
      labelOf(item).toLowerCase().startsWith(state.query.trim()),
    );
    if (!match) return false;
    match.focus({ preventScroll: true });
    revealInMenu(match, menu);
    return true;
  };

  // A press outside an open menu (and its trigger) closes it. Menus are
  // manual popovers so a context menu opened during a press (`contextmenu`
  // fires on press in some engines) is not light-dismissed on release.
  doc.addEventListener(
    'pointerdown',
    (event) => {
      const path = event.composedPath();
      for (const menu of [...openRoots]) {
        if (!menu.isConnected || !isOpen(menu)) {
          openRoots.delete(menu);
          continue;
        }
        if (!path.includes(menu.parentElement!)) closeMenu(menu, false, true);
      }
    },
    true,
  );

  doc.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest<HTMLElement>(TRIGGER);
      if (trigger?.parentElement?.matches(ROOT)) {
        const root = trigger.parentElement as HTMLElement;
        const menu = rootMenuOf(root);
        if (!menu) return;
        if (isOpen(menu)) closeMenu(menu, true);
        else openRoot(root, { focus: 'first' });
        return;
      }
      const item = target.closest<HTMLElement>(ITEM);
      const root = item?.closest<HTMLElement>(ROOT);
      if (!item || !root) return;
      // A disabled command does nothing, and its click never reaches the
      // application's delegated data-action.
      if (isDisabled(item)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const submenu = submenuOf(item);
      if (submenu) {
        // A keyboard click (Enter or Space) moves into the submenu.
        openSubmenu(
          item,
          submenu,
          event.detail === 0 ? 'first' : 'none',
          event.detail !== 0,
        );
        return;
      }
      choose(root, item);
    },
    true,
  );

  doc.addEventListener(
    'keydown',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest<HTMLElement>(TRIGGER);
      if (trigger?.parentElement?.matches(ROOT)) {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        openRoot(trigger.parentElement as HTMLElement, {
          focus: event.key === 'ArrowUp' ? 'last' : 'first',
        });
        return;
      }
      const menu = target.closest<HTMLElement>(MENU);
      const root = menu?.closest<HTMLElement>(ROOT);
      if (!menu || !root || !isOpen(menu)) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const items = levelItems(menu);
      const current =
        target.matches(ITEM) && target.closest(MENU) === menu
          ? (target as HTMLElement)
          : null;
      const index = current ? items.indexOf(current) : -1;
      const rtl = isRtl(menu);
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
      const back = rtl ? 'ArrowRight' : 'ArrowLeft';
      const move = (next: HTMLElement | undefined) => {
        event.preventDefault();
        event.stopPropagation();
        if (!next) return;
        next.focus({ preventScroll: true });
        revealInMenu(next, menu);
      };
      const query = typeahead.get(menu)?.query ?? '';
      switch (event.key) {
        case 'ArrowDown':
          move(items[index >= 0 && index < items.length - 1 ? index + 1 : 0]);
          return;
        case 'ArrowUp':
          move(items[index > 0 ? index - 1 : items.length - 1]);
          return;
        case 'Home':
          move(items[0]);
          return;
        case 'End':
          move(items[items.length - 1]);
          return;
        case 'Escape':
          // The menu claims Escape, so an enclosing dialog stays open.
          event.preventDefault();
          event.stopPropagation();
          closeMenu(menu, true);
          return;
        case 'Tab':
          // Tab leaves the menu: close it and continue from the trigger.
          closeRoot(root, false);
          rootOpenerOf(root)?.focus({ preventScroll: true });
          return;
        case forward: {
          const submenu = current && submenuOf(current);
          if (submenu) {
            event.preventDefault();
            event.stopPropagation();
            openSubmenu(current, submenu, 'first', false);
          }
          return;
        }
        case back:
          if (menu.hasAttribute('data-submenu')) {
            event.preventDefault();
            event.stopPropagation();
            closeMenu(menu, true);
          }
          return;
        case ' ':
          // Space continues a typeahead query; otherwise it chooses.
          if (query) {
            event.preventDefault();
            runTypeahead(menu, ' ');
          }
          return;
        default:
          if (event.key.length === 1 && runTypeahead(menu, event.key)) {
            event.preventDefault();
            event.stopPropagation();
          }
      }
    },
    true,
  );

  // Hovering an item with a submenu opens it; moving onto another item of
  // the same level closes it after a short grace period.
  doc.addEventListener(
    'pointerover',
    (event) => {
      if ((event as PointerEvent).pointerType === 'touch') return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const menu = target.closest<HTMLElement>(MENU);
      if (!menu || !isOpen(menu)) return;
      // Over a submenu (or its safe triangle): keep it and its ancestors open.
      // A submenu always sits inside its parent menu.
      for (
        let level = menu;
        level.hasAttribute('data-submenu');
        level = level.parentElement!.closest<HTMLElement>(MENU)!
      )
        cancelClose(level);
      const item = target.closest<HTMLElement>(ITEM);
      if (!item || item.closest(MENU) !== menu) return;
      const submenu = submenuOf(item);
      for (const open of openSubmenus(menu))
        if (open !== submenu) scheduleClose(open);
      if (submenu && !isDisabled(item))
        openSubmenu(item, submenu, 'none', true);
    },
    true,
  );

  // The safe triangle: while a pointer-opened submenu shows, its ::before
  // spans from the pointer to the submenu's near edge, so a diagonal move
  // toward the submenu stays over it instead of crossing sibling items.
  doc.addEventListener(
    'pointermove',
    (event) => {
      const { clientX, clientY } = event as PointerEvent;
      for (const submenu of doc.querySelectorAll<HTMLElement>(
        `${MENU}[${POINTER_OPENED}]`,
      )) {
        if (!isOpen(submenu)) continue;
        const box = submenu.getBoundingClientRect();
        const edge = isRtl(submenu) ? box.right : box.left;
        // The apex sits just ahead of the pointer, toward the submenu: some
        // engines hit-test a polygon's edge as inside, so an apex under the
        // pointer would take the hover from the item beneath it.
        const x = isRtl(submenu)
          ? Math.max(clientX - SAFE_TRIANGLE_LEAD, edge)
          : Math.min(clientX + SAFE_TRIANGLE_LEAD, edge);
        const y = Math.max(box.top, Math.min(clientY, box.bottom));
        submenu.style.setProperty('--_kui-popup-menu-safe-x', `${x}px`);
        submenu.style.setProperty('--_kui-popup-menu-safe-y', `${y}px`);
        submenu.style.setProperty('--_kui-popup-menu-safe-edge', `${edge}px`);
        submenu.style.setProperty('--_kui-popup-menu-safe-top', `${box.top}px`);
        submenu.style.setProperty(
          '--_kui-popup-menu-safe-bottom',
          `${box.bottom}px`,
        );
      }
    },
    { capture: true, passive: true },
  );

  // Every close, however it happens (a choice, Escape, a press outside,
  // another menu opening), stops placement and resets the opener's state;
  // focus inside a closing menu returns to its opener unless focus has
  // already gone somewhere else.
  doc.addEventListener(
    'beforetoggle',
    (event) => {
      const menu = event.target;
      if (!(menu instanceof HTMLElement) || !menu.matches(MENU)) return;
      const toggle = (toggles.get(menu) ?? 0) + 1;
      toggles.set(menu, toggle);
      if ((event as ToggleEvent).newState !== 'closed') return;
      stopFollowing(menu);
      cancelClose(menu);
      openRoots.delete(menu);
      menu.removeAttribute(POINTER_OPENED);
      const opener = openerOf(menu);
      opener?.setAttribute('aria-expanded', 'false');
      // Menus are manual popovers, so a closing menu hides the submenus it
      // shows itself; their focus is this menu's to return.
      for (const nested of menu.querySelectorAll<HTMLElement>(MENU))
        if (isOpen(nested)) {
          quiet.add(nested);
          nested.hidePopover();
        }
      const silent = quiet.has(menu);
      quiet.delete(menu);
      if (silent || !menu.contains(doc.activeElement)) return;
      win.queueMicrotask(() => {
        const active = doc.activeElement;
        // Toggled again in the meantime, or focus has moved on: leave it.
        if (toggles.get(menu) !== toggle) return;
        if (!active || active === doc.body || menu.contains(active))
          opener?.focus({ preventScroll: true });
      });
    },
    true,
  );

  doc.addEventListener(
    POPUP_MENU_OPEN_EVENT,
    (event) => {
      const root = event.target;
      if (!(root instanceof HTMLElement) || !root.matches(ROOT)) return;
      const { point } = (event as CustomEvent<PopupMenuOpenDetail>).detail;
      openRoot(root, { point, focus: 'first' });
    },
    true,
  );

  doc.addEventListener(
    POPUP_MENU_CLOSE_EVENT,
    (event) => {
      const root = event.target;
      if (root instanceof HTMLElement && root.matches(ROOT))
        closeRoot(root, true);
    },
    true,
  );
}
