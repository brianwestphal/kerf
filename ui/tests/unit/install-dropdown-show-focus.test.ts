import { afterEach, describe, expect, it } from 'vitest';

import { installDropdownShowFocus } from '../../src/install-dropdown-show-focus.js';

type TestItem = HTMLElement & { active: boolean };

class TestDropdown extends HTMLElement {
  open = false;
  popup = { active: false };
  menu = document.createElement('div');
  private finishShowing: Array<() => void> = [];

  getItems(): TestItem[] {
    return Array.from(this.children).filter(
      (item): item is TestItem => item.localName === 'wa-dropdown-item',
    );
  }

  async showMenu(): Promise<void> {
    this.open = true;
    this.popup.active = true;
    this.menu.classList.add('show');
    await new Promise<void>((resolve) => {
      this.finishShowing.push(resolve);
    });
    this.menu.classList.remove('show');
    const items = this.getItems();
    items.forEach((item, index) => {
      item.active = index === 0;
    });
    items[0]?.focus({ preventScroll: true });
  }

  finishShow() {
    this.finishShowing.shift()?.();
  }
}

customElements.define('test-focus-dropdown', TestDropdown);
installDropdownShowFocus(TestDropdown.prototype);

function fixture(scope: 'menu' | 'surface' | 'raw', count = 3) {
  const wrapper = document.createElement('div');
  if (scope === 'surface') wrapper.className = 'kui-popup-surface';
  const dropdown = document.createElement(
    'test-focus-dropdown',
  ) as TestDropdown;
  if (scope === 'menu') dropdown.className = 'kui-popup-menu';
  for (let index = 0; index < count; index++) {
    const item = document.createElement('wa-dropdown-item') as TestItem;
    item.tabIndex = 0;
    item.textContent = `Item ${index}`;
    dropdown.append(item);
  }
  wrapper.append(dropdown);
  document.body.append(wrapper);
  return { dropdown, items: dropdown.getItems() };
}

describe('dropdown show focus handoff', () => {
  afterEach(() => document.body.replaceChildren());

  it.each(['menu', 'surface'] as const)(
    'preserves navigation during a %s show animation',
    async (scope) => {
      const { dropdown, items } = fixture(scope);
      const showing = dropdown.showMenu();
      items[1].active = true;
      items[1].focus();
      items[2].active = true;
      items[2].focus();
      dropdown.finishShow();
      await showing;
      expect(document.activeElement).toBe(items[2]);
      expect(items.map((item) => item.active)).toEqual([false, false, true]);
    },
  );

  it('retains native initial focus when no item was navigated', async () => {
    const { dropdown, items } = fixture('menu');
    const showing = dropdown.showMenu();
    dropdown.finishShow();
    await showing;
    expect(document.activeElement).toBe(items[0]);
    expect(items.map((item) => item.active)).toEqual([true, false, false]);
  });

  it('restores a navigated submenu item without activating a heading', async () => {
    const { dropdown, items } = fixture('menu');
    const parent = items[0];
    const heading = document.createElement('div');
    const first = document.createElement('wa-dropdown-item') as TestItem;
    const second = document.createElement('wa-dropdown-item') as TestItem;
    first.slot = 'submenu';
    second.slot = 'submenu';
    first.tabIndex = 0;
    second.tabIndex = 0;
    parent.append(heading, first, second);
    const showing = dropdown.showMenu();
    first.focus();
    first.active = true;
    second.focus();
    second.active = true;
    dropdown.finishShow();
    await showing;
    expect(document.activeElement).toBe(second);
    expect(first.active).toBe(false);
    expect(second.active).toBe(true);
  });

  it('does not restore item navigation after the menu closes', async () => {
    const { dropdown, items } = fixture('menu');
    const showing = dropdown.showMenu();
    items[2].focus();
    dropdown.open = false;
    dropdown.popup.active = false;
    dropdown.finishShow();
    await showing;
    expect(document.activeElement).toBe(items[0]);
  });

  it('ignores an older show completion after another show begins', async () => {
    const { dropdown, items } = fixture('menu');
    const firstShow = dropdown.showMenu();
    items[2].focus();
    const secondShow = dropdown.showMenu();
    items[1].focus();
    dropdown.finishShow();
    await firstShow;
    dropdown.finishShow();
    await secondShow;
    expect(document.activeElement).toBe(items[1]);
    expect(items.map((item) => item.active)).toEqual([false, true, false]);
  });

  it('handles an empty menu and leaves a raw dropdown alone', async () => {
    const empty = fixture('menu', 0);
    const showingEmpty = empty.dropdown.showMenu();
    empty.dropdown.finishShow();
    await showingEmpty;
    expect(empty.dropdown.getItems()).toEqual([]);

    const raw = fixture('raw');
    const showingRaw = raw.dropdown.showMenu();
    raw.items[2].focus();
    raw.dropdown.finishShow();
    await showingRaw;
    expect(document.activeElement).toBe(raw.items[0]);
  });

  it('does not restore a detached item or install twice', async () => {
    const { dropdown, items } = fixture('menu');
    const wrapped = TestDropdown.prototype.showMenu;
    installDropdownShowFocus(TestDropdown.prototype);
    expect(TestDropdown.prototype.showMenu).toBe(wrapped);
    const showing = dropdown.showMenu();
    items[2].focus();
    items[2].remove();
    dropdown.finishShow();
    await showing;
    expect(document.activeElement).toBe(items[0]);
  });
});
