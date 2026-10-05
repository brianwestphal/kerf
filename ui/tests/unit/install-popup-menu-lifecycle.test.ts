import { afterEach, describe, expect, it } from 'vitest';

import { installPopupMenuLifecycle } from '../../src/components/actions/popup-menu/internal/install-popup-menu-lifecycle.js';

class TestDropdown extends HTMLElement {
  open = true;
  popup = { active: true };
  dismissalListener = true;
  private finishHiding?: () => void;

  hideMenu(): Promise<void> {
    this.open = false;
    this.dismissalListener = false;
    return new Promise((resolve) => {
      this.finishHiding = () => {
        this.popup.active = this.open;
        resolve();
      };
    });
  }

  showMenu(): Promise<void> {
    if (this.popup.active) return Promise.resolve();
    this.popup.active = true;
    this.open = true;
    this.dismissalListener = true;
    return Promise.resolve();
  }

  finishHide() {
    this.finishHiding?.();
  }
}

customElements.define('test-popup-dropdown', TestDropdown);
installPopupMenuLifecycle(TestDropdown.prototype);

function fixture(kerf = true) {
  const menu = document.createElement('test-popup-dropdown') as TestDropdown;
  if (kerf) menu.classList.add('kui-popup-menu');
  document.body.append(menu);
  return menu;
}

describe('PopupMenu close/reopen lifecycle', () => {
  afterEach(() => document.body.replaceChildren());

  it('restores dismissal after a new open arrives during hide', async () => {
    const menu = fixture();
    const hiding = menu.hideMenu();
    menu.open = true;
    await menu.showMenu();
    expect(menu.dismissalListener).toBe(true);
    menu.finishHide();
    await hiding;
    expect(menu.open).toBe(true);
    expect(menu.dismissalListener).toBe(true);
  });

  it('restores dismissal if Lit coalesces the intervening open request', async () => {
    const menu = fixture();
    const hiding = menu.hideMenu();
    menu.open = true;
    menu.finishHide();
    await hiding;
    expect(menu.dismissalListener).toBe(true);
  });

  it('leaves ordinary dismissal and raw dropdowns alone', async () => {
    const closed = fixture();
    const closing = closed.hideMenu();
    closed.finishHide();
    await closing;
    expect(closed.open).toBe(false);
    expect(closed.dismissalListener).toBe(false);

    const raw = fixture(false);
    const hiding = raw.hideMenu();
    raw.open = true;
    raw.finishHide();
    await hiding;
    expect(raw.dismissalListener).toBe(false);
  });

  it('installs only once', () => {
    const wrapped = TestDropdown.prototype.hideMenu;
    installPopupMenuLifecycle(TestDropdown.prototype);
    expect(TestDropdown.prototype.hideMenu).toBe(wrapped);
  });
});
