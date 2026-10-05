import { afterEach, describe, expect, it, vi } from 'vitest';

import { installPopupMenuSubmenuFocus } from '../../src/components/actions/popup-menu/internal/install-popup-menu-submenu-focus.js';

class TestParent extends HTMLElement {
  submenuElement?: HTMLElement;
  private _submenuOpen = true;
  private finishOpening?: () => void;
  private finishClosing?: () => void;

  get submenuOpen() {
    return this._submenuOpen;
  }

  set submenuOpen(value: boolean) {
    this._submenuOpen = value;
  }

  getSubmenuItems() {
    return [
      ...this.querySelectorAll<HTMLElement>('[slot="submenu"]'),
    ] as (HTMLElement & { active: boolean })[];
  }

  openSubmenu(): Promise<void> {
    if (this.submenuElement) this.submenuElement.hidden = false;
    this.submenuOpen = true;
    return new Promise((resolve) => {
      this.finishOpening = () => {
        window.setTimeout(() => {
          const first = this.getSubmenuItems()[0];
          first.active = true;
          first.focus();
        }, 0);
        resolve();
      };
    });
  }

  closeSubmenu(): Promise<void> {
    this.submenuOpen = false;
    return new Promise((resolve) => {
      this.finishClosing = () => {
        if (this.submenuElement) this.submenuElement.hidden = true;
        resolve();
      };
    });
  }

  finish() {
    this.finishOpening?.();
  }

  finishClose() {
    this.finishClosing?.();
  }
}

customElements.define('test-popup-parent', TestParent);
installPopupMenuSubmenuFocus(TestParent.prototype);

function fixture(kerf = true) {
  const menu = document.createElement('wa-dropdown');
  if (kerf) menu.className = 'kui-popup-menu';
  const parent = document.createElement('test-popup-parent') as TestParent;
  const submenu = document.createElement('div');
  const first = document.createElement('wa-dropdown-item') as HTMLElement & {
    active: boolean;
  };
  const last = document.createElement('wa-dropdown-item') as HTMLElement & {
    active: boolean;
  };
  for (const item of [first, last]) {
    item.slot = 'submenu';
    item.tabIndex = -1;
    submenu.append(item);
  }
  parent.submenuElement = submenu;
  parent.append(submenu);
  menu.append(parent);
  document.body.append(menu);
  return { menu, parent, submenu, first, last };
}

describe('PopupMenu submenu focus repair', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it('restores a later keyboard choice after Web Awesome refocuses the first item', async () => {
    vi.useFakeTimers();
    const { parent, first, last } = fixture();
    const opening = parent.openSubmenu();
    first.focus();
    last.focus();
    parent.finish();
    await opening;
    await vi.runAllTimersAsync();

    expect(document.activeElement).toBe(last);
    expect(first.active).toBe(false);
    expect(last.active).toBe(true);
  });

  it('keeps the native first-item handoff when no later item was chosen', async () => {
    vi.useFakeTimers();
    const { parent, first } = fixture();
    const opening = parent.openSubmenu();
    first.focus();
    parent.finish();
    await opening;
    await vi.runAllTimersAsync();
    expect(document.activeElement).toBe(first);

    const untouched = fixture();
    const untouchedOpening = untouched.parent.openSubmenu();
    untouched.parent.finish();
    await untouchedOpening;
    await vi.runAllTimersAsync();
    expect(document.activeElement).toBe(untouched.first);
  });

  it('passes through when the Web Awesome submenu element is unavailable', async () => {
    vi.useFakeTimers();
    const { parent, first, last } = fixture();
    parent.submenuElement = undefined;
    const opening = parent.openSubmenu();
    first.focus();
    last.focus();
    parent.finish();
    await opening;
    await vi.runAllTimersAsync();
    expect(document.activeElement).toBe(first);
  });

  it('leaves raw dropdowns and dismissed submenus to Web Awesome', async () => {
    vi.useFakeTimers();
    const raw = fixture(false);
    const rawOpening = raw.parent.openSubmenu();
    raw.first.focus();
    raw.last.focus();
    raw.parent.finish();
    await rawOpening;
    await vi.runAllTimersAsync();
    expect(document.activeElement).toBe(raw.first);

    const closed = fixture();
    const closedOpening = closed.parent.openSubmenu();
    closed.first.focus();
    closed.last.focus();
    closed.parent.finish();
    closed.parent.submenuOpen = false;
    await closedOpening;
    await vi.runAllTimersAsync();
    expect(document.activeElement).toBe(closed.first);
  });

  it('reopens after a pending close hides a newer open', async () => {
    vi.useFakeTimers();
    const { parent, submenu } = fixture();
    const closing = parent.closeSubmenu();
    const opening = parent.openSubmenu();
    parent.finish();
    await opening;
    parent.finishClose();
    await Promise.resolve();
    expect(submenu.hidden).toBe(false);
    expect(parent.submenuOpen).toBe(true);
    parent.finish();
    await closing;
    await vi.runAllTimersAsync();
  });

  it('repairs a stale hidden submenu on a repeated open assignment', async () => {
    vi.useFakeTimers();
    const { parent, submenu } = fixture();
    submenu.hidden = true;
    parent.submenuOpen = true;
    expect(submenu.hidden).toBe(false);
    parent.finish();
    await vi.runAllTimersAsync();

    const raw = fixture(false);
    raw.submenu.hidden = true;
    raw.parent.submenuOpen = true;
    expect(raw.submenu.hidden).toBe(true);
  });

  it('keeps ordinary and raw close results closed', async () => {
    const normal = fixture();
    const normalClose = normal.parent.closeSubmenu();
    normal.parent.finishClose();
    await normalClose;
    expect(normal.submenu.hidden).toBe(true);
    expect(normal.parent.submenuOpen).toBe(false);

    const raw = fixture(false);
    const rawClose = raw.parent.closeSubmenu();
    const rawOpen = raw.parent.openSubmenu();
    raw.parent.finish();
    await rawOpen;
    raw.parent.finishClose();
    await rawClose;
    expect(raw.submenu.hidden).toBe(true);
  });

  it('installs once and leaves a repeated flag assignment without a submenu alone', () => {
    const open = TestParent.prototype.openSubmenu;
    installPopupMenuSubmenuFocus(TestParent.prototype);
    expect(TestParent.prototype.openSubmenu).toBe(open);

    const { parent } = fixture();
    parent.submenuElement = undefined;
    parent.submenuOpen = true;
    expect(parent.submenuOpen).toBe(true);
  });

  it('skips a duplicate show and cancels a stale show before reopening', async () => {
    const { parent, submenu } = fixture();
    submenu.classList.add('show');
    await parent.openSubmenu();
    expect(submenu.classList.contains('show')).toBe(true);

    submenu.hidden = true;
    const opening = parent.openSubmenu();
    expect(submenu.classList.contains('show')).toBe(false);
    expect(submenu.hidden).toBe(false);
    parent.finish();
    await opening;
  });
});
