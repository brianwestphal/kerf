import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const floating = vi.hoisted(() => ({
  positions: [] as { anchor: unknown; popup: HTMLElement; placement: string }[],
  stops: 0,
  updates: [] as (() => void)[],
}));

vi.mock('@floating-ui/dom', () => ({
  computePosition: (
    anchor: unknown,
    popup: HTMLElement,
    options: { placement: string },
  ) => {
    floating.positions.push({ anchor, popup, placement: options.placement });
    return Promise.resolve({ x: 10, y: 20, placement: options.placement });
  },
  autoUpdate: (_anchor: unknown, _popup: HTMLElement, update: () => void) => {
    floating.updates.push(update);
    update();
    return () => {
      floating.stops += 1;
    };
  },
  flip: () => ({ name: 'flip', fn: () => ({}) }),
  shift: () => ({ name: 'shift', fn: () => ({}) }),
  size: () => ({ name: 'size', fn: () => ({}) }),
}));

import {
  installPopupMenus,
  POINTER_OPENED,
  SUBMENU_CLOSE_DELAY,
  TYPEAHEAD_RESET,
} from '../../src/components/actions/popup-menu/internal/popup-menu-controller.js';
import { POPUP_MENU_SELECT_EVENT } from '../../src/components/actions/popup-menu/internal/popup-menu-events.js';
import {
  closePopupMenu,
  openPopupMenu,
  openPopupMenuAt,
  PopupMenu,
  type PopupMenuEntry,
  type PopupMenuProps,
} from '../../src/components/actions/popup-menu/popup-menu.js';
import {
  installPopoverPolyfill,
  isShown,
  resetPopovers,
  setHovered,
} from './helpers/popover.js';

beforeAll(() => {
  installPopoverPolyfill();
  installPopupMenus();
  // Idempotent per document.
  installPopupMenus();
});

beforeEach(() => {
  floating.positions.length = 0;
  floating.updates.length = 0;
  floating.stops = 0;
});

afterEach(() => {
  resetPopovers();
  document.body.replaceChildren();
  document.body.removeAttribute('dir');
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const flush = () =>
  new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));

const ENTRIES: PopupMenuEntry[] = [
  { label: 'Copy', action: 'copy', value: 'copy' },
  { label: 'Cut', action: 'cut' },
  { label: 'Delete', action: 'delete', disabled: true },
  {
    label: 'Share',
    submenu: [
      { label: 'Mail', action: 'mail' },
      { label: 'Message', action: 'message' },
    ],
  },
  { label: 'Pinned', action: 'pin', checked: false },
];

function setup(props: Partial<PopupMenuProps> = {}) {
  const host = document.createElement('div');
  host.innerHTML = String(
    PopupMenu({ text: 'Actions', items: ENTRIES, ...props } as PopupMenuProps),
  );
  document.body.append(host);
  const root = host.firstElementChild as HTMLElement;
  const trigger = root.querySelector<HTMLButtonElement>(
    ':scope > .kui-popup-menu__trigger, :scope > .kui-popup-menu__context-anchor',
  )!;
  const menu = root.querySelector<HTMLElement>(
    ':scope > .kui-popup-menu__menu',
  )!;
  const item = (name: string) =>
    [...root.querySelectorAll<HTMLElement>('.kui-popup-menu__item')].find(
      (element) =>
        element.querySelector('.kui-popup-menu__item-label')?.textContent ===
        name,
    )!;
  const submenu = root.querySelector<HTMLElement>('[data-submenu]');
  return { host, root, trigger, menu, item, submenu };
}

const key = (target: Element, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
};

const click = (target: Element, detail = 1) =>
  target.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, detail }),
  );

const pointer = (target: Element, type: string, init: PointerEventInit = {}) =>
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, pointerType: 'mouse', ...init }),
  );

describe('PopupMenu register: opening and closing', () => {
  it('opens from its trigger, focuses the first item, and places the menu', async () => {
    const { trigger, menu, item } = setup();
    click(trigger);
    expect(isShown(menu)).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(item('Copy'));
    await flush();
    expect(floating.positions[0]).toMatchObject({
      anchor: trigger,
      popup: menu,
      placement: 'bottom-start',
    });
    expect(menu.style.left).toBe('10px');
    expect(menu.style.top).toBe('20px');
    expect(menu.getAttribute('data-placement')).toBe('bottom-start');

    // A second click closes it and keeps focus on the trigger.
    click(trigger);
    expect(isShown(menu)).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(floating.stops).toBe(1);
  });

  it('falls back to bottom-start when the root has no placement', async () => {
    const { root, trigger } = setup({ placement: 'top-end' });
    root.removeAttribute('data-placement');
    click(trigger);
    await flush();
    expect(floating.positions[0]!.placement).toBe('bottom-start');
    // Closing a menu twice is harmless.
    closePopupMenu(root);
    closePopupMenu(root);
  });

  it('stays closed when the browser refuses to show the menu', () => {
    const { trigger, menu } = setup();
    vi.spyOn(menu, 'showPopover').mockImplementation(() => {
      throw new DOMException('no', 'InvalidStateError');
    });
    click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('honors the rendered placement', async () => {
    const { trigger } = setup({ placement: 'top-end' });
    click(trigger);
    await flush();
    expect(floating.positions[0]!.placement).toBe('top-end');
  });

  it('closes on a press outside, but not on a press on its trigger or inside it', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    const { trigger, menu, item } = setup();
    click(trigger);
    pointer(trigger, 'pointerdown');
    pointer(item('Copy'), 'pointerdown');
    expect(isShown(menu)).toBe(true);
    // The trigger's own click still toggles it closed.
    click(trigger);
    expect(isShown(menu)).toBe(false);
    click(trigger);
    expect(document.activeElement).toBe(item('Copy'));
    outside.focus();
    item('Copy').focus();
    pointer(outside, 'pointerdown');
    expect(isShown(menu)).toBe(false);
    // A press outside leaves focus where the press puts it.
    await flush();
    expect(document.activeElement).not.toBe(trigger);
  });

  it('forgets open menus that left the document or were closed directly', () => {
    const first = setup();
    click(first.trigger);
    first.menu.hidePopover();
    const second = setup();
    click(second.trigger);
    second.root.remove();
    resetPopovers();
    pointer(document.body, 'pointerdown');
    expect(isShown(first.menu)).toBe(false);
  });

  it('opens with ArrowDown on the first item and ArrowUp on the last', () => {
    const { trigger, menu, item } = setup();
    expect(key(trigger, 'ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(item('Copy'));
    menu.hidePopover();
    key(trigger, 'ArrowUp');
    expect(document.activeElement).toBe(item('Pinned'));
    menu.hidePopover();
    // Other keys on the trigger are left to the button.
    expect(key(trigger, 'x').defaultPrevented).toBe(false);
    expect(isShown(menu)).toBe(false);
  });

  it('keeps a disabled trigger closed', () => {
    const { trigger, menu, root } = setup({ disabled: true });
    click(trigger);
    openPopupMenu(root);
    expect(isShown(menu)).toBe(false);
  });

  it('focuses the menu itself when it has nothing to focus', () => {
    const { trigger, menu } = setup({
      items: [{ label: 'Off', disabled: true }],
    });
    click(trigger);
    expect(document.activeElement).toBe(menu);
  });

  it('opens and closes through the component helpers', async () => {
    const { root, menu, trigger } = setup();
    openPopupMenu(root);
    expect(isShown(menu)).toBe(true);
    closePopupMenu(root);
    expect(isShown(menu)).toBe(false);
    // A point anchors one opening bottom-start, even over a top placement.
    root.dataset.placement = 'top-end';
    openPopupMenuAt(root, 30, 40);
    await flush();
    const position = floating.positions.at(-1)!;
    expect(position.placement).toBe('bottom-start');
    expect(position.anchor).not.toBe(trigger);
    expect(
      (
        position.anchor as { getBoundingClientRect(): DOMRect }
      ).getBoundingClientRect(),
    ).toMatchObject({ x: 30, y: 40, width: 0, height: 0 });
    // Opening again (another point) reopens the open menu.
    openPopupMenuAt(root, 50, 60);
    expect(isShown(menu)).toBe(true);
    closePopupMenu(root);
    // The next ordinary opening uses the trigger and its placement again.
    openPopupMenu(root);
    await flush();
    expect(floating.positions.at(-1)).toMatchObject({
      anchor: trigger,
      placement: 'top-end',
    });
  });

  it('opens a context menu from its anchor, bottom-start', async () => {
    const { root, trigger, menu } = setup({
      context: true,
      label: 'Row',
      text: undefined,
    } as Partial<PopupMenuProps>);
    root.dataset.placement = 'top-end';
    openPopupMenuAt(root, 5, 6);
    expect(isShown(menu)).toBe(true);
    await flush();
    expect(floating.positions.at(-1)).toMatchObject({
      anchor: trigger,
      placement: 'bottom-start',
    });
  });

  it('ignores requests on elements that are not menu roots and menus that cannot show', () => {
    const stray = document.createElement('div');
    document.body.append(stray);
    openPopupMenu(stray);
    closePopupMenu(stray);
    const { root, menu } = setup();
    root.remove();
    // A disconnected menu cannot show; the request does nothing.
    openPopupMenu(root);
    expect(isShown(menu)).toBe(false);
    // A trigger whose root holds no menu does nothing.
    const bare = document.createElement('span');
    bare.className = 'kui-popup-menu';
    bare.innerHTML = '<button class="kui-popup-menu__trigger"></button>';
    document.body.append(bare);
    click(bare.firstElementChild!);
    // A root without a menu or opener does nothing either.
    const empty = document.createElement('span');
    empty.className = 'kui-popup-menu';
    document.body.append(empty);
    openPopupMenu(empty);
    closePopupMenu(empty);
  });

  it('stops following a menu that leaves the document while open', () => {
    const { root, trigger, menu } = setup();
    click(trigger);
    root.remove();
    resetPopovers();
    floating.updates.at(-1)!();
    expect(floating.stops).toBe(1);
    void menu;
  });

  it('returns focus to the opener when a closing menu took focus with it', async () => {
    const { trigger, menu, item } = setup();
    click(trigger);
    expect(document.activeElement).toBe(item('Copy'));
    // Closed by the browser (Escape or light dismiss) with focus inside.
    menu.hidePopover();
    (document.activeElement as HTMLElement).blur();
    await flush();
    expect(document.activeElement).toBe(trigger);
  });

  it('leaves focus that already moved elsewhere', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    const { trigger, menu } = setup();
    click(trigger);
    menu.hidePopover();
    outside.focus();
    await flush();
    expect(document.activeElement).toBe(outside);
  });

  it('ignores toggles of other popovers, and of a menu panel outside any root', () => {
    const other = document.createElement('div');
    other.setAttribute('popover', 'auto');
    document.body.append(other);
    other.showPopover();
    other.hidePopover();
    expect(isShown(other)).toBe(false);
    const stray = document.createElement('div');
    stray.className = 'kui-popup-menu__menu';
    document.body.append(stray);
    stray.showPopover();
    stray.hidePopover();
    expect(isShown(stray)).toBe(false);
  });
});

describe('PopupMenu register: keyboard navigation', () => {
  it('moves with the arrows, wraps, skips disabled items, and jumps with Home and End', () => {
    const { trigger, item } = setup();
    click(trigger);
    const at = () => document.activeElement;
    key(at()!, 'ArrowDown');
    expect(at()).toBe(item('Cut'));
    key(at()!, 'ArrowDown');
    // Delete is disabled and skipped.
    expect(at()).toBe(item('Share'));
    key(at()!, 'End');
    expect(at()).toBe(item('Pinned'));
    key(at()!, 'ArrowDown');
    expect(at()).toBe(item('Copy'));
    key(at()!, 'ArrowUp');
    expect(at()).toBe(item('Pinned'));
    key(at()!, 'Home');
    expect(at()).toBe(item('Copy'));
  });

  it('moves up from the middle of the menu', () => {
    const { trigger, item } = setup();
    click(trigger);
    item('Share').focus();
    key(item('Share'), 'ArrowUp');
    expect(document.activeElement).toBe(item('Cut'));
  });

  it('claims arrow keys in a menu with nothing to move to', () => {
    const { trigger, menu } = setup({
      items: [{ label: 'Off', disabled: true }],
    });
    click(trigger);
    expect(key(menu, 'ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(menu);
  });

  it('moves from the menu itself when no item has focus', () => {
    const { trigger, menu, item } = setup();
    click(trigger);
    menu.focus();
    key(menu, 'ArrowDown');
    expect(document.activeElement).toBe(item('Copy'));
    menu.focus();
    key(menu, 'ArrowUp');
    expect(document.activeElement).toBe(item('Pinned'));
  });

  it('closes with Escape, claiming the key, and returns focus to the trigger', () => {
    const { trigger, menu } = setup();
    const outer = vi.fn();
    trigger.parentElement!.parentElement!.addEventListener('keydown', outer);
    click(trigger);
    const event = key(document.activeElement!, 'Escape');
    expect(event.defaultPrevented).toBe(true);
    expect(outer).not.toHaveBeenCalled();
    expect(isShown(menu)).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes with Tab and continues from the trigger', () => {
    const { trigger, menu } = setup();
    click(trigger);
    const event = key(document.activeElement!, 'Tab');
    // The browser's own Tab then moves on from the trigger.
    expect(event.defaultPrevented).toBe(false);
    expect(isShown(menu)).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('finds items by typed prefix, continues a query across a space, and resets it', () => {
    vi.useFakeTimers();
    const { trigger, item } = setup({
      items: [
        { label: 'Copy' },
        { label: 'Copy link' },
        { label: 'Cut' },
        { label: 'Delete' },
      ],
    });
    click(trigger);
    expect(key(document.activeElement!, 'd').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(item('Delete'));
    vi.advanceTimersByTime(TYPEAHEAD_RESET);
    key(document.activeElement!, 'c');
    key(document.activeElement!, 'o');
    key(document.activeElement!, 'p');
    key(document.activeElement!, 'y');
    expect(document.activeElement).toBe(item('Copy'));
    // With a query underway, a space extends it instead of choosing.
    expect(key(document.activeElement!, ' ').defaultPrevented).toBe(true);
    key(document.activeElement!, 'l');
    expect(document.activeElement).toBe(item('Copy link'));
    // A query that matches nothing leaves focus and the key alone.
    expect(key(document.activeElement!, 'z').defaultPrevented).toBe(false);
    vi.advanceTimersByTime(TYPEAHEAD_RESET);
    // Without a query, Space is left to the button (which chooses).
    expect(key(document.activeElement!, ' ').defaultPrevented).toBe(false);
  });

  it('ignores modified keys, keys outside an open menu, and non-character keys', () => {
    const { trigger, menu, item } = setup();
    click(trigger);
    key(document.activeElement!, 'ArrowDown', { ctrlKey: true });
    expect(document.activeElement).toBe(item('Copy'));
    expect(key(document.activeElement!, 'F5').defaultPrevented).toBe(false);
    menu.hidePopover();
    key(item('Copy'), 'ArrowDown');
    expect(isShown(menu)).toBe(false);
    // Text events from outside any menu are ignored.
    const text = document.createTextNode('x');
    document.body.append(text);
    text.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
    );
  });
});

describe('PopupMenu register: choosing', () => {
  it('dispatches kui-menu-select, closes, and returns focus to the trigger', () => {
    const { host, root, trigger, menu, item } = setup();
    const chosen: unknown[] = [];
    root.addEventListener(POPUP_MENU_SELECT_EVENT, (event) => {
      const { detail } = event as CustomEvent;
      chosen.push([detail.item, detail.value, detail.checked]);
    });
    const actions: string[] = [];
    host.addEventListener('click', (event) => {
      const action = (event.target as Element).closest('[data-action]');
      if (action) actions.push(action.getAttribute('data-action')!);
    });
    click(trigger);
    click(item('Copy'));
    expect(chosen).toEqual([[item('Copy'), 'copy', undefined]]);
    // The click still reaches the application's delegated data-action.
    expect(actions).toEqual(['copy']);
    expect(isShown(menu)).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('reports the state a checkbox choice asks for without changing it', () => {
    const { root, trigger, item } = setup({
      items: [
        { label: 'Pinned', action: 'pin', checked: false },
        { label: 'Starred', action: 'star', checked: true },
      ],
    });
    const states: unknown[] = [];
    root.addEventListener(POPUP_MENU_SELECT_EVENT, (event) =>
      states.push((event as CustomEvent).detail.checked),
    );
    click(trigger);
    click(item('Pinned'));
    click(trigger);
    click(item('Starred'));
    expect(states).toEqual([true, false]);
    // The application renders the state; the items keep theirs until then.
    expect(item('Pinned').getAttribute('aria-checked')).toBe('false');
    expect(item('Starred').getAttribute('aria-checked')).toBe('true');
  });

  it('keeps the menu open when the choice event is canceled', () => {
    const { root, trigger, menu, item } = setup();
    root.addEventListener(POPUP_MENU_SELECT_EVENT, (event) =>
      event.preventDefault(),
    );
    click(trigger);
    click(item('Cut'));
    expect(isShown(menu)).toBe(true);
  });

  it('blocks a disabled command before the application sees its click', () => {
    const { host, trigger, menu, item } = setup();
    click(trigger);
    const seen = vi.fn();
    host.addEventListener('click', seen);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    item('Delete').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(seen).not.toHaveBeenCalled();
    expect(isShown(menu)).toBe(true);
  });

  it('ignores clicks outside menus and on non-elements', () => {
    setup();
    const plain = document.createElement('button');
    document.body.append(plain);
    click(plain);
    const text = document.createTextNode('x');
    document.body.append(text);
    for (const type of ['click', 'pointerdown', 'pointerover'])
      text.dispatchEvent(new MouseEvent(type, { bubbles: true }));
    // A trigger-looking button outside a menu root is not a trigger.
    const loose = document.createElement('button');
    loose.className = 'kui-popup-menu__trigger';
    document.body.append(loose);
    click(loose);
    pointer(loose, 'pointerdown');
  });
});

describe('PopupMenu register: submenus', () => {
  it('opens with ArrowRight onto its first item and closes with ArrowLeft back to its item', async () => {
    const { trigger, item, submenu } = setup();
    click(trigger);
    item('Share').focus();
    expect(key(item('Share'), 'ArrowRight').defaultPrevented).toBe(true);
    expect(isShown(submenu)).toBe(true);
    expect(item('Share').getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(item('Mail'));
    expect(submenu!.hasAttribute(POINTER_OPENED)).toBe(false);
    await flush();
    expect(floating.positions.at(-1)).toMatchObject({
      anchor: item('Share'),
      popup: submenu,
      placement: 'right-start',
    });
    // ArrowRight on an item without a submenu does nothing.
    expect(key(item('Mail'), 'ArrowRight').defaultPrevented).toBe(false);
    expect(key(item('Mail'), 'ArrowLeft').defaultPrevented).toBe(true);
    expect(isShown(submenu)).toBe(false);
    expect(item('Share').getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(item('Share'));
    // ArrowLeft in the top level does nothing.
    expect(key(item('Share'), 'ArrowLeft').defaultPrevented).toBe(false);
  });

  it('mirrors the arrows and placement in right-to-left text', async () => {
    const { trigger, root, item, submenu } = setup();
    root.style.direction = 'rtl';
    for (const element of root.querySelectorAll<HTMLElement>('*'))
      element.style.direction = 'rtl';
    click(trigger);
    item('Share').focus();
    key(item('Share'), 'ArrowLeft');
    expect(isShown(submenu)).toBe(true);
    await flush();
    expect(floating.positions.at(-1)!.placement).toBe('left-start');
    key(document.activeElement!, 'ArrowRight');
    expect(isShown(submenu)).toBe(false);
  });

  it('closes only the submenu with Escape', () => {
    const { trigger, menu, item, submenu } = setup();
    click(trigger);
    item('Share').focus();
    key(item('Share'), 'ArrowRight');
    key(document.activeElement!, 'Escape');
    expect(isShown(submenu)).toBe(false);
    expect(isShown(menu)).toBe(true);
    expect(document.activeElement).toBe(item('Share'));
  });

  it('opens from a keyboard click into its first item, and from a pointer click without focus', () => {
    const { trigger, item, submenu } = setup();
    click(trigger);
    item('Share').focus();
    click(item('Share'), 0);
    expect(isShown(submenu)).toBe(true);
    expect(document.activeElement).toBe(item('Mail'));
    submenu!.hidePopover();
    item('Share').focus();
    click(item('Share'));
    expect(isShown(submenu)).toBe(true);
    expect(submenu!.hasAttribute(POINTER_OPENED)).toBe(true);
    expect(document.activeElement).toBe(item('Share'));
  });

  it('opens on hover, and closes after a grace period once the pointer moves to a sibling', () => {
    vi.useFakeTimers();
    const { trigger, item, submenu } = setup();
    click(trigger);
    pointer(item('Share'), 'pointerover');
    expect(isShown(submenu)).toBe(true);
    expect(submenu!.hasAttribute(POINTER_OPENED)).toBe(true);
    // Hovering the same item again keeps it.
    pointer(item('Share'), 'pointerover');
    pointer(item('Copy'), 'pointerover');
    // A second leave while one close is pending schedules nothing new.
    pointer(item('Cut'), 'pointerover');
    expect(isShown(submenu)).toBe(true);
    vi.advanceTimersByTime(SUBMENU_CLOSE_DELAY);
    expect(isShown(submenu)).toBe(false);
  });

  it('stays open while the pointer is over the submenu, its safe triangle, or its item', () => {
    vi.useFakeTimers();
    const { trigger, item, submenu } = setup();
    click(trigger);
    pointer(item('Share'), 'pointerover');
    pointer(item('Copy'), 'pointerover');
    // Reaching the submenu (or its ::before triangle) cancels the close.
    pointer(submenu!, 'pointerover');
    vi.advanceTimersByTime(SUBMENU_CLOSE_DELAY);
    expect(isShown(submenu)).toBe(true);
    // A close that fires while the pointer is back over the item keeps it.
    pointer(item('Copy'), 'pointerover');
    setHovered(item('Share'), true);
    vi.advanceTimersByTime(SUBMENU_CLOSE_DELAY);
    expect(isShown(submenu)).toBe(true);
    setHovered(item('Share'), false);
    pointer(item('Cut'), 'pointerover');
    setHovered(submenu!, true);
    vi.advanceTimersByTime(SUBMENU_CLOSE_DELAY);
    expect(isShown(submenu)).toBe(true);
  });

  it('ignores touch hovers, hovers outside open menus, and disabled submenu items', () => {
    const { trigger, item, submenu, menu } = setup({
      items: [
        { label: 'Copy' },
        { label: 'Share', disabled: true, submenu: [{ label: 'Mail' }] },
      ],
    });
    pointer(item('Share'), 'pointerover');
    expect(isShown(submenu)).toBe(false);
    click(trigger);
    pointer(item('Share'), 'pointerover', { pointerType: 'touch' });
    pointer(item('Share'), 'pointerover');
    expect(isShown(submenu)).toBe(false);
    // Hovering the menu's padding (no item) changes nothing.
    pointer(menu, 'pointerover');
  });

  it('publishes the safe triangle from the pointer to a pointer-opened submenu', () => {
    const { trigger, item, submenu } = setup();
    click(trigger);
    pointer(item('Share'), 'pointerover');
    vi.spyOn(submenu!, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(200, 100, 120, 80),
    );
    pointer(item('Share'), 'pointermove', { clientX: 150, clientY: 400 });
    const value = (name: string) =>
      submenu!.style.getPropertyValue(`--_kui-popup-menu-safe-${name}`);
    expect([
      value('x'),
      value('y'),
      value('edge'),
      value('top'),
      value('bottom'),
    ]).toEqual(['152px', '180px', '200px', '100px', '180px']);
    // Past the submenu's edge the point is held at the edge.
    pointer(item('Share'), 'pointermove', { clientX: 260, clientY: 120 });
    expect(value('x')).toBe('200px');
    // A closed submenu keeping the marker is skipped.
    resetPopovers();
    pointer(item('Share'), 'pointermove', { clientX: 1, clientY: 1 });
    expect(value('x')).toBe('200px');
  });

  it('holds the safe triangle at the left edge in right-to-left text', () => {
    const { trigger, root, item, submenu } = setup();
    for (const element of [root, ...root.querySelectorAll<HTMLElement>('*')])
      element.style.direction = 'rtl';
    click(trigger);
    pointer(item('Share'), 'pointerover');
    vi.spyOn(submenu!, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(200, 100, 120, 80),
    );
    pointer(item('Share'), 'pointermove', { clientX: 400, clientY: 120 });
    expect(submenu!.style.getPropertyValue('--_kui-popup-menu-safe-x')).toBe(
      '398px',
    );
    expect(submenu!.style.getPropertyValue('--_kui-popup-menu-safe-edge')).toBe(
      '320px',
    );
    pointer(item('Share'), 'pointermove', { clientX: 250, clientY: 120 });
    expect(submenu!.style.getPropertyValue('--_kui-popup-menu-safe-x')).toBe(
      '320px',
    );
  });

  it('places a phone-width submenu above or below its parent menu', () => {
    const matchMedia = vi
      .spyOn(window, 'matchMedia')
      .mockReturnValue({ matches: true } as MediaQueryList);
    const { trigger, menu, item, submenu } = setup();
    vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(30, 100, 180, 180),
    );
    vi.spyOn(submenu!, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 160, 120),
    );
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      390,
    );
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(
      844,
    );
    click(trigger);
    pointer(item('Share'), 'pointerover');
    expect(submenu!.style.left).toBe('30px');
    expect(submenu!.style.top).toBe('284px');
    expect(submenu!.style.maxHeight).toBe('552px');
    expect(submenu!.style.maxWidth).toBe('374px');
    expect(submenu!.getAttribute('data-placement')).toBe('bottom-start');
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 480px)');
  });

  it('falls back to the window size when the root reports no client box', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(0);
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(
      0,
    );
    const { trigger, item, submenu } = setup();
    click(trigger);
    pointer(item('Share'), 'pointerover');
    expect(submenu!.getAttribute('data-placement')).toMatch(
      /^(bottom|top)-start$/,
    );
  });

  it('shows one submenu per level, closing a sibling as another opens', () => {
    const { trigger, item, root } = setup({
      items: [
        { label: 'Share', submenu: [{ label: 'Mail' }] },
        { label: 'Move', submenu: [{ label: 'Inbox' }] },
      ],
    });
    const [share, move] = root.querySelectorAll<HTMLElement>('[data-submenu]');
    click(trigger);
    pointer(item('Share'), 'pointerover');
    expect(isShown(share!)).toBe(true);
    item('Move').focus();
    key(item('Move'), 'ArrowRight');
    expect(isShown(share!)).toBe(false);
    expect(isShown(move!)).toBe(true);
    expect(item('Share').getAttribute('aria-expanded')).toBe('false');
  });

  it('closes its submenus along with the menu', () => {
    const { trigger, menu, item, submenu } = setup();
    click(trigger);
    pointer(item('Share'), 'pointerover');
    menu.hidePopover();
    expect(isShown(submenu)).toBe(false);
    expect(item('Share').getAttribute('aria-expanded')).toBe('false');
    expect(submenu!.hasAttribute(POINTER_OPENED)).toBe(false);
  });

  it('does not show a submenu that cannot show', () => {
    const { trigger, item, submenu } = setup();
    click(trigger);
    vi.spyOn(submenu!, 'showPopover').mockImplementation(() => {
      throw new DOMException('no', 'InvalidStateError');
    });
    pointer(item('Share'), 'pointerover');
    expect(item('Share').getAttribute('aria-expanded')).toBe('false');
  });

  it('treats a submenu whose item was removed as having no opener', () => {
    const { trigger, item, submenu } = setup();
    click(trigger);
    pointer(item('Share'), 'pointerover');
    item('Share').remove();
    submenu!.hidePopover();
    expect(isShown(submenu)).toBe(false);
  });
});

describe('PopupMenu register: robustness', () => {
  it('survives hidePopover throwing', () => {
    const { trigger, menu } = setup();
    click(trigger);
    vi.spyOn(menu, 'hidePopover').mockImplementation(() => {
      throw new DOMException('no', 'InvalidStateError');
    });
    click(trigger);
    expect(document.activeElement).not.toBe(trigger);
  });

  it('treats a selector engine without :popover-open as closed', () => {
    const { trigger, menu } = setup();
    const matches = menu.matches.bind(menu);
    vi.spyOn(menu, 'matches').mockImplementation((selector: string) => {
      if (selector === ':popover-open') throw new SyntaxError('unsupported');
      return matches(selector);
    });
    click(trigger);
    key(menu, 'ArrowDown');
  });
});
