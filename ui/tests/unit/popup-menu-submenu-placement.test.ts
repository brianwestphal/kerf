import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  installPopupMenuSubmenuPlacement,
  phoneSubmenuPosition,
} from '../../src/install-popup-menu-submenu-placement.js';

const rect = (left: number, top: number, width: number, height: number) =>
  new DOMRect(left, top, width, height);

describe('phoneSubmenuPosition', () => {
  it('places a fitting submenu below the whole parent menu', () => {
    expect(
      phoneSubmenuPosition(
        rect(30, 100, 180, 180),
        rect(0, 0, 160, 120),
        { width: 390, height: 844 },
        false,
      ),
    ).toEqual({
      left: 30,
      top: 284,
      maxHeight: 552,
      maxWidth: 374,
    });
  });

  it('moves above when the bottom space is too short', () => {
    expect(
      phoneSubmenuPosition(
        rect(190, 550, 180, 100),
        rect(0, 0, 220, 240),
        { width: 390, height: 844 },
        false,
      ),
    ).toEqual({
      left: 162,
      top: 306,
      maxHeight: 538,
      maxWidth: 374,
    });
  });

  it('constrains a tall, wide submenu to the larger available side', () => {
    expect(
      phoneSubmenuPosition(
        rect(250, 130, 180, 220),
        rect(0, 0, 500, 700),
        { width: 390, height: 568 },
        false,
      ),
    ).toEqual({
      left: 8,
      top: 354,
      maxHeight: 206,
      maxWidth: 374,
    });
  });

  it('anchors at the logical end in RTL while staying in the viewport', () => {
    expect(
      phoneSubmenuPosition(
        rect(20, 100, 180, 120),
        rect(0, 0, 140, 80),
        { width: 390, height: 844 },
        true,
      ).left,
    ).toBe(60);
  });
});

describe('installPopupMenuSubmenuPlacement', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('switches narrow placement on and off without changing raw dropdowns', async () => {
    let narrow = true;
    vi.stubGlobal('matchMedia', () => ({ matches: narrow }));
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 844);
    const nativePosition = vi.fn();
    const prototype = { positionSubmenu: nativePosition };
    installPopupMenuSubmenuPlacement(prototype);
    const installedPosition = prototype.positionSubmenu;
    installPopupMenuSubmenuPlacement(prototype);
    expect(prototype.positionSubmenu).toBe(installedPosition);
    const menu = document.createElement('wa-dropdown');
    Object.setPrototypeOf(
      menu,
      Object.assign(Object.create(HTMLElement.prototype), prototype),
    );
    menu.classList.add('kui-popup-menu');
    const surface = document.createElement('div');
    Object.defineProperty(menu, 'menu', { value: surface });
    surface.getBoundingClientRect = () => rect(30, 100, 180, 180);
    const item = document.createElement('wa-dropdown-item') as HTMLElement & {
      submenuElement: HTMLElement;
      submenuOpen: boolean;
    };
    const submenu = document.createElement('div');
    submenu.getBoundingClientRect = () => rect(0, 0, 160, 120);
    item.submenuElement = submenu;
    item.submenuOpen = true;
    item.append(submenu);
    menu.append(item);
    document.body.append(menu);
    const position = (entry: typeof item) =>
      (
        menu as unknown as { positionSubmenu: (entry: typeof item) => void }
      ).positionSubmenu(entry);

    position(item);
    await Promise.resolve();
    expect(nativePosition).not.toHaveBeenCalled();
    expect(submenu.style.position).toBe('fixed');
    expect(submenu.style.left).toBe('30px');
    expect(submenu.style.top).toBe('284px');

    narrow = false;
    position(item);
    expect(nativePosition).toHaveBeenCalledOnce();
    expect(submenu.style.position).toBe('');
    expect(submenu.style.maxHeight).toBe('');

    narrow = true;
    position(item);
    item.submenuOpen = false;
    await Promise.resolve();
    expect(submenu.style.position).toBe('');

    position(document.createElement('wa-dropdown-item') as typeof item);
    expect(nativePosition).toHaveBeenCalledTimes(2);

    menu.classList.remove('kui-popup-menu');
    submenu.style.left = '7px';
    position(item);
    expect(nativePosition).toHaveBeenCalledTimes(3);
    expect(submenu.style.left).toBe('7px');

    position(document.createElement('wa-dropdown-item') as typeof item);
    expect(nativePosition).toHaveBeenCalledTimes(4);
  });

  it('positions a nested page against its immediate parent submenu', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 844);
    const prototype = { positionSubmenu: vi.fn() };
    installPopupMenuSubmenuPlacement(prototype);
    const menu = document.createElement('wa-dropdown');
    Object.setPrototypeOf(
      menu,
      Object.assign(Object.create(HTMLElement.prototype), prototype),
    );
    menu.classList.add('kui-popup-menu');
    const rootSurface = document.createElement('div');
    Object.defineProperty(menu, 'menu', { value: rootSurface });
    rootSurface.getBoundingClientRect = () => rect(30, 100, 180, 180);
    const parent = document.createElement('wa-dropdown-item') as HTMLElement & {
      submenuElement: HTMLElement;
    };
    const parentSurface = document.createElement('div');
    parentSurface.getBoundingClientRect = () => rect(170, 550, 180, 100);
    parent.submenuElement = parentSurface;
    const item = document.createElement('wa-dropdown-item') as HTMLElement & {
      submenuElement: HTMLElement;
      submenuOpen: boolean;
    };
    const submenu = document.createElement('div');
    submenu.getBoundingClientRect = () => rect(0, 0, 220, 240);
    item.submenuElement = submenu;
    item.submenuOpen = true;
    item.append(submenu);
    parent.append(item);
    menu.append(parent);
    document.body.append(menu);
    const position = (entry: typeof item) =>
      (
        menu as unknown as { positionSubmenu: (entry: typeof item) => void }
      ).positionSubmenu(entry);

    position(item);
    await Promise.resolve();
    expect(submenu.style.top).toBe('306px');
    expect(submenu.getAttribute('data-placement')).toBe('top-start');
  });
});
