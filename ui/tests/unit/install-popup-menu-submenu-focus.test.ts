import { afterEach, describe, expect, it, vi } from 'vitest';

import { installPopupMenuSubmenuFocus } from '../../src/install-popup-menu-submenu-focus.js';

class TestParent extends HTMLElement {
  submenuElement?: HTMLElement;
  submenuOpen = true;
  private finishOpening?: () => void;

  getSubmenuItems() {
    return [
      ...this.querySelectorAll<HTMLElement>('[slot="submenu"]'),
    ] as (HTMLElement & { active: boolean })[];
  }

  openSubmenu(): Promise<void> {
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

  finish() {
    this.finishOpening?.();
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
});
