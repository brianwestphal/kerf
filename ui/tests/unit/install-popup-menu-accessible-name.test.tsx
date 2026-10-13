import { afterEach, describe, expect, it } from 'vitest';

import {
  installPopupMenuAccessibleName,
  installPopupMenuSubmenuName,
} from '../../src/components/actions/popup-menu/internal/install-popup-menu-accessible-name.js';
import { PopupMenu } from '../../src/components/actions/popup-menu/popup-menu.js';

const render = (html: string) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstElementChild as HTMLElement;
};

const items = [{ label: 'Copy', action: 'copy' }];

class TestDropdown extends HTMLElement {
  menu: HTMLElement | null = null;
  firstUpdatedCalls = 0;
  showCalls = 0;

  firstUpdated(): void {
    this.firstUpdatedCalls += 1;
    this.menu = document.createElement('div');
    this.menu.setAttribute('role', 'menu');
  }

  showMenu(): Promise<void> {
    this.showCalls += 1;
    return Promise.resolve();
  }
}

class TestDropdownItem extends HTMLElement {
  submenuElement: HTMLElement | null = document.createElement('div');
  openCalls = 0;

  openSubmenu(): Promise<void> {
    this.openCalls += 1;
    return Promise.resolve();
  }
}

customElements.define('test-named-dropdown', TestDropdown);
customElements.define('test-named-dropdown-item', TestDropdownItem);
installPopupMenuAccessibleName(TestDropdown.prototype);
installPopupMenuAccessibleName(TestDropdown.prototype);
installPopupMenuSubmenuName(TestDropdownItem.prototype);
installPopupMenuSubmenuName(TestDropdownItem.prototype);

function dropdown(label: string | null, kerf = true) {
  const element = document.createElement('test-named-dropdown') as TestDropdown;
  if (kerf) element.classList.add('kui-popup-menu');
  if (label !== null) element.setAttribute('data-menu-label', label);
  document.body.append(element);
  return element;
}

describe('PopupMenu accessible menu name', () => {
  afterEach(() => document.body.replaceChildren());

  it('renders the trigger name for context, text, and icon-only menus', () => {
    expect(
      render(
        String(PopupMenu({ context: true, label: 'Ticket actions', items })),
      ).getAttribute('data-menu-label'),
    ).toBe('Ticket actions');
    expect(
      render(String(PopupMenu({ text: 'Sort Tickets', items }))).getAttribute(
        'data-menu-label',
      ),
    ).toBe('Sort Tickets');
    expect(
      render(String(PopupMenu({ label: 'More actions', items }))).getAttribute(
        'data-menu-label',
      ),
    ).toBe('More actions');
  });

  it('keeps the name over application root data attributes', () => {
    const menu = render(
      String(
        PopupMenu({
          text: 'Sort',
          items,
          rootAttributes: { 'data-menu-label': 'Wrong' },
        }),
      ),
    );
    expect(menu.getAttribute('data-menu-label')).toBe('Sort');
  });

  it('names the shadow menu panel on first render and refreshes it on open', async () => {
    const menu = dropdown('Ticket actions');
    menu.firstUpdated();
    expect(menu.firstUpdatedCalls).toBe(1);
    expect(menu.menu?.getAttribute('aria-label')).toBe('Ticket actions');

    menu.setAttribute('data-menu-label', 'Project actions');
    await menu.showMenu();
    expect(menu.showCalls).toBe(1);
    expect(menu.menu?.getAttribute('aria-label')).toBe('Project actions');

    menu.setAttribute('data-menu-label', '  ');
    await menu.showMenu();
    expect(menu.menu?.hasAttribute('aria-label')).toBe(false);
  });

  it('leaves unnamed, unrendered, and raw Web Awesome dropdowns alone', async () => {
    const unrendered = dropdown('Actions');
    await unrendered.showMenu();
    expect(unrendered.showCalls).toBe(1);

    const raw = dropdown('Actions', false);
    raw.firstUpdated();
    expect(raw.menu?.hasAttribute('aria-label')).toBe(false);

    const unnamed = dropdown(null);
    unnamed.firstUpdated();
    expect(unnamed.menu?.hasAttribute('aria-label')).toBe(false);
  });

  it('labels a PopupMenu submenu by its parent item only', async () => {
    const host = dropdown('Actions');
    const item = document.createElement(
      'test-named-dropdown-item',
    ) as TestDropdownItem;
    host.append(item);
    await item.openSubmenu();
    expect(item.openCalls).toBe(1);
    expect(item.submenuElement?.getAttribute('aria-labelledby')).toBe('label');

    const raw = document.createElement(
      'test-named-dropdown-item',
    ) as TestDropdownItem;
    document.body.append(raw);
    await raw.openSubmenu();
    expect(raw.submenuElement?.hasAttribute('aria-labelledby')).toBe(false);

    const empty = document.createElement(
      'test-named-dropdown-item',
    ) as TestDropdownItem;
    empty.submenuElement = null;
    host.append(empty);
    await empty.openSubmenu();
    expect(empty.openCalls).toBe(1);
  });
});
